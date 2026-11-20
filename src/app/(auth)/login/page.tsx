"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Check } from "lucide-react";
import { LoginIllustration } from "@/components/auth/login-illustration";
import s from "@/components/auth/auth.module.css";

const REMEMBER_KEY = "login-remember-email";
const delay = (sec: number) => ({ animationDelay: `${sec}s` });

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [errorKey, setErrorKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const rememberRef = useRef<HTMLInputElement>(null);

  // Prefill a remembered email (written straight to the DOM inputs)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved && emailRef.current && rememberRef.current) {
        emailRef.current.value = saved;
        rememberRef.current.checked = true;
      }
    } catch {}
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    try {
      if (formData.get("remember")) localStorage.setItem(REMEMBER_KEY, String(formData.get("email") ?? ""));
      else localStorage.removeItem(REMEMBER_KEY);
    } catch {}

    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setErrorKey((k) => k + 1);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className={`${s.root} min-h-screen grid md:grid-cols-2 bg-card`}>
      {/* ── Left: animation (top on mobile) ─────────── */}
      <div className="relative flex flex-col items-center justify-center bg-[#efe9fc] px-6 pt-8 pb-6 md:p-10">
        <LoginIllustration className="w-full max-w-[250px] sm:max-w-[340px] md:max-w-[520px] h-auto" />
        <div className={`${s.rise} text-center mt-3 md:mt-6`} style={delay(0.9)}>
          <p className="text-[14px] md:text-[16px] font-semibold text-[#3b3363]">Reach every inbox, effortlessly.</p>
          <p className="text-[12px] md:text-[13px] text-[#6b6590] mt-1">AI-personalised campaigns, replies &amp; follow-ups.</p>
        </div>
      </div>

      {/* ── Right: login form ───────────────────────── */}
      <div className="flex items-center justify-center px-6 py-10 sm:px-12">
        <div className="w-full max-w-[420px]">
          <div className={s.rise} style={delay(0.25)}>
            <Link href="/" className="inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-1.jpeg" alt="Synergific Software" className="h-10 w-auto dark:hidden" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Synergific Software" className="h-10 w-auto hidden dark:block" />
            </Link>
            <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mt-3">AI Business Suite</p>
          </div>

          <div className={`${s.rise} mt-10`} style={delay(0.35)}>
            <h1 className={`text-primary text-[34px] sm:text-[38px] font-bold leading-[1.1] tracking-tight`}>Welcome back</h1>
            <p className="text-[14px] text-muted-foreground mt-2 leading-relaxed">
              Good to see you again. Sign in to your account to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8">
            {error && (
              <div
                key={errorKey}
                role="alert"
                className={`${s.shake} mb-4 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-[13px] px-3.5 py-2.5 rounded-lg flex items-center gap-2`}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Grouped fields */}
            <div className={`${s.rise} rounded-xl border border-border bg-background/40 overflow-hidden shadow-sm`} style={delay(0.45)}>
              <div className={`${s.field} px-4 pt-2.5 pb-2 focus-within:bg-primary/[0.04]`}>
                <label htmlFor="email" className="block text-[11px] font-medium text-muted-foreground">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  ref={emailRef}
                  placeholder="you@company.com"
                  className="w-full bg-transparent text-[14px] font-medium text-foreground placeholder:text-muted-foreground/50 py-1 focus:outline-none"
                />
              </div>
              <div className="h-px bg-border" />
              <div className={`${s.field} px-4 pt-2.5 pb-2 focus-within:bg-primary/[0.04]`}>
                <label htmlFor="password" className="block text-[11px] font-medium text-muted-foreground">
                  Password
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    className="w-full bg-transparent text-[14px] font-medium text-foreground placeholder:text-muted-foreground/50 py-1 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="p-1 -mr-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className={`${s.rise} flex items-center justify-between mt-4`} style={delay(0.55)}>
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  name="remember"
                  ref={rememberRef}
                  className="peer sr-only"
                />
                <span className="w-4 h-4 rounded-[5px] border border-border bg-background flex items-center justify-center transition-all peer-checked:bg-primary peer-checked:border-primary peer-checked:[&>svg]:scale-100 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30 group-hover:border-primary/60">
                  <Check className="w-3 h-3 text-white scale-0 transition-transform" strokeWidth={3} />
                </span>
                <span className="text-[13px] text-muted-foreground">Remember me</span>
              </label>
              <Link href="#" className="text-[13px] text-muted-foreground hover:text-primary transition-colors">
                Forgot password?
              </Link>
            </div>

            <div className={`${s.rise} grid grid-cols-2 gap-3 mt-8`} style={delay(0.65)}>
              <button
                type="submit"
                disabled={loading}
                className={`h-11 rounded-lg bg-primary text-primary-foreground font-semibold text-[12px] tracking-[0.12em] uppercase shadow-sm hover:bg-primary/90 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2 group`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in
                  </>
                ) : (
                  <>
                    Login
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
              <Link
                href="/register"
                className="h-11 rounded-lg border border-border text-foreground/80 font-semibold text-[12px] tracking-[0.12em] uppercase flex items-center justify-center hover:border-primary hover:text-primary hover:-translate-y-0.5 transition-all"
              >
                Sign up
              </Link>
            </div>
          </form>

          <p className={`${s.rise} text-[11px] text-muted-foreground/70 mt-12`} style={delay(0.8)}>
            © {new Date().getFullYear()} Synergific Software Pvt. Ltd. — We make IT happen.
          </p>
        </div>
      </div>
    </div>
  );
}
