export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createFirebaseEmailPasswordUser } from '@/lib/firebase-auth-rest';
import {
  createGuest,
  findGuestByLookup,
  getRoomById,
  updateGuest,
  updateRoom,
  upsertUserLogin,
} from '@/lib/hospitality-data';
import {
  buildGuestAccessPayload,
  generateGuestPassword,
  serializeGuestAccessPayload,
} from '@/lib/guest-access';

function parseNights(value: unknown) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function provisionGuestCredentials(guestName: string, guestEmail: string) {
  const password = generateGuestPassword();

  try {
    const firebaseUser = await createFirebaseEmailPasswordUser({
      email: guestEmail,
      password,
      displayName: guestName,
    });

    return {
      firebaseUid: firebaseUser.uid,
      loginId: guestEmail,
      password,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('EMAIL_EXISTS')) {
      throw new Error('Guest email is already in use. Please enter a different email.');
    }

    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const { roomId, roomNumber, guestName, email, idNumber, contactNumber, address, nights } =
      await req.json();
    const normalizedGuestName = typeof guestName === 'string' ? guestName.trim() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedIdNumber = typeof idNumber === 'string' ? idNumber.trim() : '';
    const normalizedContact = typeof contactNumber === 'string' ? contactNumber.trim() : null;
    const normalizedAddress = typeof address === 'string' ? address.trim() : null;
    const stayNights = parseNights(nights);

    if (
      !roomId ||
      !roomNumber ||
      !normalizedGuestName ||
      !normalizedEmail ||
      !normalizedIdNumber ||
      stayNights === null
    ) {
      return NextResponse.json({ success: false, error: 'Missing required fields.' }, { status: 400 });
    }

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid guest email.' },
        { status: 400 }
      );
    }

    const room = await getRoomById(roomId);
    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Selected room was not found.' },
        { status: 404 }
      );
    }

    if (room.status !== 'vacant') {
      return NextResponse.json(
        {
          success: false,
          error: `Room ${roomNumber} is not available. Its status is: ${room.status}.`,
        },
        { status: 400 }
      );
    }

    const existingGuest = await findGuestByLookup([{ email: normalizedEmail }]);
    if (existingGuest) {
      return NextResponse.json(
        { success: false, error: 'A guest with this email already exists.' },
        { status: 400 }
      );
    }

    const loginToken = randomBytes(32).toString('hex');
    const credentials = await provisionGuestCredentials(normalizedGuestName, normalizedEmail);

    const guest = await createGuest({
      name: normalizedGuestName,
      roomNumber,
      roomId,
      idNumber: normalizedIdNumber,
      contact: normalizedContact,
      address: normalizedAddress,
      status: 'Booked',
      checkOut: new Date(Date.now() + stayNights * 24 * 60 * 60 * 1000),
      loginToken,
      email: normalizedEmail,
      loginEmail: credentials.loginId,
      loginPassword: credentials.password,
      firebaseUid: credentials.firebaseUid,
      qrPayload: null,
    });

    const qrPayload = serializeGuestAccessPayload(
      buildGuestAccessPayload({
        bookingId: guest.id,
        token: loginToken,
        guestName: guest.name,
        roomNumber,
        loginId: credentials.loginId,
        password: credentials.password,
        email: normalizedEmail,
        idNumber: normalizedIdNumber,
        contact: normalizedContact,
        address: normalizedAddress,
      })
    );

    await updateGuest(guest.id, { qrPayload });
    await upsertUserLogin({
      firebaseUid: credentials.firebaseUid,
      email: credentials.loginId,
      displayName: normalizedGuestName,
      role: 'guest',
      lastLogin: new Date(),
    });
    await updateRoom(roomId, { status: 'occupied' });

    return NextResponse.json({
      success: true,
      booking: {
        id: guest.id,
        name: guest.name,
        roomNumber,
        loginToken,
        loginId: credentials.loginId,
        password: credentials.password,
        email: normalizedEmail,
        qrPayload,
        idNumber: normalizedIdNumber,
        contact: normalizedContact,
        address: normalizedAddress,
        checkOut: guest.checkOut?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error('Booking creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { success: false, error: 'Failed to create booking.', details: errorMessage },
      { status: 500 }
    );
  }
}
