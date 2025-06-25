import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from 'next/server';

import { auth } from '@/app/(auth)/auth';

export async function POST(request: Request): Promise<NextResponse> {
  console.log("Upload API route called");
  
  let body: HandleUploadBody;
  
  try {
    body = (await request.json()) as HandleUploadBody;
    console.log("Request body:", body);
  } catch (error) {
    console.error("Error parsing request body:", error);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        try {
          console.log("onBeforeGenerateToken called");
          console.log("Requested upload path:", pathname);
          console.log("Client payload:", clientPayload);
          
          const session = await auth();
          console.log("Session:", session?.user?.id ? "Valid session" : "No session");
          if (!session?.user?.id) {
            console.log("Authentication failed");
            throw new Error('Unauthorized');
          }

          // Validate file extension from pathname
          if (!pathname.match(/\.(sqlite|db|sqlite3|db3)$/i)) {
            throw new Error('Invalid file type. Must be a SQLite database file.');
          }

          console.log("Returning token configuration");
          return {
            allowedContentTypes: [
              "application/octet-stream",
              "application/x-sqlite3",
              "application/vnd.sqlite3",
              "application/database",
              "*/*" // Fallback for any content type
            ],
            tokenPayload: JSON.stringify({
              userId: session.user.id,
            }),
          };
        } catch (error) {
          console.error("Error in onBeforeGenerateToken:", error);
          throw error;
        }
      },
      onUploadCompleted: async ({
        blob,
        tokenPayload,
      }: {
        blob: any;
        tokenPayload?: string | null;
      }) => {
        console.log("Blob upload completed", blob, tokenPayload);

        try {
          if (!tokenPayload) throw new Error("Missing token payload");
          const { userId } = JSON.parse(tokenPayload);
          console.log("Upload completed for user:", userId, "Blob URL:", blob.url);
        } catch (error) {
          console.error("Error in onUploadCompleted:", error);
          throw new Error("Could not update user");
        }
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Upload API route error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}