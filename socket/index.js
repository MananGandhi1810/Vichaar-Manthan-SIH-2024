import { Server } from "socket.io";
import { getUser } from "../utils/getUser.js";

const io = new Server();

io.on("connection", (socket) => {
    const { authorization } = socket.handshake.headers;
    if (!authorization) {
        socket.emit("interview", {
            success: false,
            message: "User not authorized",
            data: {},
        });
        socket.disconnect();
        return;
    }
    const token = authorization.split(" ").at(1);
    if (!token) {
        socket.emit("interview", {
            success: false,
            message: "User not authorized",
            data: {},
        });
        socket.disconnect();
        return;
    }
    const user = getUser(token);
    if (!user) {
        socket.emit("interview", {
            success: false,
            message: "User not authorized",
            data: {},
        });
        socket.disconnect();
        return;
    }
    socket.emit("interview", {
        success: true,
        message: "Connected",
        data: {},
    });
});

export { io };
