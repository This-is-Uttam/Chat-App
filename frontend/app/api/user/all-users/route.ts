import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectDB } from "@/lib/db";
import { TUser, User } from "@/lib/models/User";
import Chat from "@/lib/models/Chat";

export type Message = {
  sender: string;
  message: string;
  createdAt: Date;
};

export type ChatType = {
  roomId: string;
  participants: string[];
  messages: Message[];
};

export async function POST(req: NextRequest) {
  try {
    const {currentUserEmail: currentUser} = await req.json()
    

    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    connectDB();

    const users: TUser[] = await User.find({email: {$ne: currentUser}});

    const lastMsgs = await Promise.all(users.map(async (user)=> {
        const roomId = [user.email, currentUser].sort().join("_")

        
        const chat: ChatType | null = await Chat.findOne({roomId});
        if (chat) {
          // console.log("chat route: ", chat.messages[chat.messages.length - 1].message)
          return chat.messages[chat.messages.length - 1].message
        }
    }))

    // console.log("last msg: ", lastMsgs)

    return NextResponse.json({ success: true, data: users, lastMsgs});
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
}
