"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShoppingCartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addCartItem } from "@/lib/commerce/cart-api";
import { resolveCartAccess } from "@/lib/commerce/cart-owner";
import { presentCartError } from "@/lib/commerce/cart-presentation";
import { queryKeys } from "@/lib/query/query-keys";
import { sessionQueryOptions } from "@/lib/query/session-query";
import styles from "./AddToCartButton.module.css";

export function AddToCartButton({
  listingId,
  inStock,
}: Readonly<{ listingId: string; inStock: boolean }>) {
  const session = useQuery(sessionQueryOptions());
  const queryClient = useQueryClient();
  const access = session.isPending || session.isError
    ? null
    : resolveCartAccess(session.data ?? null);
  const mutation = useMutation({
    mutationFn: () => addCartItem(listingId, 1),
    onSuccess: (cart) => {
      if (!access?.allowed) return;
      queryClient.setQueryData(
        queryKeys.commerce.cart(access.ownerKey),
        cart,
      );
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

  return (
    <div className={styles.wrapper}>
      <Button
        type="button"
        size="sm"
        disabled={!inStock || session.isPending || mutation.isPending}
        onClick={() => {
          mutation.reset();
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
      {failure ? (
        <span className={styles.error} role="alert">
          {failure.message}
        </span>
      ) : null}
    </div>
  );
}
