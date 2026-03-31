require("dotenv").config();

const { createServer, request } = require("http");
const { Server } = require("socket.io");
const { connectDB } = require("./db")
const Chat = require("./models/Chat")



const httpServer = createServer();

const io = new Server(httpServer, {
    cors: {
        origin: "*",
    },
});

let onlineUsers = new Map();

(async () => {
    await connectDB();

    io.on("connection", (socket) => {

        // register user
        socket.on("register", (userId) => {
            console.log("User connected:", userId);
            socket.userId = userId

        });

        // join room
        socket.on("joinRoom", (roomId) => {
            socket.join(roomId);
        });

        // leave room
        socket.on("leaveRoom", () => {
            const rooms = Array.from(socket.rooms);

            rooms.forEach((room) => {
                if (room != socket.id) {
                    socket.leave(room)
                    console.log("room left: ", room)
                }
            })
        })


        // send message
        socket.on("send_message", async ({ roomId, message, createdAt }) => {
            let sender = socket.userId;



            await Chat.findOneAndUpdate(
                { roomId },
                {
                    $push: {
                        messages: {
                            sender,
                            message,
                            createdAt,
                        }
                    },
                    $setOnInsert: {
                        participants: roomId.split("_"),
                    },
                },
                { upsert: true, returnDocument: true }
            )


            io.to(roomId).emit("receive_message", {
                sender,
                message,
                createdAt
            });

        });


        // user online
        socket.on("user_online", (userId) => {
            onlineUsers.set(userId, socket.id)
            // broadcast others about online
            io.emit("online_users", Array.from(onlineUsers.keys()))
        })

        socket.on("disconnect", () => {
            console.log("User disconnected, User: ", socket.id);
            for (let [userId, sockId] of onlineUsers.entries()) {
                if (sockId === socket.id) {
                    onlineUsers.delete(userId)
                }
            }
            io.emit("online_users", Array.from(onlineUsers.keys()))
        });
    });


    httpServer.listen(4000, () => {
        console.log("Server running on port 4000");
    });

})();