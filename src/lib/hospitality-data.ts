import { randomUUID } from "crypto";
import type { GuestLike, IncidentLike, RoomGuestLike, RoomLike, StaffLike } from "@/lib/admin-data";
import {
  executeDataConnectMutation,
  executeDataConnectRead,
  getDataConnectClient,
} from "@/lib/data-connect";

export interface GuestRecord extends GuestLike {
  idNumber: string | null;
  contact: string | null;
  address: string | null;
  loginEmail: string | null;
  loginPassword: string | null;
  qrPayload: string | null;
  email: string | null;
  firebaseUid: string | null;
}

export interface StaffRecord extends StaffLike {
  loginPassword: string | null;
  firebaseUid: string | null;
}

export type IncidentRecord = IncidentLike;

export type RoomRecord = RoomLike;

export interface UserLoginRecord {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string | null;
  role: string;
  lastLogin: Date;
  createdAt: Date;
}

export interface LookupCondition {
  firebaseUid?: string;
  email?: string;
}

interface RawGuestRecord {
  id: string;
  name: string;
  roomNumber: string | null;
  idNumber: string | null;
  contact: string | null;
  address: string | null;
  status: string;
  checkIn: string;
  checkOut: string | null;
  loginToken: string | null;
  loginEmail: string | null;
  loginPassword: string | null;
  qrPayload: string | null;
  email: string | null;
  firebaseUid: string | null;
  createdAt: string;
  roomId: string | null;
}

interface RawRoomGuestRecord {
  id: string;
  name: string;
  status: string;
  checkIn: string;
  checkOut: string | null;
  createdAt: string;
}

interface RawRoomRecord {
  id: string;
  number: string;
  floor: number;
  type: string;
  status: string;
  guests_on_room?: RawRoomGuestRecord[] | null;
}

interface RawStaffRecord {
  id: string;
  employeeId: string | null;
  name: string;
  email: string | null;
  loginPassword: string | null;
  firebaseUid: string | null;
  role: string;
  department: string | null;
  phone: string | null;
  emergencyContact: string | null;
  bloodGroup: string | null;
  joiningDate: string;
  validTill: string | null;
  photoUrl: string | null;
  status: string;
  createdAt: string;
}

interface RawIncidentRecord {
  id: string;
  title: string;
  severity: string;
  status: string;
  timestamp: string;
  roomId: string | null;
  description: string | null;
}

interface RawUserLoginRecord {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string | null;
  role: string;
  lastLogin: string;
  createdAt: string;
}

const GUEST_FIELDS = `
  id
  name
  roomNumber
  idNumber
  contact
  address
  status
  checkIn
  checkOut
  loginToken
  loginEmail
  loginPassword
  qrPayload
  email
  firebaseUid
  createdAt
  roomId
`;

const ROOM_GUEST_FIELDS = `
  id
  name
  status
  checkIn
  checkOut
  createdAt
`;

const ROOM_FIELDS = `
  id
  number
  floor
  type
  status
  guests_on_room {
    ${ROOM_GUEST_FIELDS}
  }
`;

const STAFF_FIELDS = `
  id
  employeeId
  name
  email
  loginPassword
  firebaseUid
  role
  department
  phone
  emergencyContact
  bloodGroup
  joiningDate
  validTill
  photoUrl
  status
  createdAt
`;

const INCIDENT_FIELDS = `
  id
  title
  severity
  status
  timestamp
  roomId
  description
`;

const USER_LOGIN_FIELDS = `
  id
  firebaseUid
  email
  displayName
  role
  lastLogin
  createdAt
`;

function toDate(value: string) {
  return new Date(value);
}

function compareDatesAscending(left: Date | null, right: Date | null) {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.getTime() - right.getTime();
}

function compareDatesDescending(left: Date | null, right: Date | null) {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return right.getTime() - left.getTime();
}

function mapGuest(raw: RawGuestRecord): GuestRecord {
  return {
    id: raw.id,
    name: raw.name,
    roomNumber: raw.roomNumber,
    idNumber: raw.idNumber,
    contact: raw.contact,
    address: raw.address,
    status: raw.status,
    checkIn: toDate(raw.checkIn),
    checkOut: raw.checkOut ? toDate(raw.checkOut) : null,
    loginToken: raw.loginToken,
    loginEmail: raw.loginEmail,
    loginPassword: raw.loginPassword,
    qrPayload: raw.qrPayload,
    email: raw.email,
    firebaseUid: raw.firebaseUid,
    createdAt: toDate(raw.createdAt),
    roomId: raw.roomId,
  };
}

