"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { redirect } from "next/navigation";
import Image from "next/image";
import { TUser } from "@/lib/models/User";
import socket from "@/lib/socket";
import { formatDate, formatTime } from "@/utils/helper";

export type Message = {
  sender: string;
  message: string;
  createdAt: Date;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [users, setUsers] = useState<TUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<TUser>();
  const [isLoading, setisLoading] = useState(true);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [lastMsgs, setLastMsgs] = useState<string[]>([])

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
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          currentUserEmail: session?.user?.email,
        }),
      });

      const resJson = await response.json();

      console.log("Fetched users:", resJson);
      if (resJson.success) {
        // otherUsers = users without me
        const users: TUser[] = resJson.data;
        setUsers(users || []);

        // last messages list
        const lastMsgs: string[] = resJson.lastMsgs;
        setLastMsgs(lastMsgs || null) 
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
    console.log("UUUUUUUU", user);
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
      <div className="w-[40%]  max-w-[450px] min-w-[250px] bg-white border-r border-gray-400 flex flex-col justify-between">
        <div>
          <div className="p-4 font-bold text-xl border-gray-400 text-blue-600">
            Chat App
          </div>

          {/* Ui when no users found */}
          {users.length === 0 ? (
            <div className="p-4 text-gray-500">No users found.</div>
          ) : (
            users.map((user, i) => (
              <div
                key={user._id.toString()}
                onClick={() => handleUserSelect(user)}
                className={`p-2 px-3 cursor-pointer border-b border-gray-200 hover:bg-gray-100 ${
                  selectedUser &&
                  selectedUser._id.toString() === user._id.toString()
                    ? "bg-(--chat-bg)"
                    : ""
                }`}
              >
                <div className="flex gap-2">
                  <Image
                    src={user.image || "/placeholder.jpg"}
                    alt={selectedUser?.name || "User avatar"}
                    width={40}
                    height={40}
                    className="h-full rounded-full"
                  />
                  <div>
                    <div className="font-semibold">{user.name}</div>
                    <p className="text-sm text-gray-500 truncate">
                      {lastMsgs && lastMsgs[i]}
                    </p>
                  </div>
                </div>
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
      <div className="w-full flex flex-col">
        {/* Header */}
        {selectedUser && (
          <div className=" px-4 py-2.5 flex items-center gap-2 bg-white border-b border-gray-300 font-semibold">
            {/* Thumbnail */}
            <div className="">
              <Image
                src={selectedUser?.image || "/placeholder.jpg"}
                alt={selectedUser?.name || "User avatar"}
                width={40}
                height={40}
                className="h-full rounded-full"
              />
            </div>
            {/* Name */}
            <div>{selectedUser && selectedUser.name}</div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 px-3 bg-(--chat-bg) overflow-y-auto space-y-1 ">
          {messages.length === 0 ? (
            <div className="h-[90vh] text-gray-500 flex justify-center items-center text-center">
              No messages yet. <br /> Click a user to start the conversation!
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Conversations */}
              <div>
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`max-w-[70%] w-fit px-3 my-1 rounded-lg flex gap-3 justify-between ${
                      msg.sender === session?.user?.email
                        ? "ml-auto bg-(--primary) text-white"
                        : "bg-white"
                    }`}
                  >
                    <div className="py-1">{msg.message}</div>
                    <div
                      className={`text-xs text-right flex items-end pb-1
                   mt-1 ${msg.sender === session?.user?.email ? "text-blue-200" : "text-gray-500"}`}
                    >
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef}></div>
        </div>

        {/* Input */}
        <div className="p-4 flex gap-2">
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
