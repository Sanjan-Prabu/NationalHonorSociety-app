// Attendance-specific BLE helper functions

/**
 * Organization code mapping for BLE beacon Major field
 */
export const ORG_CODES = {
  nhs: 1,
  nhsa: 2,
} as const;

/**
 * Organization UUID mapping for BLE beacons
 */
export const ORG_UUIDS = {
  1: "6BA7B810-9DAD-11D1-80B4-00C04FD430C8", // NHS UUID
  2: "6BA7B811-9DAD-11D1-80B4-00C04FD430C8", // NHSA UUID
} as const;

/**
 * Gets organization code for BLE beacon Major field
 */
export function getOrgCode(orgSlug: string): number {
  return ORG_CODES[orgSlug as keyof typeof ORG_CODES] || 0;
}

/**
 * Gets organization UUID for BLE beacon
 */
export function getOrgUUID(orgCode: number): string | null {
  return ORG_UUIDS[orgCode as keyof typeof ORG_UUIDS] || null;
}

/**
 * Gets organization code from UUID
 */
export function getOrgCodeFromUUID(uuid: string): number {
  const upperUUID = uuid.toUpperCase();
  for (const [code, uuidValue] of Object.entries(ORG_UUIDS)) {
    if (uuidValue === upperUUID) {
      return parseInt(code);
    }
  }
  return 0;
}

/**
 * Encodes session token to 16-bit hash for BLE beacon Minor field
 */
export function encodeSessionToken(sessionToken: string): number {
  let hash = 0;
  for (let i = 0; i < sessionToken.length; i++) {
    hash = ((hash << 5) - hash + sessionToken.charCodeAt(i)) & 0xFFFF;
  }
  return hash;
}

/**
 * Validates session token format (should be 12 characters alphanumeric)
 */
export function isValidSessionToken(sessionToken: string): boolean {
  return /^[A-Za-z0-9]{12}$/.test(sessionToken);
}

/**
 * Validates BLE beacon payload for attendance detection
 */
export function validateBeaconPayload(
  major: number,
  minor: number,
  orgCode: number
): boolean {
  // Check if major matches expected org code
  if (major !== orgCode) return false;
  
  // Check if minor is within valid 16-bit range
  if (minor < 0 || minor > 0xFFFF) return false;
  
  return true;
}

/**
 * Generates BLE beacon payload for attendance session
 */
export function generateBeaconPayload(sessionToken: string, orgSlug: string) {
  if (!isValidSessionToken(sessionToken)) {
    throw new Error('Invalid session token format');
  }
  
  const orgCode = getOrgCode(orgSlug);
  if (orgCode === 0) {
    throw new Error('Invalid organization slug');
  }
  
  const uuid = getOrgUUID(orgCode);
  if (!uuid) {
    throw new Error('Could not get UUID for organization');
  }
  
  const minor = encodeSessionToken(sessionToken);
  
  return {
    uuid,
    major: orgCode,
    minor,
    txPower: 0xC7 // Default TX power
  };
}