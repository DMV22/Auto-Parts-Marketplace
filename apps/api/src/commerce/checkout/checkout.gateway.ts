export const CHECKOUT_GATEWAY = Symbol('CHECKOUT_GATEWAY');

export interface CheckoutGatewayLineItem {
  name: string;
  currency: string;
  unitAmount: number;
  quantity: number;
}

export interface CreateCheckoutSessionCommand {
  orderId: string;
  idempotencyKey: string;
  expiresAt: Date;
  lineItems: CheckoutGatewayLineItem[];
}

export interface CheckoutGatewaySession {
  id: string;
  url: string;
  expiresAt: Date;
}

export interface CheckoutGateway {
  createSession(
    command: CreateCheckoutSessionCommand,
  ): Promise<CheckoutGatewaySession>;
}
