import { Server } from "socket.io";

const io = new Server();

io.on("connection", (socket) => {
    console.log("Connected to ", socket.id);
});

export { io };
