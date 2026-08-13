import { redirect } from "next/navigation";
import { Activity, Eye, ShieldCheck } from "lucide-react";
import { AppLogo } from "@/components/layout/app-logo";
import { LoginForm } from "@/features/auth/components/login-form";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.15fr_.85fr]">
      <section className="relative hidden overflow-hidden border-r border-border bg-foreground p-14 text-background lg:flex lg:flex-col">
        <div className="absolute -right-24 -top-24 size-[420px] rounded-full border border-background/10" />
        <div className="absolute -right-8 -top-8 size-[280px] rounded-full border border-background/10" />
        <AppLogo className="relative z-10 [&>div:first-child]:bg-background [&>div:first-child]:text-foreground [&_p]:text-background" />
        <div className="relative z-10 mt-auto max-w-xl">
          <p className="mb-5 font-mono text-xs uppercase tracking-[.28em] text-background/50">
            Signals, not noise.
          </p>
          <h1 className="font-display text-6xl font-semibold leading-[.96] tracking-tight">
            每周一次，
            <br />
            <span className="text-primary">看见变化。</span>
          </h1>
          <p className="mt-7 max-w-md text-base leading-7 text-background/60">
            追踪近 90 天公开作品，把分散的页面数字变成可审计、可比较的周度信号。
          </p>
          <div className="mt-12 grid grid-cols-3 gap-3">
            {[
              [Eye, "公开可见"],
              [Activity, "周度快照"],
              [ShieldCheck, "内部使用"],
            ].map(([Icon, label]) => {
              const I = Icon as typeof Eye;
              return (
                <div className="border-t border-background/20 pt-4" key={String(label)}>
                  <I className="mb-2 size-4 text-primary" />
                  <span className="text-xs text-background/60">{String(label)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-10 lg:hidden">
            <AppLogo />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">
            Secure internal access
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight">欢迎回来</h2>
          <p className="mb-8 mt-3 text-sm leading-6 text-muted-foreground">
            使用内部账号登录。观测台仅通过私有网络访问。
          </p>
          <LoginForm />
          <p className="mt-8 border-t pt-5 text-xs leading-5 text-muted-foreground">
            系统只保存公开页面明确展示的数据。登录挑战和访问限制需要人工处理。
          </p>
        </div>
      </section>
    </main>
  );
}
