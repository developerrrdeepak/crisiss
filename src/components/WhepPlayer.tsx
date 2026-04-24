// src/components/WhepPlayer.tsx
"use client";

import { useEffect, useRef } from 'react';

// This helps with TypeScript by declaring the global variable from the script
declare global {
    interface Window {
        WebRTCPlayer: any;
    }
}

interface WhepPlayerProps {
    whepUrl: string;
}

export function WhepPlayer({ whepUrl }: WhepPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        // Dynamically load the WebRTC player script from the CDN
        const script = document.createElement('script');
        script.src = 'https://webrtcplayer.eyevinn.technology/webrtc-player.js';
        script.async = true;
        document.body.appendChild(script);

        // When the script is loaded, initialize the player
        script.onload = () => {
            if (videoRef.current && window.WebRTCPlayer) {
                const player = new window.WebRTCPlayer({
                    video: videoRef.current,
                    type: 'whep', // Specify WHEP protocol
                });
                // Connect to the WHEP stream from MediaMTX
                player.load(new URL(whepUrl)).catch((error: any) => {
                    console.error("WHEP Player failed to load stream:", error);
                });
            }
        };

        // Cleanup script tag when the component is unmounted
        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, [whepUrl]);

    return <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay muted playsInline />;
}