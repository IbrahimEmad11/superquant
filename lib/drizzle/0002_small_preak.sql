ALTER TABLE "Database" DROP CONSTRAINT "Database_chatId_Chat_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Database" ADD CONSTRAINT "Database_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
