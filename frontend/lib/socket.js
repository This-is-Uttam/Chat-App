import { io } from "socket.io-client";

const socket = io("https://chat-app-ivao.onrender.com", {reconnection: true});

export default socket;