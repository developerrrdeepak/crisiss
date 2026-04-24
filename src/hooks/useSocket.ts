// src/hooks/useSocket.ts
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Use an environment variable for the production URL, with a fallback for local development
const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://aegis-socket-service-759964236760.europe-west1.run.app';

export const useSocket = (role: 'admin' | 'staff' | 'guest') => {
    const socketRef = useRef<Socket | null>(null);
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
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
