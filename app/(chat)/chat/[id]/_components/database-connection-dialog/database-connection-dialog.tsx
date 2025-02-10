"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
            <Label>Connection String</Label>
            <Input
              placeholder="Enter your database connection string"
              value={connectionString}
              onChange={(e) => setConnectionString(e.target.value)}
            />
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
