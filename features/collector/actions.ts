"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { startCollectorProcess } from "@/server/services/collector-process";

export async function triggerCollectorAction() {
  await requireSession();
  await startCollectorProcess({});
  revalidatePath("/");
  redirect("/");
}
