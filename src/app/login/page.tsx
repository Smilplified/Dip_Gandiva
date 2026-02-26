"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { MailOutlined, LockOutlined } from "@ant-design/icons";

function LoginContent() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? undefined;
  const { signIn, isLoading, isInitialized, user, getDefaultRedirect } = useAuth();

  useEffect(() => {
    if (!isInitialized) return;
    if (user) {
      const path = redirect || getDefaultRedirect();
      router.replace(path);
    }
  }, [isInitialized, user, redirect, getDefaultRedirect, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter email and password.");
      return;
    }

    const { error: signInError, redirectPath } = await signIn(email.trim(), password);

    if (signInError) {
      setError(signInError.message || "Invalid email or password.");
      return;
    }

    const path = redirect || redirectPath || getDefaultRedirect();
    router.replace(path);
  };

  if (!isInitialized) {
    return (
      <div className="login-page min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 rounded-full border-2 border-slate-200 border-t-slate-500 animate-spin" />
          <span className="text-sm text-slate-500">Loading...</span>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="login-page min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 rounded-full border-2 border-slate-200 border-t-slate-500 animate-spin" />
          <span className="text-sm text-slate-500">Redirecting to dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page min-h-screen flex flex-col md:flex-row bg-[#f8fafc]">
      {/* Left panel - branding */}
      <div className="hidden md:flex md:w-[48%] lg:w-[52%] flex-col justify-between p-10 lg:p-14 border-r border-slate-200/80" style={{ backgroundColor: "#F2F4F5" }}>
        <div className="flex flex-col flex-1 min-h-0">
          <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            CRM Platform
          </div>
          <h2 className="mt-12 text-3xl font-semibold tracking-tight text-slate-800 lg:text-4xl">
            Welcome back
          </h2>
          <p className="mt-4 max-w-sm text-base text-slate-600 leading-relaxed">
            Sign in to access your workspace and manage campaigns, contacts, and deals in one place.
          </p>
          <div className="mt-8 relative w-full flex-1 min-h-0">
            <Image
              src="/projects/Corporate%20CRM%20Workflows%20Infographic%20Presentation.png"
              alt="Corporate CRM Workflows Infographic"
              fill
              className="object-contain"
              priority
              sizes="(max-width: 768px) 100vw, 52vw"
            />
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Secure authentication · Role-based access
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 md:p-10">
        <div className="w-full max-w-[400px]">
          <div className="md:hidden mb-8 text-center">
            <h1 className="text-xl font-semibold text-slate-800">CRM Dashboard</h1>
            <p className="mt-1 text-sm text-slate-600">Sign in to your account</p>
          </div>

          <div
            data-login-card
            className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/60 sm:p-10"
            style={{ boxSizing: "border-box" }}
          >
            <div className="mb-8 hidden md:block">
              <h1 className="text-xl font-semibold text-slate-800 tracking-tight">
                Sign in
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Enter your credentials to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  <span className="shrink-0 mt-0.5">!</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="w-full min-w-0">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Email
                </label>
                <div className="relative w-full">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <MailOutlined className="text-base" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full min-w-0 pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition disabled:opacity-50"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="w-full min-w-0">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Password
                </label>
                <div className="relative w-full">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <LockOutlined className="text-base" />
                  </span>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-w-0 pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none transition disabled:opacity-50"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-1 w-full py-3 px-4 rounded-xl bg-slate-800 text-white font-semibold transition hover:bg-slate-700 focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-white disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-slate-800"
              >
                {isLoading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-400">
              Secure login with Supabase Auth
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="login-page min-h-screen flex items-center justify-center bg-[#f8fafc]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-9 w-9 rounded-full border-2 border-slate-200 border-t-slate-500 animate-spin" />
            <span className="text-sm text-slate-500">Loading...</span>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
