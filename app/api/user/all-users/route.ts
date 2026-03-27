import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";

export async function GET(req: NextRequest) {
  try {
    const session = getServerSession()
    

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    connectDB();

    const users = await User.find();

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
}
