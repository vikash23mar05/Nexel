import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DB_FILE = path.join(process.cwd(), "data", "db.json");

// Helper to ensure DB exists
function getDB() {
  if (!fs.existsSync(DB_FILE)) {
    const dataDir = path.dirname(DB_FILE);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify({ highlights: [] }, null, 2));
    return { highlights: [] };
  }
  const fileContent = fs.readFileSync(DB_FILE, "utf-8");
  return JSON.parse(fileContent);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const docId = searchParams.get("docId");

  if (!docId) {
    return NextResponse.json({ error: "Missing docId" }, { status: 400 });
  }

  const db = getDB();
  const docHighlights = db.highlights.filter((h: any) => h.docId === docId);

  return NextResponse.json({ highlights: docHighlights });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { docId, highlight } = body;

    if (!docId || !highlight) {
      return NextResponse.json({ error: "Missing docId or highlight" }, { status: 400 });
    }

    const db = getDB();
    const newHighlight = {
      ...highlight,
      id: String(Math.random()).slice(2),
      docId,
      createdAt: new Date().toISOString()
    };

    db.highlights.push(newHighlight);
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

    return NextResponse.json({ highlight: newHighlight });
  } catch (error) {
    console.error("Save highlight error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const db = getDB();
    db.highlights = db.highlights.filter((h: any) => h.id !== id);
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete highlight:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
