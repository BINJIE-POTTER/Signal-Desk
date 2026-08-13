"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, verifyCredentials } from "@/lib/auth";

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(8) });
export type LoginState = { error: string | null };

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "请输入有效的用户名和密码。" };
  const user = await verifyCredentials(parsed.data.username, parsed.data.password);
  if (!user) return { error: "用户名或密码不正确。" };
  await createSession(user);
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
