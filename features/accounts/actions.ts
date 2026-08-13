"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { addAccount, deleteAccount, setAccountEnabled } from "@/server/repositories/accounts";
import { startCollectorProcess } from "@/server/services/collector-process";

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
  await startCollectorProcess({ accountId });
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
