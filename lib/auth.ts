import argon2 from "argon2";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { getDb } from "@/lib/db";

const COOKIE_NAME = "douyin_monitor_session";
const key = new TextEncoder().encode(env.AUTH_SECRET);

export async function verifyCredentials(username: string, password: string) {
  const user = getDb()
    .prepare("SELECT id, username, password_hash FROM app_users WHERE username = ?")
    .get(username) as { id: number; username: string; password_hash: string } | undefined;
  if (!user || !(await argon2.verify(user.password_hash, password))) return null;
  getDb().prepare("UPDATE app_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?").run(user.id);
  return { id: user.id, username: user.username };
}

export async function createSession(user: { id: number; username: string }) {
  const token = await new SignJWT({ username: user.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(key);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    return { id: Number(payload.sub), username: String(payload.username) };
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
