import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

export type WsMessage = {
    type: "IMAGE_GENERATED" | "STATUS_UPDATE";
    payload?: any;
};

let wss: WebSocketServer;

export function setupWs(server: Server) {
    wss = new WebSocketServer({ server, path: "/ws" });

    wss.on("connection", (ws) => {
        console.log("🔌 WS: Client connected");

        ws.on("error", console.error);

        ws.on("close", () => {
            console.log("🔌 WS: Client disconnected");
        });
    });

    console.log("🔌 WebSocket server initialized on /ws");
}

export function broadcast(message: WsMessage) {
    if (!wss) return;

    const data = JSON.stringify(message);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}
