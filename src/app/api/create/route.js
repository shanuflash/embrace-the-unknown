import { NextResponse } from "next/server";
import dbConnection from "../utils/db.js";
import { Room } from "../utils/schema.js";
import shuffleArray from "../utils/shuffle.js";

dbConnection(process.env.NEXT_PUBLIC_MONGODB_URI);
export async function GET(req) {
  try {
    const data = await Room.create({
      id: Math.random().toString(36).substr(2, 6).toUpperCase(),
      step: 1,
      puzzle: shuffleArray([1, 2, 3, 4, 5]),
      debug: shuffleArray([1, 2, 3, 4, 5]),
      code: shuffleArray([1, 2, 3]),
    });
    return NextResponse.json({ message: "Created a new room", roomID: data.id }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
