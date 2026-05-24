import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DB_FILE = path.join(process.cwd(), "data", "db.json");

export async function POST(req: Request) {
  try {
    const { name, color } = await req.json();

    if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    if (!db.folders) db.folders = [];

    const newFolder = {
      id: `f_${Date.now()}`,
      name,
      color: color || "gray"
    };

    db.folders.push(newFolder);
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));

    return NextResponse.json({ folder: newFolder });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
