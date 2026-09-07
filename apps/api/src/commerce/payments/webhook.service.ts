import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';
import {
  OrderStatus,
  OrderStatusEventSource,
  PaymentEventProcessingStatus,
} from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import type { VerifiedStripeWebhookEvent } from './webhook.gateway';
import type { StripeWebhookResponse } from './webhook.types';

const PAID_EVENTS = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
]);
const CANCELLED_EVENTS = new Set([
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
]);
const SUPPORTED_EVENTS = new Set([...PAID_EVENTS, ...CANCELLED_EVENTS]);

type WebhookDiagnosticContext = { requestId: string };
type WebhookProcessingOutcome = 'duplicate' | 'ignored' | 'processed';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(
    event: VerifiedStripeWebhookEvent,
    context: WebhookDiagnosticContext = { requestId: randomUUID() },
  ): Promise<StripeWebhookResponse> {
    const startedAt = Date.now();
    if (!SUPPORTED_EVENTS.has(event.type)) {
      this.logOutcome(event, context, 'ignored', startedAt);
      return { received: true };
    }

    try {
      const outcome = await this.prisma.$transaction(async (transaction) => {
        const duplicate = await transaction.paymentEvent.findUnique({
          where: { externalEventId: event.externalEventId },
          select: { id: true },
        });
        if (duplicate) return 'duplicate' as const;

        const session = event.checkoutSession;
        if (!session?.orderId) throw consistencyError();

        const order = await transaction.order.findUnique({
          where: { id: session.orderId },
          select: {
            id: true,
            status: true,
            currency: true,
            totalAmount: true,
            checkoutSessionId: true,
            reservationReleasedAt: true,
            items: { select: { listingId: true, quantity: true } },
          },
        });
        if (!order || !matchesCheckoutSession(order, session)) {
          throw consistencyError();
        }
        if (
          event.type === 'checkout.session.async_payment_succeeded' &&
          session.paymentStatus !== 'paid'
        ) {
          throw consistencyError();
        }

        const paymentEvent = await transaction.paymentEvent.create({
          data: {
            orderId: order.id,
            externalEventId: event.externalEventId,
            provider: 'STRIPE',
            eventType: event.type,
            status: PaymentEventProcessingStatus.PROCESSED,
            payload: toJson(event.payload),
            processedAt: new Date(),
          },
          select: { id: true },
        });

        if (PAID_EVENTS.has(event.type) && session.paymentStatus === 'paid') {
          const transitioned = await transaction.order.updateMany({
            where: { id: order.id, status: OrderStatus.PENDING_PAYMENT },
            data: { status: OrderStatus.PAID },
          });
          if (transitioned.count === 1) {
            await transaction.orderStatusEvent.create({
              data: {
                orderId: order.id,
                fromStatus: OrderStatus.PENDING_PAYMENT,
                toStatus: OrderStatus.PAID,
                source: OrderStatusEventSource.STRIPE_WEBHOOK,
                paymentEventId: paymentEvent.id,
              },
            });
          }
          return 'processed' as const;
        }

        if (CANCELLED_EVENTS.has(event.type)) {
          const transitioned = await transaction.order.updateMany({
            where: {
              id: order.id,
              status: OrderStatus.PENDING_PAYMENT,
              reservationReleasedAt: null,
            },
            data: {
              status: OrderStatus.CANCELLED,
              reservationReleasedAt: new Date(),
            },
          });
          if (transitioned.count === 0) return 'processed' as const;

          for (const item of order.items) {
            await transaction.listing.update({
              where: { id: item.listingId },
              data: {
                stockQuantity: { increment: item.quantity },
                inventoryVersion: { increment: 1 },
              },
            });
          }
          await transaction.orderStatusEvent.create({
            data: {
              orderId: order.id,
              fromStatus: OrderStatus.PENDING_PAYMENT,
              toStatus: OrderStatus.CANCELLED,
              source: OrderStatusEventSource.STRIPE_WEBHOOK,
              paymentEventId: paymentEvent.id,
            },
          });
        }

        return 'processed' as const;
      });
      this.logOutcome(event, context, outcome, startedAt);
    } catch (error: unknown) {
      if (hasPrismaCode(error, 'P2002')) {
        this.logOutcome(event, context, 'duplicate', startedAt);
        return { received: true };
      }
      this.logger.warn({
        message: 'stripe_webhook',
        requestId: context.requestId,
        eventId: event.externalEventId,
        eventType: event.type,
        outcome: 'retryable_failure',
        reason:
          error instanceof ServiceUnavailableException
            ? 'consistency_check_failed'
            : 'processing_error',
        durationMs: Date.now() - startedAt,
      });
      throw error;
    }

    return { received: true };
  }

  private logOutcome(
    event: VerifiedStripeWebhookEvent,
    context: WebhookDiagnosticContext,
    outcome: WebhookProcessingOutcome,
    startedAt: number,
  ): void {
    this.logger.log({
      message: 'stripe_webhook',
      requestId: context.requestId,
      eventId: event.externalEventId,
      eventType: event.type,
      outcome,
      durationMs: Date.now() - startedAt,
    });
  }
}

function matchesCheckoutSession(
  order: {
    currency: string;
    totalAmount: Prisma.Decimal;
    checkoutSessionId: string | null;
  },
  session: NonNullable<VerifiedStripeWebhookEvent['checkoutSession']>,
): boolean {
  return (
    !!session.id &&
    order.checkoutSessionId === session.id &&
    !!session.currency &&
    order.currency.toLowerCase() === session.currency.toLowerCase() &&
    session.amountTotal !== null &&
    toMinorUnits(order.totalAmount.toString()) === BigInt(session.amountTotal)
  );
}

function toMinorUnits(value: string): bigint {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
}

function toJson(payload: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
}

function consistencyError(): ServiceUnavailableException {
  return new ServiceUnavailableException(
    'Stripe webhook consistency check failed',
  );
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
