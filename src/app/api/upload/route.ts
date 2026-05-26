import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Global Unhandled Rejection Shield to prevent Next.js dev server from crashing on async errors
if (typeof process !== "undefined") {
  process.on("unhandledRejection", (reason) => {
    console.warn("⚠️ [Unhandled Rejection Shielded]:", reason);
  });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename without .pdf extension to bypass IDM
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = uniqueSuffix;

    // Ensure private uploads directory exists
    const uploadsDir = path.join(process.cwd(), "data", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);

    // Save document metadata to DB
    const DB_FILE = path.join(process.cwd(), "data", "db.json");
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify({ highlights: [], documents: [], folders: [] }, null, 2));
    }
    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    
    // Ensure arrays exist
    if (!db.documents) db.documents = [];
    if (!db.folders) db.folders = [];
    
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(1);
    
    const newDoc = {
      id: uniqueSuffix,
      name: file.name,
      size: `${sizeMb} MB`,
      type: "PDF",
      folderId: null,
      uploadedAt: new Date().toISOString()
    };
    
    db.documents.push(newDoc);
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

    const fileUrl = `/api/document?id=${uniqueSuffix}`;

    return NextResponse.json({ 
      docId: uniqueSuffix, 
      url: fileUrl,
      filename: file.name
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
