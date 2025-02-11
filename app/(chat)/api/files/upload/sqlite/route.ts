import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import process from "process";
import { put } from "@vercel/blob";
import { z } from "zod";

const TEMP_FOLDER = path.join(process.cwd(), "tmp"); 

const FileSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: "File size should be less than 5MB",
    })
    .refine(
      (file) =>
        ["application/x-sqlite3", "application/octet-stream"].includes(
          file.type
        ) || file.name.endsWith(".sqlite") || file.name.endsWith(".db"),
      {
        message: "Invalid file type. Must be a SQLite database file (.sqlite, .db).",
      }
    ),
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    const validation = FileSchema.safeParse({ file });
    if (!validation.success) {
      const errorMessage = validation.error.errors
        .map((error) => error.message)
        .join(", ");
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    await fs.mkdir(TEMP_FOLDER, { recursive: true });

    const filePath = path.join(TEMP_FOLDER, file.name);
    const fileBuffer = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(fileBuffer));

    // Upload file to Vercel Blob but do NOT use the URL
    try {
      await put(file.name, file, { access: "public" });
      console.log("Uploaded SQLite file to Vercel Blob");
    } catch (blobError) {
      console.error("Vercel Blob Upload Failed:", blobError);
    }

    return NextResponse.json({ success: true, path: filePath });
  } catch (error) {
    console.error("Error saving SQLite file:", error);
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }
}
