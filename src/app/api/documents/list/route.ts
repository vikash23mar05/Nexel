import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DB_FILE = path.join(process.cwd(), "data", "db.json");

function getDB() {
  if (!fs.existsSync(DB_FILE)) {
    return { documents: [], folders: [] };
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

export async function GET() {
  try {
    const db = getDB();
    const documents = db.documents || [];
    const folders = db.folders || [];

    // Sort by newest first
    documents.sort((a: any, b: any) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return NextResponse.json({ documents, folders });
  } catch (error) {
    console.error("List documents error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
