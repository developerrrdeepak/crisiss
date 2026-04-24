import { NextResponse } from "next/server";

function getPublicFirebaseConfig() {
  return {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env["FIREBASE_PUBLIC_API_KEY"] || process.env["NEXT_PUBLIC_FIREBASE_API_KEY"],
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env["FIREBASE_PUBLIC_AUTH_DOMAIN"] || process.env["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"],
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env["FIREBASE_PUBLIC_PROJECT_ID"] || process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"],
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env["FIREBASE_PUBLIC_STORAGE_BUCKET"] || process.env["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"],
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env["FIREBASE_PUBLIC_MESSAGING_SENDER_ID"] || process.env["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"],
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env["FIREBASE_PUBLIC_APP_ID"] || process.env["NEXT_PUBLIC_FIREBASE_APP_ID"],
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env["FIREBASE_PUBLIC_MEASUREMENT_ID"] || process.env["NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"],
  };
}

export async function GET() {
  return NextResponse.json(
    { config: getPublicFirebaseConfig() },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
