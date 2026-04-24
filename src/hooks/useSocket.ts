// src/hooks/useSocket.ts
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();

export const useSocket = (role: 'admin' | 'staff' | 'guest') => {
    const socketRef = useRef<Socket | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        if (!SOCKET_SERVER_URL) {
            console.warn("NEXT_PUBLIC_SOCKET_URL is not configured. Realtime radio and relay features are disabled.");
            setSocket(null);
            return;
        }

        if (!socketRef.current) {
            socketRef.current = io(SOCKET_SERVER_URL);

            socketRef.current.on('connect', () => {
                console.log(`Connected to Aegis Signaling Server as ${role}`);
                socketRef.current?.emit('join-role', role);
            });

            setSocket(socketRef.current);
        }

        return () => {
            socketRef.current?.disconnect();
            socketRef.current = null;
        };
    }, [role]);

    return socket;
};
