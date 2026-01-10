import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { JWTPayload, AuthUser } from "@/types";
import prisma from "@/lib/db";
import { env } from "@/lib/env";

// Validate JWT_SECRET is properly configured
if (!env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured");
}

if (process.env.NODE_ENV === "production" && env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters long in production");
}

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);

const SESSION_DURATION = parseInt(env.SESSION_DURATION_DAYS) * 24 * 60 * 60 * 1000;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function createToken(payload: Omit<JWTPayload, "iat" | "exp">): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${env.SESSION_DURATION_DAYS}d`)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  // Verify user still exists and is active
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      dealershipId: true,
      isActive: true,
      mustChangePassword: true,
      contractorDepartment: true,
    },
  });

  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    userId: user.id, // Alias for backwards compatibility
    email: user.email,
    name: user.name,
    role: user.role,
    dealershipId: user.dealershipId,
    mustChangePassword: user.mustChangePassword,
    contractorDepartment: user.contractorDepartment,
  };
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION / 1000,
    path: "/",
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("auth-token");
}

export function requireRole(userRole: string, allowedRoles: string[]): boolean {
  return allowedRoles.includes(userRole);
}

export function isAgencyAdmin(role: string): boolean {
  return role === "agency_admin";
}

export function canAccessDealership(
  userRole: string,
  userDealershipId: string | null,
  targetDealershipId: string
): boolean {
  if (isAgencyAdmin(userRole)) return true;
  return userDealershipId === targetDealershipId;
}
