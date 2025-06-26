"use client";

import { upload } from '@vercel/blob/client';
import { X, Upload, Loader, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import {
  connectDatabaseToChat,
  testDatabaseConnection,
  createChatAction
} from "@/app/(chat)/_lib/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Database } from "@/db/schema";
import { useDatabaseConnectionDialog } from "@/hooks/use-database-connection-dialog";
import { cn } from "@/lib/utils";

interface DatabaseConnectionDialogProps {
  chatId?: string;
  database?: Database;
  onCancel?: () => void;
  onSuccess?: (chatId: string) => void;
}

type ProcessingStep = 'idle' | 'testing' | 'creating-chat' | 'connecting-db' | 'finalizing' | 'success';

const databaseProvidersOptions = [
  { label: "SQLite", value: "sqlite" },
  { label: "PostgreSQL", value: "postgres" },
  { label: "MySQL", value: "mysql" },
];

const stepMessages = {
  'idle': '',
  'testing': 'Testing database connection...',
  'creating-chat': 'Creating chat session...',
  'connecting-db': 'Connecting database to chat...',
  'finalizing': 'Setting up your workspace...',
  'success': 'Successfully connected!'
};

const stepProgress = {
  'idle': 0,
  'testing': 25,
  'creating-chat': 50,
  'connecting-db': 75,
  'finalizing': 90,
  'success': 100
};

export default function DatabaseConnectionDialog({
  chatId,
  database,
  onCancel,
  onSuccess,
}: DatabaseConnectionDialogProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [connectionInitialized, setConnectionInitialized] = useState(false);
  const [currentStep, setCurrentStep] = useState<ProcessingStep>('idle');
  const [isProcessing, setIsProcessing] = useState(false);

  const [databaseProvider, setDatabaseProvider] = useState<Database["type"]>(
    database?.type || "sqlite"
  );
  const [databaseName, setDatabaseName] = useState<Database["name"]>(
    database?.name || ""
  );
  const [databaseDescription, setDatabaseDescription] = useState<
    Database["description"]
  >(database?.description || "");

  const [connectionString, setConnectionString] = useState<
    Database["connectionString"]
  >(database?.connectionString || "");

  const { isOpen, setIsOpen } = useDatabaseConnectionDialog();
  const [isUploading, setIsUploading] = useState(false); 
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null); 

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsUploading(true);
    const file = event.target.files?.[0];   
    if (!file) {
      toast.error("No file selected");
      setIsUploading(false);
      return;
    }   
    if (file.size > 100 * 1024 * 1024) {
      toast.error("File size should be less than 100MB");
      setIsUploading(false);
      return;
    }

    if (!file.name.match(/\.(sqlite|db|sqlite3|db3)$/i)) {
      toast.error("Invalid file type. Must be a SQLite database file (.sqlite, .db, .sqlite3, .db3).");
      setIsUploading(false);
      return;
    }

    try {
      console.log("Original file type:", file.type);
      console.log("File name:", file.name);
      console.log("File size:", file.size);
      
      const sqliteFile = new File([file], file.name, {
        type: 'application/octet-stream',
      });
      
      console.log("Modified file type:", sqliteFile.type);
      console.log("About to call upload with URL: /api/files/upload/sqlite");
      
      // Upload the file using Vercel Blob client
      const newBlob = await upload(sqliteFile.name, sqliteFile, {
        access: 'public',
        handleUploadUrl: '/api/files/upload/sqlite',
        clientPayload: JSON.stringify({
          originalFileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        }),
      });

      console.log('Successfully uploaded to Vercel Blob:', newBlob.url);
      setConnectionString(newBlob.url);
      setUploadedFileName(file.name);
      toast.success("File uploaded successfully!");
        
    } catch (error) {
      console.error("Upload error:", error);
      
      if (error instanceof Error) {
        if (error.message.includes('413') || 
            error.message.includes('too large') || 
            error.message.includes('FUNCTION_PAYLOAD_TOO_LARGE')) {
          toast.error("File is too large for upload. Please use a file smaller than 100MB.");
        } else if (error.message.includes('network') || 
                   error.message.includes('fetch')) {
          toast.error("Network error - please check your connection and try again");
        } else if (error.message.includes('Unauthorized') || 
                   error.message.includes('session')) {
          toast.error("Please log in to upload files");
        } else if (error.message.includes('Content type mismatch') || 
                   error.message.includes('contentType')) {
          toast.error("File type not supported. Please ensure you're uploading a valid SQLite database file.");
        } else if (error.message.includes('Failed to retrieve the client token')) {
          toast.error("Authentication failed. Please refresh the page and try again.");
        } else {
          toast.error(`Upload failed: ${error.message}`);
        }
      } else {
        toast.error("Unexpected error occurred during upload");
      }
    } finally {
      setIsUploading(false);
    }
  };
  const handleCancelUpload = () => {
    setUploadedFileName(null); 
    setConnectionString("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.info("File upload canceled.");
  };
  
  const handleSubmit = async () => {
    setIsProcessing(true);
    setCurrentStep('testing');
    
    try {
      const testResult = await testDatabaseConnection(databaseProvider, connectionString);
      if (testResult.error) {
        toast.error("Connection test failed");
        return;
      }

      if (!chatId) {
        setCurrentStep('creating-chat');
        const newChatId = uuidv4();
        const chatResult = await createChatAction(newChatId);
        if (chatResult?.error) {
          toast.error("Failed to create chat");
          return;
        }

        setCurrentStep('connecting-db');
        const { error } = await connectDatabaseToChat(
          newChatId,
          databaseName,
          databaseDescription,
          connectionString,
          databaseProvider
        );

        if (error) {
          toast.error("Failed to connect database");
          return;
        }

        setCurrentStep('finalizing');
        
        // Brief pause for visual feedback
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setCurrentStep('success');
        toast.success("Database connected successfully!");
        
        setTimeout(() => {
          onSuccess?.(newChatId);
        }, 200);

      } else {
        setCurrentStep('connecting-db');
        const { error } = await connectDatabaseToChat(
          chatId,
          databaseName,
          databaseDescription,
          connectionString,
          databaseProvider
        );
        
        if (error) {
          toast.error("Failed to connect to database");
          return;
        }
        
        setCurrentStep('success');
        toast.success("Database connected successfully!");
        
        setTimeout(() => {
          setIsOpen(false);
        }, 200);
      }
    } catch (error) {
      console.error("Connection error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      // Don't reset processing state here - let it stay until redirect
      if (currentStep !== 'success') {
        setIsProcessing(false);
        setCurrentStep('idle');
      }
    }
  };

  const handleTestConnection = async () => {
    if (!databaseProvider || !connectionString) {
      toast.error("Please fill in all fields");
      return;
    }

    const result = await testDatabaseConnection(
      databaseProvider,
      connectionString
    );
    if (result.error) {
      toast.error("Connection failed");
    } else {
      toast.success("Connection successful");
      setConnectionInitialized(true);
    }
  };

  const handleCancel = () => {
    if (isProcessing && currentStep !== 'success') {
      // Show confirmation for canceling during process
      if (confirm("Are you sure you want to cancel? The connection process is in progress.")) {
        if (!chatId) {
          onCancel?.();
        } else {
          setIsOpen(false);
          router.replace("/");
        }
      }
    } else {
      if (!chatId) {
        onCancel?.();
      } else {
        setIsOpen(false);
        router.replace("/");
      }
    }
  };

  return (
    <>
      <Dialog
        open={!chatId ? true : isOpen}
        onOpenChange={(newVal) => {
          if (newVal === false) {
            handleCancel();
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Connect to a database</DialogTitle>
            <DialogDescription>
              Choose a database provider and enter your credentials.
            </DialogDescription>
          </DialogHeader>

          {/* Progress Indicator */}
          {isProcessing && (
            <div className="space-y-3 py-4">
              <div className="flex items-center space-x-2">
                {currentStep === 'success' ? (
                  <CheckCircle className="size-5 text-green-500" />
                ) : (
                  <Loader className="size-5 animate-spin text-primary" />
                )}
                <span className="text-sm font-medium">
                  {stepMessages[currentStep]}
                </span>
              </div>
              <Progress value={stepProgress[currentStep]} className="h-2" />
            </div>
          )}

          <div className="grid gap-8 py-4">
            <div className="flex flex-col gap-4">
              <Label>Database Provider</Label>
              <div className="flex flex-row items-center gap-2">
                {databaseProvidersOptions.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => !isProcessing && setDatabaseProvider(option.value)}
                    className={cn(
                      "py-2 px-4 border border-muted-foreground rounded-md cursor-pointer text-muted-foreground transition-all duration-500",
                      databaseProvider === option.value &&
                        "bg-primary/10 border-primary text-primary",
                      isProcessing && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <Label>Database Name</Label>
              <Input
                placeholder="Enter your database name"
                value={databaseName}
                onChange={(e) => setDatabaseName(e.target.value)}
                disabled={isProcessing}
              />
            </div>
            <div className="flex flex-col gap-4">
              <Label>Database Description</Label>
              <Textarea
                placeholder="Enter your database description"
                value={databaseDescription}
                onChange={(e) => setDatabaseDescription(e.target.value)}
                maxLength={200}
                disabled={isProcessing}
              />
            </div>
            <div className="flex flex-col gap-4">
              <Label>
                {databaseProvider === "sqlite"
                  ? "Upload SQLite File"
                  : "Connection String"}
              </Label>

              {databaseProvider === "sqlite" ? (
                <div className="relative">
                  <Input
                    type="file"
                    accept=".sqlite,.sqlite3,.db,.db3"
                    onChange={handleFileUpload}
                    id="sqlite-upload"
                    ref={fileInputRef}
                    className="hidden"
                    disabled={isUploading || isProcessing}
                  />

                  <Label
                    htmlFor="sqlite-upload"
                    className={cn(
                      "flex items-center justify-between w-full h-10 cursor-pointer rounded-md border border-input bg-primary/10 text-primary px-4 py-2 text-sm font-medium transition-all duration-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      !isUploading && !isProcessing && "hover:bg-primary hover:text-white",
                      (isUploading || isProcessing) && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {isUploading ? (
                        <>
                          <Loader className="animate-spin size-5" />
                          <span>Uploading...</span>
                        </>
                      ) : uploadedFileName ? (
                        <>
                          <Upload className="size-5" />
                          <span>{uploadedFileName}</span>
                        </>
                      ) : (
                        <>
                          <Upload className="size-5" />
                          <span>Choose a file</span>
                        </>
                      )}
                    </div>
                    {uploadedFileName && !isUploading && !isProcessing && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleCancelUpload();
                        }}
                        className="text-white hover:text-gray-400 transition-all"
                      >
                        <X className="size-4" /> 
                      </button>
                    )}
                  </Label>
                </div>
              ) : (
                <Input
                  placeholder="Enter your database connection string"
                  value={typeof connectionString === "string" ? connectionString : ""}
                  onChange={(e) => setConnectionString(e.target.value)}
                  disabled={isProcessing}
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleTestConnection}
              disabled={isProcessing}
            >
              Test Connection
            </Button>
            <Button
              type="button"
              disabled={!connectionInitialized || isProcessing}
              onClick={handleSubmit}
            >
              {isProcessing ? (
                <>
                  <Loader className="animate-spin size-4 mr-2" />
                  {currentStep === 'success' ? 'Redirecting...' : 'Processing...'}
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overlay for processing state - prevents any interaction */}
      {isProcessing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center">
          <div className="bg-card p-8 rounded-lg border shadow-lg text-center max-w-md">
            <div className="space-y-4">
              {currentStep === 'success' ? (
                <CheckCircle className="size-12 text-green-500 mx-auto" />
              ) : (
                <Loader className="size-12 animate-spin text-primary mx-auto" />
              )}
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {currentStep === 'success' ? 'Success!' : 'Setting up your workspace'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {stepMessages[currentStep]}
                </p>
              </div>
              <Progress value={stepProgress[currentStep]} className="h-2" />
              {currentStep !== 'success' && (
                <p className="text-xs text-muted-foreground">
                  Please don&#39;t close this window
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}