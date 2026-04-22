export interface StaffAccessPayload {
  type: "aegis-staff-access";
  version: 1;
  employeeId: string;
}

export function buildStaffAccessPayload(employeeId: string): StaffAccessPayload {
  return {
    type: "aegis-staff-access",
    version: 1,
    employeeId,
  };
}

export function serializeStaffAccessPayload(payload: StaffAccessPayload) {
  return JSON.stringify(payload);
}

export function buildStaffLoginPath(employeeId: string) {
  const searchParams = new URLSearchParams({ employeeId });
  return `/staff/login?${searchParams.toString()}`;
}
