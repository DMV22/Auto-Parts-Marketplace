"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { AppError } from "@/lib/api/app-error";
import type { OrderStatus } from "@/lib/commerce/checkout-types";
import {
  cancelCustomerReturn,
  createCustomerReturn,
} from "@/lib/commerce/return-api";
import {
  canCancelReturn,
  canCreateReturn,
  presentReturnError,
  presentReturnStatus,
} from "@/lib/commerce/return-presentation";
import { formatOrderDate } from "@/lib/commerce/order-presentation";
import {
  customerReturnsQueryOptions,
  invalidateReturnState,
} from "@/lib/query/commerce-queries";
import { sessionQueryOptions } from "@/lib/query/session-query";
import styles from "./orders.module.css";

type ReturnItemPanelProps = {
  orderId: string;
  orderItemId: string;
  orderStatus: OrderStatus;
};

export function ReturnItemPanel({
  orderId,
  orderItemId,
  orderStatus,
}: Readonly<ReturnItemPanelProps>) {
  const queryClient = useQueryClient();
  const session = useQuery(sessionQueryOptions());
  const isCustomer =
    session.data?.user.role === "CUSTOMER" && session.data.user.isActive;
  const isDelivered = orderStatus === "DELIVERED";
  const returns = useQuery(
    customerReturnsQueryOptions(
      orderId,
      orderItemId,
      Boolean(isCustomer && isDelivered),
    ),
  );
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmingCancellation, setConfirmingCancellation] = useState<
    string | null
  >(null);
  const reasonId = useId();
  const feedbackId = useId();

  async function refreshReturns() {
    await invalidateReturnState(queryClient, orderId, orderItemId);
  }

  const createReturn = useMutation({
    mutationFn: (returnReason: string) =>
      createCustomerReturn(orderId, orderItemId, returnReason),
    onSuccess: async () => {
      setReason("");
      setFeedback("Запит на повернення створено.");
      await refreshReturns();
    },
    onError: async (error) => {
      setFeedback(presentReturnError(error, "create"));
      if (error instanceof AppError && error.kind === "conflict") {
        await refreshReturns();
      }
    },
  });

  const cancelReturn = useMutation({
    mutationFn: (returnRequestId: string) =>
      cancelCustomerReturn(orderId, orderItemId, returnRequestId),
    onSuccess: async () => {
      setConfirmingCancellation(null);
      setFeedback("Запит на повернення скасовано.");
      await refreshReturns();
    },
    onError: async (error) => {
      setFeedback(presentReturnError(error, "cancel"));
      if (error instanceof AppError && error.kind === "conflict") {
        await refreshReturns();
      }
    },
  });

  if (session.isPending) {
    return <p role="status">Перевіряємо доступність повернення…</p>;
  }

  if (!session.data) {
    return (
      <section className={styles.returnPanel} aria-label="Повернення товару">
        <h4>Повернення товару</h4>
        <p>
          Для Guest-замовлення self-service повернення недоступне. Зверніться
          до служби підтримки через погоджений контактний канал магазину.
        </p>
      </section>
    );
  }

  if (!isCustomer) return null;

  if (!isDelivered) {
    return (
      <section className={styles.returnPanel} aria-label="Повернення товару">
        <h4>Повернення товару</h4>
        <p>Запит можна створити після переходу замовлення у статус «Доставлено».</p>
      </section>
    );
  }

  if (returns.isPending) {
    return <p role="status">Завантажуємо повернення…</p>;
  }

  if (returns.isError || !returns.data) {
    return (
      <section className={styles.returnPanel} aria-label="Повернення товару">
        <p role="alert">{presentReturnError(returns.error)}</p>
        <Button type="button" variant="outline" onClick={() => void returns.refetch()}>
          Повторити запит
        </Button>
      </section>
    );
  }

  const statuses = returns.data.data.map((request) => request.status);
  const creationAllowed = canCreateReturn(orderStatus, statuses);
  const mutationPending = createReturn.isPending || cancelReturn.isPending;

  function submitReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      setFeedback("Опишіть причину повернення.");
      return;
    }
    setFeedback(null);
    createReturn.mutate(normalizedReason);
  }

  return (
    <section className={styles.returnPanel} aria-label="Повернення товару">
      <h4>Повернення товару</h4>
      {returns.data.data.length > 0 ? (
        <ul className={styles.returnList}>
          {returns.data.data.map((request) => {
            const status = presentReturnStatus(request.status);
            return (
              <li key={request.id} className={styles.returnRequest}>
                <div>
                  <strong>{status.label}</strong>
                  <time dateTime={request.createdAt}>
                    {formatOrderDate(request.createdAt)}
                  </time>
                </div>
                <p>{request.reason}</p>
                {request.decisionReason ? (
                  <p>Рішення підтримки: {request.decisionReason}</p>
                ) : null}
                {canCancelReturn(request.status) ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={mutationPending}
                      aria-expanded={confirmingCancellation === request.id}
                      aria-controls={`cancel-return-${request.id}`}
                      onClick={() => setConfirmingCancellation(request.id)}
                    >
                      Скасувати запит
                    </Button>
                    {confirmingCancellation === request.id ? (
                      <div className={styles.returnConfirmation} aria-live="polite">
                        <div id={`cancel-return-${request.id}`}>
                          <strong>Скасувати цей запит?</strong>
                          <span>Після скасування його статус буде оновлено.</span>
                        </div>
                        <div>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={mutationPending}
                            onClick={() => setConfirmingCancellation(null)}
                          >
                            Залишити запит
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            disabled={mutationPending}
                            onClick={() => cancelReturn.mutate(request.id)}
                          >
                            {cancelReturn.isPending
                              ? "Скасовуємо…"
                              : "Підтвердити скасування"}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {creationAllowed ? (
        <form className={styles.returnForm} onSubmit={submitReturn}>
          <label htmlFor={reasonId}>Причина повернення</label>
          <textarea
            id={reasonId}
            value={reason}
            maxLength={1000}
            rows={4}
            disabled={mutationPending}
            aria-describedby={feedback ? feedbackId : undefined}
            onChange={(event) => setReason(event.target.value)}
          />
          <Button type="submit" disabled={mutationPending || reason.trim().length === 0}>
            {createReturn.isPending ? "Створюємо…" : "Створити запит"}
          </Button>
        </form>
      ) : null}

      {feedback ? (
        <p id={feedbackId} className={styles.returnFeedback} aria-live="polite">
          {feedback}
        </p>
      ) : null}
    </section>
  );
}
