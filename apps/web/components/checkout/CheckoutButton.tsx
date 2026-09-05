"use client";

import { useMutation } from "@tanstack/react-query";
import { useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { AppError } from "@/lib/api/app-error";
import {
  getOrCreateCheckoutAttemptKey,
  shouldReuseCheckoutAttempt,
} from "@/lib/commerce/checkout-attempt";
import { createCheckoutSession } from "@/lib/commerce/checkout-api";
import type { CheckoutSessionView } from "@/lib/commerce/checkout-types";
import { presentCartError } from "@/lib/commerce/cart-presentation";
import styles from "./CheckoutButton.module.css";

type CheckoutButtonProps = {
  disabled: boolean;
  onConflict?: () => void;
  requestCheckout?: (idempotencyKey: string) => Promise<CheckoutSessionView>;
  redirect?: (url: string) => void;
};

function redirectToStripe(url: string): void {
  window.location.assign(url);
}

export function CheckoutButton({
  disabled,
  onConflict,
  requestCheckout = createCheckoutSession,
  redirect = redirectToStripe,
}: Readonly<CheckoutButtonProps>) {
  const errorId = useId();
  const attemptKey = useRef<string | null>(null);
  const inFlight = useRef(false);
  const checkout = useMutation({
    mutationFn: async () => {
      attemptKey.current = getOrCreateCheckoutAttemptKey(attemptKey.current);
      const result = await requestCheckout(attemptKey.current);

      if (!result.checkoutSession?.url) {
        attemptKey.current = null;
        throw new AppError("Checkout session URL is missing", {
          kind: "invalid_response",
        });
      }

      return result.checkoutSession.url;
    },
    onSuccess: (checkoutUrl) => {
      redirect(checkoutUrl);
    },
    onError: (error) => {
      if (!shouldReuseCheckoutAttempt(error)) {
        attemptKey.current = null;
      }
      if (error instanceof AppError && error.kind === "conflict") {
        onConflict?.();
      }
    },
    onSettled: () => {
      inFlight.current = false;
    },
  });
  const failure = checkout.error ? presentCartError(checkout.error) : null;

  return (
    <div className={styles.checkoutAction}>
      <Button
        type="button"
        size="lg"
        disabled={disabled || checkout.isPending}
        aria-describedby={failure ? errorId : undefined}
        onClick={() => {
          if (inFlight.current) return;
          inFlight.current = true;
          checkout.mutate();
        }}
      >
        {checkout.isPending ? "Створюємо checkout…" : "Перейти до оплати"}
      </Button>
      <p className={styles.hint} aria-live="polite">
        {checkout.isPending
          ? "Створюємо одну безпечну спробу оплати. Не закривайте сторінку."
          : "Ціну, наявність і валюту буде повторно перевірено перед оплатою."}
      </p>
      {failure ? (
        <p id={errorId} className={styles.error} role="alert">
          {failure.message}
        </p>
      ) : null}
    </div>
  );
}
