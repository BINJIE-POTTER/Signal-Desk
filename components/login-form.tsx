"use client";

import { useActionState } from "react";
import { ArrowRight, LockKeyhole, UserRound } from "lucide-react";
import { loginAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, { error: null });
  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label
          className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground"
          htmlFor="username"
        >
          用户名
        </label>
        <div className="relative">
          <UserRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="username" name="username" className="h-12 pl-10" autoComplete="username" required />
        </div>
      </div>
      <div className="space-y-2">
        <label
          className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground"
          htmlFor="password"
        >
          密码
        </label>
        <div className="relative">
          <LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type="password"
            className="h-12 pl-10"
            autoComplete="current-password"
            minLength={8}
            required
          />
        </div>
      </div>
      {state.error ? (
        <p className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button className="h-12 w-full" disabled={pending}>
        {pending ? "正在验证…" : "进入观测台"}
        <ArrowRight />
      </Button>
    </form>
  );
}
