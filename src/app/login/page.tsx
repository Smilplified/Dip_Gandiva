"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="text-slate-500 text-sm">Redirecting to dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div
          data-login-card
          className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-10 overflow-hidden"
          style={{ boxSizing: "border-box" }}
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
              CRM Dashboard
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
            {error && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm w-full"
              >
                {error}
              </div>
            )}

            <div className="w-full min-w-0">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Email
              </label>
              <div className="relative w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <MailOutlined className="text-base" />
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full min-w-0 pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition text-slate-800 placeholder:text-slate-400"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="w-full min-w-0">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <LockOutlined className="text-base" />
                </span>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-w-0 pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition text-slate-800 placeholder:text-slate-400"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Secure login with Supabase Auth
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
          <div className="animate-pulse text-slate-400">Loading...</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
