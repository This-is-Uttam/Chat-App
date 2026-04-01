"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { redirect } from "next/navigation";
import Image from "next/image";
import { TUser } from "@/lib/models/User";
import socket from "@/lib/socket";
import { formatDate, formatTime } from "@/utils/helper";
import { BiSend } from "react-icons/bi";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const [lastMsgs, setLastMsgs] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])

  const { data: session } = useSession();

  const sendMessage = (message: string) => {
    if (!input.trim() || !selectedUser) return;

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

      if (resJson.success) {
        // otherUsers = users without me
        const users: TUser[] = resJson.data;
        setUsers(users || []);

        // last messages list
        const lastMsgs: string[] = resJson.lastMsgs;
        setLastMsgs(lastMsgs || null);
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

  // For online signal
  useEffect(() => {
    if(!session?.user?.email) return;
    console.log("session changed")
    // user online broadcast
    socket.emit("user_online", session?.user?.email);

    // get online users
    socket.on("online_users", (onlineUsers)=> {

      setOnlineUsers(onlineUsers)
      console.log("online users: ", onlineUsers)
    })

    return ()=>{socket.off("online_users")}
  
    
  }, [session])
  

  // load messages in the room
  useEffect(() => {
    if (!currentRoomId) return;

    getMessagesOfChat(currentRoomId);
  }, [currentRoomId]);

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Chat List */}
      <div className="w-full sm:w-[40%]  bg-white border-r border-gray-400 flex flex-col justify-between">
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
                  <div className="relative">
                    {/* online symbol */}
                   {onlineUsers.includes(user?.email) && <div className="w-3 h-3 bg-green-500 rounded-full absolute bottom-1 right-0 border-green-300 border-2"></div>}
                  <Image
                    src={user.image || "/placeholder.jpg"}
                    alt={selectedUser?.name || "User avatar"}
                    width={1080}
                    height={1080}
                    className=" w-10 h-auto rounded-full object-cover"
                  />
                  </div>
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
        <div className="flex border-t border-gray-400 flex items-center justify-between p-2">
          <div className="flex">
            <Image
              src={session?.user?.image || "/placeholder.jpg"}
              alt={selectedUser?.name || "User avatar"}
              width={500}
              height={500}
              className="w-[30px] h-fit rounded-lg"
            />

            <div className="p-2 font-semibold text-gray-800 text-[12px] truncate">
              {session?.user?.email}
            </div>
          </div>

          {/* <Button onClick={() => signOut()}>Logout</Button> */}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant={"destructive"}>Logout</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure to Logout?</AlertDialogTitle>
                <AlertDialogDescription>
                  You can login again with the same Google Account whenever you
                  want.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => signOut()}>
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/*  Chat Area */}
      <div className="hidden sm:w-[60%] sm:flex lg:w-full flex-col  bg-gradient-to-br from-indigo-400 to-purple-400  ">
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
                className="h-full w-auto rounded-full"
              />
            </div>
            {/* Name and last seen */}
            <div>

            <div>{selectedUser && selectedUser.name}</div>
            <div className="text-sm text-gray-700">{onlineUsers.includes(selectedUser.email)? "Online":"Offline"}</div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 px-3 overflow-y-auto space-y-1 ">
          {messages.length === 0 ? (
            <div className="h-[90vh] text-gray-700 flex justify-center items-center text-center">
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
                        ? "ml-auto bg-[#3f0497] text-white"
                        : "bg-white"
                    }`}
                  >
                    <div className="py-1">{msg.message}</div>
                    <div
                      className={` text-xs shrink-0 text-right flex items-end pb-1
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
        {selectedUser && (
          <div className="bg-white rounded-full mx-3 mb-3 flex gap-2">
            <input
              value={input}
              onKeyDown={(e) => handleKeyDown(e)}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 py-3 rounded-lg px-5 py-2 outline-none"
            />

            <div
              onClick={() => sendMessage(input)}
              className={`${input.trim() == "" ? "bg-[#e3d1ff]" : "bg-[#6905ff]"} text-white p-3 m-1 rounded-full`}
            >
              <BiSend size={22} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
