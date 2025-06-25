"use client";

import { X, Upload, Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  connectDatabaseToChat,
  testDatabaseConnection,
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
import { Textarea } from "@/components/ui/textarea";
import { Database } from "@/db/schema";
import { useDatabaseConnectionDialog } from "@/hooks/use-database-connection-dialog";
import { cn } from "@/lib/utils";

interface DatabaseConnectionDialogProps {
  chatId: string;
  database: Database;
}

const databaseProvidersOptions = [
  { label: "SQLite", value: "sqlite" },
  { label: "PostgreSQL", value: "postgres" },
  { label: "MySQL", value: "mysql" },
];

export default function DatabaseConnectionDialog({
  chatId,
  database,
}: DatabaseConnectionDialogProps) {
  const router = useRouter();
  const [connectionInitialized, setConnectionInitialized] = useState(false);

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
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadResponse = await fetch("/api/files/upload/sqlite", {
        method: "POST",
        body: formData,
      });
      let uploadData;
      try {
        uploadData = await uploadResponse.json();
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        toast.error("Server error - please try again later");
        setIsUploading(false);
        return;
      }

      if (!uploadResponse.ok) {
        const errorMessage = uploadData.error || `Upload failed (${uploadResponse.status})`;
        toast.error(errorMessage);
        setIsUploading(false);
        return;
      }

      setConnectionString(uploadData.path);
      setUploadedFileName(file.name);
      toast.success("File uploaded successfully!");
      
    } catch (error) {
      console.error("Upload error:", error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error("Network error - please check your connection and try again");
      } else if (error instanceof Error) {
        toast.error(`Upload failed: ${error.message}`);
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
    const { error } = await connectDatabaseToChat(
      chatId,
      databaseName,
      databaseDescription,
      connectionString,
      databaseProvider
    );
    if (error) {
      toast.error("Failed to connect to database");
    } else {
      toast.success("Database connected");
      setIsOpen(false);
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

return (
  <Dialog
    open={isOpen}
    onOpenChange={(newVal) => {
      if (newVal === false) {
        setIsOpen(false);
        router.replace("/");
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
      <div className="grid gap-8 py-4">
        <div className="flex flex-col gap-4">
          <Label>Database Provider</Label>
          <div className="flex flex-row items-center gap-2">
            {databaseProvidersOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => setDatabaseProvider(option.value)}
                className={cn(
                  "py-2 px-4 border border-muted-foreground rounded-md cursor-pointer text-muted-foreground transition-all duration-500",
                  databaseProvider === option.value &&
                    "bg-primary/10 border-primary text-primary"
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
          />
        </div>
        <div className="flex flex-col gap-4">
          <Label>Database Description</Label>
          <Textarea
            placeholder="Enter your database description"
            value={databaseDescription}
            onChange={(e) => setDatabaseDescription(e.target.value)}
            maxLength={200}
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
              />

              <Label
                htmlFor="sqlite-upload"
                className="flex items-center justify-between w-full h-10 cursor-pointer rounded-md border border-input bg-primary/10 text-primary px-4 py-2 text-sm font-medium 
                          hover:bg-primary hover:text-white transition-all duration-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                {uploadedFileName && (
                  <button
                    type="button"
                    onClick={handleCancelUpload}
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
            />
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={handleTestConnection}>
          Test Connection
        </Button>
        <Button
          type="button"
          disabled={!connectionInitialized}
          onClick={handleSubmit}
        >
          Save changes
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);  
}
