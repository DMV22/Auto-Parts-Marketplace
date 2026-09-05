"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShoppingCartIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { addCartItem } from "@/lib/commerce/cart-api";
import { resolveCartAccess } from "@/lib/commerce/cart-owner";
import { presentCartError } from "@/lib/commerce/cart-presentation";
import { cartQueryOptions } from "@/lib/query/commerce-queries";
import { queryKeys } from "@/lib/query/query-keys";
import { sessionQueryOptions } from "@/lib/query/session-query";
import styles from "./AddToCartButton.module.css";

export function AddToCartButton({
  listingId,
  currency,
  inStock,
}: Readonly<{ listingId: string; currency: string; inStock: boolean }>) {
  const [currencyConflictAttempted, setCurrencyConflictAttempted] =
    useState(false);
  const session = useQuery(sessionQueryOptions());
  const queryClient = useQueryClient();
  const access = session.isPending || session.isError
    ? null
    : resolveCartAccess(session.data ?? null);
  const ownerKey = access?.allowed ? access.ownerKey : null;
  const cart = useQuery(cartQueryOptions(ownerKey));
  const cartCurrency = cart.data?.currency ?? null;
  const hasCurrencyConflict = Boolean(
    cartCurrency && cartCurrency !== currency,
  );
  const mutation = useMutation({
    mutationFn: () => addCartItem(listingId, 1),
    onSuccess: (cart) => {
      if (!ownerKey) return;
      queryClient.setQueryData(
        queryKeys.commerce.cart(ownerKey),
        cart,
      );
    },
    onError: () => {
      setCurrencyConflictAttempted(true);
      if (!ownerKey) return;
      void queryClient.invalidateQueries({
        queryKey: queryKeys.commerce.cart(ownerKey),
      });
    },
  });

  if (access && !access.allowed) {
    return (
      <Button type="button" size="sm" variant="outline" disabled>
        Кошик лише для Customer
      </Button>
    );
  }

  const failure = mutation.error ? presentCartError(mutation.error) : null;
  const showCurrencyConflict =
    currencyConflictAttempted && hasCurrencyConflict && cartCurrency;

  return (
    <div className={styles.wrapper}>
      <Button
        type="button"
        size="sm"
        disabled={
          !inStock || session.isPending || cart.isPending || mutation.isPending
        }
        onClick={() => {
          mutation.reset();
          if (hasCurrencyConflict) {
            setCurrencyConflictAttempted(true);
            return;
          }
          setCurrencyConflictAttempted(false);
          mutation.mutate();
        }}
      >
        <ShoppingCartIcon data-icon="inline-start" aria-hidden="true" />
        {!inStock
          ? "Немає в наявності"
          : mutation.isPending
            ? "Додаємо…"
            : "Додати в кошик"}
      </Button>
      {mutation.isSuccess ? (
        <span className={styles.success} role="status">
          Додано до кошика
        </span>
      ) : null}
      {failure && !showCurrencyConflict ? (
        <span className={styles.error} role="alert">
          {failure.message}
        </span>
      ) : null}
      {showCurrencyConflict ? (
        <span className={styles.currencyConflict} role="alert">
          У кошику вже є товари в {cartCurrency}. Щоб додати пропозицію в {currency},
          спочатку очистіть кошик.
          <Link href="/cart">Перейти до кошика</Link>
        </span>
      ) : null}
    </div>
  );
}
