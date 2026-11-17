import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { createHmac } from 'node:crypto';
import { sql } from './db';

const COOKIE = 'coffer_session';
const DAY = 60 * 60 * 24;

export const DEMO_USER_ID = 'demo';
export const OWNER_USER_ID = 'owner';

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error('AUTH_SECRET must be set to at least 32 characters.');
  }
  return new TextEncoder().encode(s);
}

export interface Session { userId: string; isDemo: boolean; }

/** True when the id was minted by createAccount (as opposed to owner/demo). */
export function isRegisteredId(userId: string): boolean {
  return userId.startsWith('u_');
}

/**
 * A short fingerprint of the account's current password hash, carried inside
 * the session. Changing or resetting the password changes the fingerprint, so
 * every session issued before that — on any device — stops working.
 *
 * Returns null when the account no longer exists (session is invalid), and ''
 * for accounts without a password (the demo).
 */
async function passwordStamp(userId: string): Promise<string | null> {
  let hash: string | null | undefined;
  if (userId === OWNER_USER_ID) {
    hash = process.env.OWNER_PASSWORD_HASH;
  } else if (isRegisteredId(userId)) {
    const rows = (await sql`SELECT password_hash FROM users WHERE id = ${userId}`
    ) as unknown as { password_hash: string | null }[];
    if (!rows[0]) return null;
    hash = rows[0].password_hash;
  }
  if (!hash) return '';
  // Keyed, so the cookie (readable by its holder) reveals nothing about the hash.
  return createHmac('sha256', secret()).update(hash).digest('base64url').slice(0, 22);
}

export async function createSession(userId: string, isDemo: boolean): Promise<void> {
  const pw = (await passwordStamp(userId)) ?? '';
  const token = await new SignJWT({ userId, isDemo, pw })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(isDemo ? '1d' : '30d')
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: isDemo ? DAY : DAY * 30,
  });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const userId = String(payload.userId);
    // Reject sessions from before the latest password change.
    const stamp = await passwordStamp(userId);
    if (stamp === null || (payload.pw ?? '') !== stamp) return null;
    return { userId, isDemo: Boolean(payload.isDemo) };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/**
 * Legacy single-owner login via environment variables.
 *
 * Kept so the original OWNER_USERNAME/OWNER_PASSWORD_HASH account still works
 * after the move to real email accounts — its data is attached to the 'owner'
 * user id. New accounts go through lib/accounts.ts instead.
 */
export async function verifyOwner(username: string, password: string): Promise<boolean> {
  const expectedUser = process.env.OWNER_USERNAME;
  const hash = process.env.OWNER_PASSWORD_HASH;
  if (!expectedUser || !hash) return false;
  // Always run bcrypt so a wrong username isn't faster than a wrong password.
  const userOk = username === expectedUser;
  const passOk = await bcrypt.compare(password, hash);
  return userOk && passOk;
}
