"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

export function useAdminApi() {
  const router = useRouter();

  return useCallback(async (url: string, options?: RequestInit) => {
    const response = await fetch(url, { cache: "no-store", ...options });
    if (response.status === 401) {
      router.push("/login");
      throw new Error("Unauthorized");
    }
    if (!response.ok) {
      let message = "Request failed";
      try {
        const body = await response.json() as { error?: string };
        message = body.error ?? message;
      } catch {
        // Ignore JSON parse failures and fall back to the default message.
      }
      throw new Error(message);
    }
    return response;
  }, [router]);
}
