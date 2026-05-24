import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DB_FILE = path.join(process.cwd(), "data", "db.json");

export async function POST(req: Request) {
  try {
    const { id, folderId } = await req.json();

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    if (!db.documents) return NextResponse.json({ error: "No documents" }, { status: 404 });

    const doc = db.documents.find((d: any) => d.id === id);
    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    doc.folderId = folderId; // can be null
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

    return NextResponse.json({ success: true, document: doc });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
