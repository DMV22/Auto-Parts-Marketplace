"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { CheckoutButton } from "@/components/checkout/CheckoutButton";
import { Button } from "@/components/ui/button";
import {
  clearCart,
  removeCartItem,
  updateCartItem,
} from "@/lib/commerce/cart-api";
import { resolveCartAccess } from "@/lib/commerce/cart-owner";
import { presentCartError } from "@/lib/commerce/cart-presentation";
import type { CartView } from "@/lib/commerce/cart-types";
import { formatMoney } from "@/lib/catalog/catalog-presentation";
import { cartQueryOptions } from "@/lib/query/commerce-queries";
import { queryKeys } from "@/lib/query/query-keys";
import { sessionQueryOptions } from "@/lib/query/session-query";
import { CartItem } from "./CartItem";
import styles from "./CartBoundary.module.css";

export function CartBoundary({ compact = false }: Readonly<{ compact?: boolean }>) {
  const session = useQuery(sessionQueryOptions());
  const access = session.isPending || session.isError
    ? null
    : resolveCartAccess(session.data ?? null);
  const ownerKey = access?.allowed ? access.ownerKey : null;
  const cart = useQuery(cartQueryOptions(ownerKey));
  const queryClient = useQueryClient();

  function storeCart(nextCart: CartView) {
    if (!ownerKey) return;
    queryClient.setQueryData(queryKeys.commerce.cart(ownerKey), nextCart);
  }

  function refreshCart() {
    if (!ownerKey) return;
    void queryClient.invalidateQueries({
      queryKey: queryKeys.commerce.cart(ownerKey),
    });
  }

  const updateItem = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      updateCartItem(itemId, quantity),
    onMutate: () => {
      removeItem.reset();
    },
    onSuccess: storeCart,
    onError: refreshCart,
  });
  const removeItem = useMutation({
    mutationFn: (itemId: string) => removeCartItem(itemId),
    onMutate: () => {
      updateItem.reset();
    },
    onSuccess: storeCart,
    onError: refreshCart,
  });
  const clear = useMutation({
    mutationFn: clearCart,
    onSuccess: storeCart,
    onError: refreshCart,
  });
  const cartMutationPending =
    updateItem.isPending || removeItem.isPending || clear.isPending;

  if (session.isPending) {
    return <p role="status">Перевіряємо доступ до кошика…</p>;
  }

  if (session.isError) {
    return (
      <CartFailure
        title="Не вдалося перевірити сесію"
        message="Оновіть стан сесії та спробуйте відкрити кошик ще раз."
        onRetry={() => void session.refetch()}
      />
    );
  }

  if (!access?.allowed) {
    return (
      <section className={styles.state} aria-labelledby="cart-denied-title">
        <h2 id="cart-denied-title">Кошик недоступний для цієї ролі</h2>
        <p>Для покупок використайте Customer-акаунт або гостьовий режим.</p>
      </section>
    );
  }

  if (cart.isPending) {
    return <p role="status">Завантажуємо кошик…</p>;
  }

  if (cart.isError || !cart.data) {
    const failure = presentCartError(cart.error);
    return (
      <CartFailure
        title={failure.title}
        message={failure.message}
        onRetry={() => void cart.refetch()}
      />
    );
  }

  if (cart.data.items.length === 0) {
    return (
      <section className={styles.state} aria-labelledby="empty-cart-title">
        <h2 id="empty-cart-title">Кошик порожній</h2>
        <p>Оберіть конкретну пропозицію постачальника на сторінці товару.</p>
        <Link className={styles.primaryLink} href="/catalog">
          Перейти до каталогу
        </Link>
      </section>
    );
  }

  const clearFailure = clear.error ? presentCartError(clear.error) : null;
  const checkoutBlocked = cart.data.items.some((item) => !item.available);

  return (
    <div className={styles.cart} data-compact={compact || undefined}>
      <ul className={styles.items}>
        {cart.data.items.map((item) => {
          const updateFailure =
            updateItem.error && updateItem.variables?.itemId === item.id
              ? presentCartError(updateItem.error).message
              : null;
          const removeFailure =
            removeItem.error && removeItem.variables === item.id
              ? presentCartError(removeItem.error).message
              : null;

          return (
            <CartItem
              key={item.id}
              item={item}
              pending={cartMutationPending}
              mutationError={updateFailure ?? removeFailure}
              onQuantityChange={(quantity) =>
                updateItem.mutate({ itemId: item.id, quantity })
              }
              onRemove={() => removeItem.mutate(item.id)}
            />
          );
        })}
      </ul>

      <section className={styles.summary} aria-labelledby="cart-summary-title">
        <div>
          <h2 id="cart-summary-title">Разом</h2>
          <p>{cart.data.totalQuantity} од.</p>
        </div>
        <strong>
          {cart.data.currency
            ? formatMoney(cart.data.totalAmount, cart.data.currency)
            : cart.data.totalAmount}
        </strong>
      </section>

      {clearFailure ? (
        <p className={styles.error} role="alert">
          {clearFailure.message}
        </p>
      ) : null}

      <div className={styles.footerActions}>
        <Button
          type="button"
          variant="outline"
          disabled={cartMutationPending}
          onClick={() => clear.mutate()}
        >
          {clear.isPending ? "Очищаємо…" : "Очистити кошик"}
        </Button>
        <CheckoutButton
          disabled={cartMutationPending || checkoutBlocked}
          onConflict={refreshCart}
        />
      </div>
    </div>
  );
}

function CartFailure({
  title,
  message,
  onRetry,
}: Readonly<{ title: string; message: string; onRetry: () => void }>) {
  return (
    <section className={styles.state} aria-labelledby="cart-error-title">
      <h2 id="cart-error-title">{title}</h2>
      <p role="alert">{message}</p>
      <Button type="button" variant="outline" onClick={onRetry}>
        Спробувати ще раз
      </Button>
    </section>
  );
}
