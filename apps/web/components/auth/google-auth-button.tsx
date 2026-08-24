"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authErrorMessage } from "@/lib/auth/auth-error";
import { signInWithGoogle } from "@/lib/auth/auth-api";
import styles from "./auth-form.module.css";

export function GoogleAuthButton({ returnTo }: { returnTo: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleGoogleSignIn() {
    setError(null);
    setIsPending(true);

    try {
      const authorizationUrl = await signInWithGoogle(returnTo);
      window.location.assign(authorizationUrl);
    } catch (caughtError) {
      setError(authErrorMessage(caughtError));
      setIsPending(false);
    }
  }

  return (
    <div className={styles.alternative}>
      <Button
        type="button"
        variant="outline"
        disabled={isPending}
        onClick={handleGoogleSignIn}
      >
        {isPending ? "Переходимо до Google…" : "Продовжити з Google"}
      </Button>
      {error ? (
        <p
          className={styles.globalError}
          role="alert"
          aria-label="Не вдалося почати вхід через Google"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