function mapRoomGuest(raw: RawRoomGuestRecord): RoomGuestLike {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status,
    checkIn: toDate(raw.checkIn),
    checkOut: raw.checkOut ? toDate(raw.checkOut) : null,
    createdAt: toDate(raw.createdAt),
  };
}

function mapRoom(raw: RawRoomRecord): RoomRecord {
  const guests = (raw.guests_on_room ?? [])
    .map(mapRoomGuest)
    .sort((left, right) => {
      const byCheckIn = compareDatesDescending(left.checkIn, right.checkIn);
      return byCheckIn !== 0 ? byCheckIn : compareDatesDescending(left.createdAt, right.createdAt);
    });

  return {
    id: raw.id,
    number: raw.number,
    floor: raw.floor,
    type: raw.type,
    status: raw.status,
    guests,
  };
}

function mapStaff(raw: RawStaffRecord): StaffRecord {
  return {
    id: raw.id,
    employeeId: raw.employeeId,
    name: raw.name,
    email: raw.email,
    loginPassword: raw.loginPassword,
    firebaseUid: raw.firebaseUid,
    role: raw.role,
    department: raw.department,
    phone: raw.phone,
    emergencyContact: raw.emergencyContact,
    bloodGroup: raw.bloodGroup,
    joiningDate: toDate(raw.joiningDate),
    validTill: raw.validTill ? toDate(raw.validTill) : null,
    photoUrl: raw.photoUrl,
    status: raw.status,
    createdAt: toDate(raw.createdAt),
  };
}

function mapIncident(raw: RawIncidentRecord): IncidentRecord {
  return {
    id: raw.id,
    title: raw.title,
    severity: raw.severity,
    status: raw.status,
    timestamp: toDate(raw.timestamp),
    roomId: raw.roomId,
    description: raw.description,
  };
}

function mapUserLogin(raw: RawUserLoginRecord): UserLoginRecord {
  return {
    id: raw.id,
    firebaseUid: raw.firebaseUid,
    email: raw.email,
    displayName: raw.displayName,
    role: raw.role,
    lastLogin: toDate(raw.lastLogin),
    createdAt: toDate(raw.createdAt),
  };
}

function normalizeNullableString(value: string | null | undefined) {
  return value ?? null;
}

function serializeDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function cleanInput<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as T;
}

function serializeGuest(record: GuestRecord) {
  return cleanInput({
    id: record.id,
    name: record.name,
    roomNumber: normalizeNullableString(record.roomNumber),
    idNumber: normalizeNullableString(record.idNumber),
    contact: normalizeNullableString(record.contact),
    address: normalizeNullableString(record.address),
    status: record.status,
    checkIn: serializeDate(record.checkIn),
    checkOut: serializeDate(record.checkOut),
    loginToken: normalizeNullableString(record.loginToken),
    loginEmail: normalizeNullableString(record.loginEmail),
    loginPassword: normalizeNullableString(record.loginPassword),
    qrPayload: normalizeNullableString(record.qrPayload),
    email: normalizeNullableString(record.email),
    firebaseUid: normalizeNullableString(record.firebaseUid),
    createdAt: serializeDate(record.createdAt),
    roomId: normalizeNullableString(record.roomId),
  });
}

function serializeRoom(record: RoomRecord) {
  return cleanInput({
    id: record.id,
    number: record.number,
    floor: record.floor,
    type: record.type,
    status: record.status,
  });
}

function serializeStaff(record: StaffRecord) {
  return cleanInput({
    id: record.id,
    employeeId: normalizeNullableString(record.employeeId),
    name: record.name,
    email: normalizeNullableString(record.email),
    loginPassword: normalizeNullableString(record.loginPassword),
    firebaseUid: normalizeNullableString(record.firebaseUid),
    role: record.role,
    department: normalizeNullableString(record.department),
    phone: normalizeNullableString(record.phone),
    emergencyContact: normalizeNullableString(record.emergencyContact),
    bloodGroup: normalizeNullableString(record.bloodGroup),
    joiningDate: serializeDate(record.joiningDate),
    validTill: serializeDate(record.validTill),
    photoUrl: normalizeNullableString(record.photoUrl),
    status: record.status,
    createdAt: serializeDate(record.createdAt),
  });
}

