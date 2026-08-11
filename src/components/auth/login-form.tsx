"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { connectFirebaseAuthEmulator, getFirebaseAuth, googleProvider } from "@/lib/firebase/client";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/domain/constants";
import { Button } from "@/components/ui/button";

export function LoginForm(): React.ReactElement {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn(): Promise<void> {
    setError(null);
    setLoading(true);
    connectFirebaseAuthEmulator();

    try {
      const credential = await signInWithPopup(getFirebaseAuth(), googleProvider);
      const idToken = await credential.user.getIdToken();
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id_token: idToken }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Unable to create a server session.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-xs ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10">
      <div className="mb-8">
        <div className="mb-6 grid h-10 w-10 place-items-center rounded-lg bg-zinc-950 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950">G</div>
        <h1 className="text-2xl/8 font-semibold tracking-tight text-zinc-950 dark:text-white">Sign in to Green Room GRC</h1>
        <p className="mt-3 text-sm/6 text-zinc-600 dark:text-zinc-400">Use your Google Workspace account. Access is restricted to @{ALLOWED_EMAIL_DOMAIN} users.</p>
      </div>

      {error ? <div className="mb-4 rounded-lg bg-red-500/15 p-3 text-sm/6 font-medium text-red-700 ring-1 ring-red-500/20 dark:text-red-400">{error}</div> : null}

      <Button type="button" className="w-full" onClick={signIn} disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Continue with Google
      </Button>
    </div>
  );
}
