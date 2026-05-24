import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return new NextResponse("Missing document ID", { status: 400 });
  }

  // We saved the file with the id as the filename without .pdf
  const filePath = path.join(process.cwd(), "data", "uploads", id);
  
  if (!fs.existsSync(filePath)) {
    return new NextResponse("Document Not Found", { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "no-cache, no-store, must-revalidate"
    }
  });
}
