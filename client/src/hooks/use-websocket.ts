import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useWebSocket() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;

        let socket: WebSocket;
        let reconnectTimeout: any;

        function connect() {
            socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                console.log("🔌 WS Connected");
            };

            socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log("📥 WS Message:", message);

                    if (message.type === "IMAGE_GENERATED") {
                        // Invalidate both images list and limits
                        queryClient.invalidateQueries({ queryKey: [api.images.list.path] });
                        queryClient.invalidateQueries({ queryKey: [api.limits.get.path] });
                    }
                } catch (e) {
                    console.error("❌ Failed to parse WS message", e);
                }
            };

            socket.onclose = () => {
                console.log("🔌 WS Disconnected, retrying...");
                reconnectTimeout = setTimeout(connect, 3000);
            };

            socket.onerror = (err) => {
                console.error("🔌 WS Error:", err);
                socket.close();
            };
        }

        connect();

        return () => {
            if (socket) socket.close();
            clearTimeout(reconnectTimeout);
        };
    }, [queryClient]);
}
