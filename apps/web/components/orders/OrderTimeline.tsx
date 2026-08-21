import { Button } from "@/components/ui/button";
import type { OrderTimelineResponse } from "@/lib/commerce/order-types";
import {
  formatOrderDate,
  presentOrderError,
  presentTimelineReason,
} from "@/lib/commerce/order-presentation";
import { OrderStatusBadge } from "./OrderStatusBadge";
import styles from "./orders.module.css";

type OrderTimelineProps = {
  timeline: OrderTimelineResponse | undefined;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  onNextPage: (cursor: string) => void;
};

export function OrderTimeline({
  timeline,
  isPending,
  error,
  onRetry,
  onNextPage,
}: Readonly<OrderTimelineProps>) {
  if (isPending) {
    return <p role="status">Завантажуємо історію статусів…</p>;
  }

  if (error || !timeline) {
    const failure = presentOrderError(error);
    return (
      <div className={styles.inlineState}>
        <p role="alert">{failure.message}</p>
        {failure.retryable ? (
          <Button type="button" variant="outline" onClick={onRetry}>
            Повторити запит
          </Button>
        ) : null}
      </div>
    );
  }

  if (timeline.data.length === 0) {
    return <p>Подій для цього замовлення поки немає.</p>;
  }

  return (
    <>
      <ol className={styles.timeline}>
        {timeline.data.map((event) => (
          <li key={event.id} className={styles.timelineEvent}>
            <div className={styles.timelineMarker} aria-hidden="true" />
            <div>
              <div className={styles.timelineHeading}>
                <strong>{presentTimelineReason(event.reasonCode)}</strong>
                <OrderStatusBadge status={event.status} />
              </div>
              <time dateTime={event.occurredAt}>
                {formatOrderDate(event.occurredAt)}
              </time>
            </div>
          </li>
        ))}
      </ol>
      {timeline.pageInfo.hasNextPage && timeline.pageInfo.nextCursor ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => onNextPage(timeline.pageInfo.nextCursor!)}
        >
          Старіші події
        </Button>
      ) : null}
    </>
  );
}
