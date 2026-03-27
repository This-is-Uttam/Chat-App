"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { redirect } from "next/navigation";
import { TUser } from "@/lib/models/User";
import socket from "@/lib/socket";
import { formatDate, formatTime } from "@/utils/helper";

export type Message = {
  sender: string;
  message: string;
  createdAt: Date;
};


export default function ChatPage() {
  const primaryColor = `bg-blue-600`;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [users, setUsers] = useState<TUser[]>([]);
  const [selectedUser, setSelectedUser] = useState(users[0]);
  const [isLoading, setisLoading] = useState(true);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  

  const { data: session } = useSession();

  const sendMessage = (message: string) => {
    if (!input.trim()) return;

    const roomId = getRoomId(selectedUser.email);
    const createdAt = Date.now();
    socket.emit("send_message", {
      roomId,
      message,
      createdAt,
    });
    setInput("");
  };



  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      sendMessage(input);
    }
  };

  const getOtherUsers = async () => {
    setisLoading(true);
    try {
      const response = await fetch("/api/user/all-users", {
        method: "GET",
        credentials: "include",
      });

      const resJson = await response.json();

      console.log("Fetched users:", resJson);
      if (resJson.success) {
        // otherUsers = users without me
        const users: TUser[] = resJson.data;
        const otherUsers = users.filter(
          (user) => user.email != session?.user?.email,
        );
        setUsers(otherUsers || []);
      } else {
        console.error("Failed to fetch users:", resJson.message);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setisLoading(false);
    }
  };

  const getRoomId = (targetEmail: string) => {
    const currentUserEmail = session?.user?.email;
    if (!currentUserEmail) return null;

    const emails = [currentUserEmail, targetEmail].sort();
    return emails.join("_");
  };

  const handleUserSelect = (user: TUser) => {
    setSelectedUser(user);
    const roomId = getRoomId(user.email);

    setCurrentRoomId(roomId);

    // leave previous room first
    socket.emit("leaveRoom");

    socket.emit("joinRoom", roomId);

    setMessages([]);
  };

  const getMessagesOfChat = async (roomId: string) => {
    try {
      setisLoading(true);
      const response = await fetch(`/api/chat/${roomId}`, {
        method: "GET",
        credentials: "include",
      });

      const resJson = await response.json();

      if (resJson.success) {
        const messages: Message[] = resJson.data;

        setMessages(messages);
      } else {
        console.error("Failed to fetch chat messages:", resJson.message);
      }
    } catch (error) {
      console.error("Error fetching chat messages:", error);
    } finally {
      setisLoading(false);
    }
  };

   useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!session) {
      // Redirect to login if not authenticated
      redirect("/login");
    }

    getOtherUsers();
  }, []);

  // register user to socket server
  useEffect(() => {
    if (!session?.user?.email) return;

    socket.emit("register", session.user.email);

    const handleMessage = (data: Message) => {
      setMessages((prev) => [...prev, data]);
    };

    socket.on("receive_message", handleMessage);

    return () => {
      socket.off("receive_message", handleMessage);
    };
  }, [session?.user?.email]);

  // For reconneting room
  useEffect(() => {
    if (!currentRoomId) return;

    socket.on("connect", () => {
      console.log("Reconnected: ", socket.id);

      if (session?.user?.email) {
        socket.emit("register", session?.user?.email);
      }

      if (currentRoomId) {
        socket.emit("joinRoom", currentRoomId);
      }

      return () => {
        socket.off("connect");
      };
    });
  }, [session?.user?.email, currentRoomId]);

  // load messages in the room
  useEffect(() => {
    if (!currentRoomId) return;

    getMessagesOfChat(currentRoomId);
  }, [currentRoomId]);

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Chat List */}
      <div className="w-1/3 bg-white border-r flex flex-col justify-between">
        <div>
          <div className="p-4 font-bold text-xl border-b">Chats</div>

          {/* Ui when no users found */}
          {users.length === 0 ? (
            <div className="p-4 text-gray-500">No users found.</div>
          ) : (
            users.map((user) => (
              <div
                key={user._id.toString()}
                onClick={() => handleUserSelect(user)}
                className={`p-4 cursor-pointer border-b hover:bg-gray-100 ${
                  selectedUser &&
                  selectedUser._id.toString() === user._id.toString()
                    ? "bg-gray-200"
                    : ""
                }`}
              >
                <h2 className="font-semibold">{user.name}</h2>
                <p className="text-sm text-gray-500 truncate">
                  {/* {user.lastMessage} */}Last message preview here
                </p>
              </div>
            ))
          )}
        </div>
        <div className="flex">
          <h2 className="p-4 font-bold text-[12px] border-t">
            Logged in as: {session?.user?.email}
          </h2>
          <button
            onClick={() => signOut()}
            className="w-10/12 text-sm bg-blue-500 text-white font-semibold hover:bg-blue-600"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* RIGHT - Chat Area */}
      <div className="w-2/3 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-white border-b font-semibold">
          {selectedUser && selectedUser.name}
        </div>

        {/* Messages */}
        <div className="flex-1 px-1 bg-(--chat-bg) overflow-y-auto space-y-1 ">
          {/*  */}
          {messages.length === 0 ? (
            <div className="w-fit text-gray-500 flex justify-center items-center">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[70%] w-fit px-3 rounded-lg flex gap-3 justify-between ${
                  msg.sender === session?.user?.email
                    ? "ml-auto bg-(--primary) text-white"
                    : "bg-white"
                }`}
              >
                <div className="py-2">{msg.message}</div>
                <div
                  className={`text-xs text-right flex items-end pb-1
                   mt-1 ${msg.sender === session?.user?.email ? "text-blue-200" : "text-gray-500"}`}
                >
                  {formatTime(msg.createdAt)}
                </div>
              </div>
            ))
          )}
        <div ref={bottomRef}></div>
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t flex gap-2">
          <input
            value={input}
            onKeyDown={(e) => handleKeyDown(e)}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded-lg px-3 py-2 outline-none"
          />

          <button
            onClick={() => sendMessage(input)}
            className="bg-blue-500 text-white px-4 rounded-lg"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
