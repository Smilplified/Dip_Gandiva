"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LockOutlined } from "@ant-design/icons";

export default function NoAccessPage() {
  const router = useRouter();
  const { signOut, user, getDefaultRedirect } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleGoToDashboard = () => {
    router.push(getDefaultRedirect());
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    router.replace("/login");
    setSigningOut(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <LockOutlined className="text-2xl text-amber-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-800">Access Denied</h1>
          <p className="text-slate-500 mt-2 text-sm">
            You don&apos;t have permission to view this page.
          </p>
          {user && (
            <p className="text-slate-400 mt-1 text-xs">
              Signed in as {user.email}
            </p>
          )}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleGoToDashboard}
              className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
            >
              Go to my dashboard
            </button>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="px-4 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition disabled:opacity-70 disabled:cursor-wait"
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
