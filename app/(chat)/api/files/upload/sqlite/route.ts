import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth"; 

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
        ) || 
        file.name.endsWith(".sqlite") || 
        file.name.endsWith(".db") ||
        file.name.endsWith(".sqlite3") ||
        file.name.endsWith(".db3"),
      {
        message: "Invalid file type. Must be a SQLite database file (.sqlite, .db, .sqlite3, .db3).",
      }
    ),
});

export async function POST(req: NextRequest) {

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `sqlite-${session.user.id}-${timestamp}-${sanitizedName}`;

    // Upload to Vercel Blob with public access
    const blob = await put(uniqueFileName, file, { 
      access: "public",
      addRandomSuffix: false,
    });

    console.log("Successfully uploaded SQLite file to Vercel Blob:", blob.url);

    // Return the blob URL as the connection string
    return NextResponse.json({ 
      success: true, 
      path: blob.url,
      filename: file.name,
      size: file.size
    });

  } catch (error) {
    console.error("Error uploading SQLite file:", error);
    return NextResponse.json({ 
      error: "Failed to upload file. Please try again." 
    }, { status: 500 });
  }
}