function serializeIncident(record: IncidentRecord) {
  return cleanInput({
    id: record.id,
    title: record.title,
    severity: record.severity,
    status: record.status,
    timestamp: serializeDate(record.timestamp),
    roomId: normalizeNullableString(record.roomId),
    description: normalizeNullableString(record.description),
  });
}

function serializeUserLogin(record: UserLoginRecord) {
  return cleanInput({
    id: record.id,
    firebaseUid: record.firebaseUid,
    email: record.email,
    displayName: normalizeNullableString(record.displayName),
    role: record.role,
    lastLogin: serializeDate(record.lastLogin),
    createdAt: serializeDate(record.createdAt),
  });
}

function matchesLookup<T extends { firebaseUid?: string | null; email?: string | null }>(
  record: T,
  lookupConditions: LookupCondition[]
) {
  return lookupConditions.some((condition) => {
    const firebaseUidMatch =
      condition.firebaseUid !== undefined && record.firebaseUid === condition.firebaseUid;
    const emailMatch = condition.email !== undefined && record.email === condition.email;
    return firebaseUidMatch || emailMatch;
  });
}

async function deleteById(
  operationName: string,
  deleteField: string,
  id: string
) {
  await executeDataConnectMutation(
    `
      mutation ${operationName}($id: String!) {
        ${deleteField}(id: $id)
      }
    `,
    { id }
  );
}

export async function listGuests() {
  const data = await executeDataConnectRead<{ guests: RawGuestRecord[] }>(
    `
      query ListGuests {
        guests {
          ${GUEST_FIELDS}
        }
      }
    `
  );

  return data.guests
    .map(mapGuest)
    .sort((left, right) => {
      const byCheckout = compareDatesAscending(left.checkOut, right.checkOut);
      return byCheckout !== 0 ? byCheckout : compareDatesDescending(left.createdAt, right.createdAt);
    });
}

export async function listRooms() {
  const data = await executeDataConnectRead<{ rooms: RawRoomRecord[] }>(
    `
      query ListRooms {
        rooms {
          ${ROOM_FIELDS}
        }
      }
    `
  );

  return data.rooms
    .map(mapRoom)
    .sort((left, right) => {
      if (left.floor !== right.floor) {
        return left.floor - right.floor;
      }

      return left.number.localeCompare(right.number, undefined, { numeric: true });
    });
}

export async function listStaff() {
  const data = await executeDataConnectRead<{ staffMembers: RawStaffRecord[] }>(
    `
      query ListStaffMembers {
        staffMembers {
          ${STAFF_FIELDS}
        }
      }
    `
  );

  return data.staffMembers
    .map(mapStaff)
    .sort((left, right) => compareDatesDescending(left.createdAt, right.createdAt));
}

export async function listIncidents() {
  const data = await executeDataConnectRead<{ incidents: RawIncidentRecord[] }>(
    `
      query ListIncidents {
        incidents {
          ${INCIDENT_FIELDS}
        }
      }
    `
  );

  return data.incidents
    .map(mapIncident)
    .sort((left, right) => compareDatesDescending(left.timestamp, right.timestamp));
}

export async function listUserLogins() {
  const data = await executeDataConnectRead<{ userLogins: RawUserLoginRecord[] }>(
    `
      query ListUserLogins {
        userLogins {
          ${USER_LOGIN_FIELDS}
        }
      }
    `
  );

  return data.userLogins
    .map(mapUserLogin)
    .sort((left, right) => compareDatesDescending(left.createdAt, right.createdAt));
}

export async function getGuestById(id: string) {
  return (await listGuests()).find((guest) => guest.id === id) ?? null;
}

export async function getRoomById(id: string) {
  return (await listRooms()).find((room) => room.id === id) ?? null;
}

export async function getStaffById(id: string) {
  return (await listStaff()).find((staff) => staff.id === id) ?? null;
}

export async function getStaffByEmployeeId(employeeId: string) {
  return (await listStaff()).find((staff) => staff.employeeId === employeeId) ?? null;
}

export async function getGuestByLoginToken(loginToken: string) {
  return (await listGuests()).find((guest) => guest.loginToken === loginToken) ?? null;
}

