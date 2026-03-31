import { connectDB } from "@/lib/db";
import Chat from "@/lib/models/Chat";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params; 
  

    await connectDB(); 

    const chat = await Chat.findOne({ roomId });

    return NextResponse.json({
      success: true,
      data: chat?.messages || [],
    });

  } catch (e) {
    console.log(e); 
    return NextResponse.json({
      success: false,
      data: "Error in getting chat messages",
      error: e,
    });
  }
}