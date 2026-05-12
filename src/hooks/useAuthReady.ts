"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";

/**
 * True when auth has settled AND we have an access token AND at least one paint
 * has passed so Chrome can attach same-origin cookies to subsequent `fetch()` calls.
 */
export function useAuthReady() {
  const { isInitialized, isLoading, user, session } = useAuth();
  const base = Boolean(
    isInitialized && !isLoading && user && session?.access_token
  );
  const [paintDeferred, setPaintDeferred] = useState(false);

  useEffect(() => {
    if (!base) {
      setPaintDeferred(false);
      return;
    }
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setPaintDeferred(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      setPaintDeferred(false);
    };
  }, [base, user?.id, session?.access_token]);

  return base && paintDeferred;
}
