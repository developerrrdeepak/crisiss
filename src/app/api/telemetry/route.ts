import { NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin (Safe for Next.js hot-reloads)
// In Google Cloud Run, default application credentials handle auth automatically.
if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // 1. Validate Google Pub/Sub Push payload structure
        if (!body.message || !body.message.data) {
            return NextResponse.json({ error: 'Invalid Pub/Sub message format' }, { status: 400 });
        }

        // 2. Decode the Base64 data from Pub/Sub
        const decodedData = Buffer.from(body.message.data, 'base64').toString('utf-8');
        const telemetry = JSON.parse(decodedData);

        const { user_id, node_id, rssi, timestamp } = telemetry;

        if (!user_id || !node_id) {
            return NextResponse.json({ error: 'Missing required telemetry fields' }, { status: 400 });
        }

        // 3. Map the ESP32 Node ID to a Tactical Map Zone
        let zoneId = "Z-01"; // Default to LOBBY
        if (node_id.includes("CORRIDOR_EAST")) zoneId = "Z-02";
        if (node_id.includes("SERVER_ROOM")) zoneId = "Z-03";
        if (node_id.includes("POOL")) zoneId = "Z-04";

        // 4. Upsert directly into Firestore using the Admin SDK
        const docRef = db.collection('live_tracking').doc(user_id);

        await docRef.set({
            userId: user_id,
            currentNode: node_id,
            currentZone: zoneId,
            rssi: rssi,
            lastSeen: timestamp || new Date().toISOString(),
            updatedAt: FieldValue.serverTimestamp(), // Firestore server-side timestamp
        }, { merge: true });

        console.log(`[Telemetry Processed] User: ${user_id} | Node: ${node_id} | Zone: ${zoneId} | RSSI: ${rssi}`);

        // 5. Must return 200 OK so Google Pub/Sub knows the message was successfully received
        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}