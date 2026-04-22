import { NextRequest, NextResponse } from 'next/server';
import {
  createGuest,
  createStaff,
  findGuestByLookup,
  findStaffByLookup,
  getUserLoginByFirebaseUid,
  type GuestRecord,
  type StaffRecord,
  type UserLoginRecord,
  updateGuest,
  updateStaff,
  upsertUserLogin,
} from '@/lib/hospitality-data';

export const dynamic = 'force-dynamic';

type UserRole = 'admin' | 'staff' | 'guest';

const buildLookupConditions = (firebaseUid: string, email?: string | null) => {
  const conditions: Array<{ firebaseUid?: string; email?: string }> = [];

  if (firebaseUid) {
    conditions.push({ firebaseUid });
  }

  if (email) {
    conditions.push({ email });
  }

  return conditions;
};

const getFallbackName = (displayName?: string | null, email?: string | null) =>
  displayName?.trim() || email?.split('@')[0] || 'User';

async function findProfiles(firebaseUid: string, email?: string | null) {
  const lookupConditions = buildLookupConditions(firebaseUid, email);

  if (lookupConditions.length === 0) {
    return { guest: null, staff: null };
  }

  const [guest, staff] = await Promise.all([
    findGuestByLookup(lookupConditions),
    findStaffByLookup(lookupConditions),
  ]);

  return { guest, staff };
}

function buildUserResponse(params: {
  userLogin: UserLoginRecord;
  guest: GuestRecord | null;
  staff: StaffRecord | null;
}) {
  const { userLogin, guest, staff } = params;
  const derivedName =
    guest?.name ??
    staff?.name ??
    userLogin.displayName ??
    userLogin.email.split('@')[0];

  return {
    id: userLogin.id,
    loginId: userLogin.id,
    profileId: guest?.id ?? staff?.id ?? userLogin.id,
    firebaseUid: userLogin.firebaseUid,
    email: userLogin.email,
    displayName: userLogin.displayName,
    role: userLogin.role,
    name: derivedName,
    roomNumber: guest?.roomNumber ?? null,
    checkOut: guest?.checkOut instanceof Date ? guest.checkOut.toISOString() : guest?.checkOut ?? null,
    guestCreatedAt: guest?.createdAt instanceof Date ? guest.createdAt.toISOString() : null,
    department: staff?.department ?? null,
    status: guest?.status ?? staff?.status ?? null,
    staffRole: staff?.role ?? null,
    employeeId: staff?.employeeId ?? null,
    phone: staff?.phone ?? null,
    emergencyContact: staff?.emergencyContact ?? null,
    bloodGroup: staff?.bloodGroup ?? null,
    joiningDate: staff?.joiningDate instanceof Date ? staff.joiningDate.toISOString() : null,
    validTill: staff?.validTill instanceof Date ? staff.validTill.toISOString() : null,
    photoUrl: staff?.photoUrl ?? null,
    profileType: guest ? 'guest' : staff ? 'staff' : 'login',
    lastLogin: userLogin.lastLogin.toISOString(),
    createdAt: userLogin.createdAt.toISOString(),
  };
}

export async function POST(req: NextRequest) {
  try {
    const { firebaseUid, email, displayName, role } = (await req.json()) as {
      firebaseUid?: string;
      email?: string;
      displayName?: string | null;
      role?: UserRole;
    };

    if (!firebaseUid || !email) {
      return NextResponse.json(
        { success: false, error: 'firebaseUid and email are required' },
        { status: 400 }
      );
    }

    const normalizedRole: UserRole = role === 'admin' || role === 'staff' ? role : 'guest';
    const fallbackName = getFallbackName(displayName, email);

    const userLogin = await upsertUserLogin({
      firebaseUid,
      email,
      displayName: displayName ?? null,
      role: normalizedRole,
      lastLogin: new Date(),
    });

    let guestProfile: GuestRecord | null = null;
    let staffProfile: StaffRecord | null = null;

    if (normalizedRole === 'guest') {
      const guestLookup = buildLookupConditions(firebaseUid, email);
      if (guestLookup.length > 0) {
        const existingGuest = await findGuestByLookup(guestLookup);

        if (existingGuest) {
          guestProfile = await updateGuest(existingGuest.id, {
            firebaseUid,
            email,
            name: existingGuest.name || fallbackName,
          });
        } else {
          guestProfile = await createGuest({
            firebaseUid,
            email,
            name: fallbackName,
            roomNumber: `G${Math.floor(Math.random() * 900) + 100}`,
            status: 'active',
            checkOut: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            loginToken: null,
            idNumber: null,
            contact: null,
            address: null,
            loginEmail: null,
            loginPassword: null,
            qrPayload: null,
            roomId: null,
          });
        }
      }
    }

    if (normalizedRole === 'staff') {
      const staffLookup = buildLookupConditions(firebaseUid, email);
      const existingStaff =
        staffLookup.length > 0 ? await findStaffByLookup(staffLookup) : null;

      if (existingStaff) {
        staffProfile = await updateStaff(existingStaff.id, {
          firebaseUid,
          email,
          name: existingStaff.name || fallbackName,
        });
      } else {
        staffProfile = await createStaff({
          firebaseUid,
          email,
          name: fallbackName,
          role: 'staff',
          status: 'Active',
          employeeId: null,
          loginPassword: null,
          department: null,
          phone: null,
          emergencyContact: null,
          bloodGroup: null,
          validTill: null,
          photoUrl: null,
        });
      }
    }

    const resolvedProfiles =
      guestProfile || staffProfile
        ? { guest: guestProfile, staff: staffProfile }
        : await findProfiles(firebaseUid, email);

    return NextResponse.json({
      success: true,
      user: buildUserResponse({
        userLogin,
        guest: resolvedProfiles.guest,
        staff: resolvedProfiles.staff,
      }),
    });
  } catch (error) {
    console.error('Error syncing user data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync user data' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const firebaseUid = searchParams.get('uid');

    if (!firebaseUid) {
      return NextResponse.json({ success: false, error: 'uid required' }, { status: 400 });
    }

    const userLogin = await getUserLoginByFirebaseUid(firebaseUid);

    if (!userLogin) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const { guest, staff } = await findProfiles(firebaseUid, userLogin.email);

    return NextResponse.json({
      success: true,
      user: buildUserResponse({ userLogin, guest, staff }),
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch user' }, { status: 500 });
  }
}