export async function getUserLoginByFirebaseUid(firebaseUid: string) {
  return (await listUserLogins()).find((userLogin) => userLogin.firebaseUid === firebaseUid) ?? null;
}

export async function findGuestByLookup(lookupConditions: LookupCondition[]) {
  if (lookupConditions.length === 0) return null;
  return (await listGuests()).find((guest) => matchesLookup(guest, lookupConditions)) ?? null;
}

export async function findStaffByLookup(lookupConditions: LookupCondition[]) {
  if (lookupConditions.length === 0) return null;
  return (await listStaff()).find((staff) => matchesLookup(staff, lookupConditions)) ?? null;
}

export async function countGuestsByRoom(roomId: string, excludeGuestId?: string) {
  const guests = await listGuests();
  return guests.filter(
    (guest) => guest.roomId === roomId && (!excludeGuestId || guest.id !== excludeGuestId)
  ).length;
}

export async function countActiveStaffByDepartment(department: string) {
  const staff = await listStaff();
  return staff.filter(
    (member) =>
      member.department === department &&
      member.status.toLowerCase() !== "inactive"
  ).length;
}

export async function createGuest(
  input: Omit<GuestRecord, "id" | "checkIn" | "createdAt"> &
    Partial<Pick<GuestRecord, "id" | "checkIn" | "createdAt">>
) {
  const guest: GuestRecord = {
    id: input.id ?? randomUUID(),
    name: input.name,
    roomNumber: input.roomNumber ?? null,
    idNumber: input.idNumber ?? null,
    contact: input.contact ?? null,
    address: input.address ?? null,
    status: input.status,
    checkIn: input.checkIn ?? new Date(),
    checkOut: input.checkOut ?? null,
    loginToken: input.loginToken ?? null,
    loginEmail: input.loginEmail ?? null,
    loginPassword: input.loginPassword ?? null,
    qrPayload: input.qrPayload ?? null,
    email: input.email ?? null,
    firebaseUid: input.firebaseUid ?? null,
    createdAt: input.createdAt ?? new Date(),
    roomId: input.roomId ?? null,
  };

  await getDataConnectClient().upsert("guest", serializeGuest(guest));

  return guest;
}

export async function updateGuest(id: string, changes: Partial<GuestRecord>) {
  const existingGuest = await getGuestById(id);

  if (!existingGuest) {
    return null;
  }

  const updatedGuest: GuestRecord = {
    ...existingGuest,
    ...changes,
    id: existingGuest.id,
  };

  await getDataConnectClient().upsert("guest", serializeGuest(updatedGuest));
  return updatedGuest;
}

export async function updateGuestsByLookup(
  lookupConditions: LookupCondition[],
  changes: Partial<GuestRecord>
) {
  if (lookupConditions.length === 0) {
    return 0;
  }

  const guests = (await listGuests()).filter((guest) => matchesLookup(guest, lookupConditions));
  if (guests.length === 0) return 0;

  const updatedGuests = guests.map((guest) => ({
    ...guest,
    ...changes,
    id: guest.id,
  }));

  await getDataConnectClient().upsertMany(
    "guest",
    updatedGuests.map(serializeGuest)
  );

  return updatedGuests.length;
}

export async function createRoom(input: Omit<RoomRecord, "id" | "guests"> & Partial<Pick<RoomRecord, "id">>) {
  const room: RoomRecord = {
    id: input.id ?? randomUUID(),
    number: input.number,
    floor: input.floor,
    type: input.type,
    status: input.status,
    guests: [],
  };

  await getDataConnectClient().upsert("room", serializeRoom(room));

  return room;
}

export async function updateRoom(id: string, changes: Partial<RoomRecord>) {
  const existingRoom = await getRoomById(id);

  if (!existingRoom) {
    return null;
  }

  const updatedRoom: RoomRecord = {
    ...existingRoom,
    ...changes,
    id: existingRoom.id,
    guests: changes.guests ?? existingRoom.guests ?? [],
  };

  await getDataConnectClient().upsert("room", serializeRoom(updatedRoom));
  return updatedRoom;
}

export async function deleteRoom(id: string) {
  await deleteById("DeleteRoom", "room_delete", id);
}

