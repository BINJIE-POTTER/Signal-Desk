"use server";

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { addAccount, deleteAccount, setAccountEnabled } from "@/lib/queries";
import { createSession, destroySession, requireSession, verifyCredentials } from "@/lib/auth";

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

export async function addAccountAction(formData: FormData) {
  await requireSession();
  const parsed = z
    .object({
      profileUrl: z
        .string()
        .url()
        .refine((url) => new URL(url).hostname.endsWith("douyin.com"), "必须是抖音链接"),
    })
    .safeParse({ profileUrl: formData.get("profileUrl") });
  if (!parsed.success) return;
  const canonicalUrl = new URL(parsed.data.profileUrl);
  canonicalUrl.search = "";
  canonicalUrl.hash = "";
  const accountId = addAccount(canonicalUrl.toString());
  startCollector({ accountId });
  revalidatePath("/");
  redirect("/");
}

export async function toggleAccountAction(formData: FormData) {
  await requireSession();
  const parsed = z
    .object({ id: z.coerce.number().int(), enabled: z.enum(["0", "1"]) })
    .safeParse({ id: formData.get("id"), enabled: formData.get("enabled") });
  if (!parsed.success) return;
  setAccountEnabled(parsed.data.id, parsed.data.enabled === "1");
  revalidatePath("/");
}

export async function deleteAccountAction(formData: FormData) {
  await requireSession();
  const parsed = z.object({ id: z.coerce.number().int().positive() }).safeParse({ id: formData.get("id") });
  if (!parsed.success) return;
  deleteAccount(parsed.data.id);
  revalidatePath("/");
}

export async function triggerCollectorAction() {
  await requireSession();
  startCollector({});
  redirect("/");
}

function startCollector({ accountId }: { accountId?: number }) {
  const artifactDirectory = path.join(process.cwd(), "artifacts");
  fs.mkdirSync(artifactDirectory, { recursive: true });
  const output = fs.openSync(path.join(artifactDirectory, "manual-collector.log"), "a");
  const child = spawn("/usr/bin/env", ["npm", "run", "collect"], {
    cwd: process.cwd(),
    detached: true,
    env: {
      ...process.env,
      COLLECTOR_TRIGGER: "manual",
      ...(accountId ? { COLLECTOR_ACCOUNT_ID: String(accountId) } : {}),
    },
    stdio: ["ignore", output, output],
  });
  child.unref();
  fs.closeSync(output);
}