export async function createIncident(
  input: Omit<IncidentRecord, "id" | "timestamp"> &
    Partial<Pick<IncidentRecord, "id" | "timestamp">>
) {
  const incident: IncidentRecord = {
    id: input.id ?? randomUUID(),
    title: input.title,
    severity: input.severity,
    status: input.status,
    timestamp: input.timestamp ?? new Date(),
    roomId: input.roomId ?? null,
    description: input.description ?? null,
  };

  await getDataConnectClient().upsert("incident", serializeIncident(incident));

  return incident;
}

export async function updateIncident(id: string, changes: Partial<IncidentRecord>) {
  const existingIncident = (await listIncidents()).find((incident) => incident.id === id) ?? null;

  if (!existingIncident) {
    return null;
  }

  const updatedIncident: IncidentRecord = {
    ...existingIncident,
    ...changes,
    id: existingIncident.id,
  };

  await getDataConnectClient().upsert("incident", serializeIncident(updatedIncident));
  return updatedIncident;
}

export async function createStaff(
  input: Omit<StaffRecord, "id" | "createdAt"> &
    Partial<Pick<StaffRecord, "id" | "createdAt">>
) {
  const staff: StaffRecord = {
    id: input.id ?? randomUUID(),
    employeeId: input.employeeId ?? null,
    name: input.name,
    email: input.email ?? null,
    loginPassword: input.loginPassword ?? null,
    firebaseUid: input.firebaseUid ?? null,
    role: input.role,
    department: input.department ?? null,
    phone: input.phone ?? null,
    emergencyContact: input.emergencyContact ?? null,
    bloodGroup: input.bloodGroup ?? null,
    joiningDate: input.joiningDate ?? new Date(),
    validTill: input.validTill ?? null,
    photoUrl: input.photoUrl ?? null,
    status: input.status,
    createdAt: input.createdAt ?? new Date(),
  };

  await getDataConnectClient().upsert("staffMember", serializeStaff(staff));

  return staff;
}

export async function updateStaff(id: string, changes: Partial<StaffRecord>) {
  const existingStaff = await getStaffById(id);

  if (!existingStaff) {
    return null;
  }

  const updatedStaff: StaffRecord = {
    ...existingStaff,
    ...changes,
    id: existingStaff.id,
  };

  await getDataConnectClient().upsert("staffMember", serializeStaff(updatedStaff));
  return updatedStaff;
}

export async function updateStaffByLookup(
  lookupConditions: LookupCondition[],
  changes: Partial<StaffRecord>
) {
  if (lookupConditions.length === 0) {
    return 0;
  }

  const staffMembers = (await listStaff()).filter((staff) => matchesLookup(staff, lookupConditions));
  if (staffMembers.length === 0) return 0;

  const updatedStaffMembers = staffMembers.map((staff) => ({
    ...staff,
    ...changes,
    id: staff.id,
  }));

  await getDataConnectClient().upsertMany(
    "staffMember",
    updatedStaffMembers.map(serializeStaff)
  );

  return updatedStaffMembers.length;
}

export async function upsertUserLogin(
  input: Omit<UserLoginRecord, "id" | "createdAt"> &
    Partial<Pick<UserLoginRecord, "id" | "createdAt">>
) {
  const existingUserLogin = await getUserLoginByFirebaseUid(input.firebaseUid);

  const userLogin: UserLoginRecord = existingUserLogin
    ? {
        ...existingUserLogin,
        ...input,
        id: existingUserLogin.id,
      }
    : {
        id: input.id ?? randomUUID(),
        firebaseUid: input.firebaseUid,
        email: input.email,
        displayName: input.displayName ?? null,
        role: input.role,
        lastLogin: input.lastLogin,
        createdAt: input.createdAt ?? new Date(),
      };

  await getDataConnectClient().upsert("userLogin", serializeUserLogin(userLogin));
  return userLogin;
}

export async function clearAllHospitalityData() {
  const [incidents, guests, rooms] = await Promise.all([
    listIncidents(),
    listGuests(),
    listRooms(),
  ]);

  for (const incident of incidents) {
    await deleteById("DeleteIncident", "incident_delete", incident.id);
  }

  for (const guest of guests) {
    await deleteById("DeleteGuest", "guest_delete", guest.id);
  }

  for (const room of rooms) {
    await deleteById("DeleteRoomDuringReset", "room_delete", room.id);
  }
}
