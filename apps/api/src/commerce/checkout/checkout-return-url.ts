const STRIPE_CHECKOUT_SESSION_PLACEHOLDER = '{CHECKOUT_SESSION_ID}';

type CheckoutReturnUrlInput = {
  successUrl: string;
  cancelUrl: string;
  orderId: string;
};

export type CheckoutReturnUrls = {
  successUrl: string;
  cancelUrl: string;
};

export function buildCheckoutReturnUrls({
  successUrl,
  cancelUrl,
  orderId,
}: CheckoutReturnUrlInput): CheckoutReturnUrls {
  const success = withOrderId(successUrl, orderId);
  const cancel = withOrderId(cancelUrl, orderId);

  return {
    successUrl: `${success}&session_id=${STRIPE_CHECKOUT_SESSION_PLACEHOLDER}`,
    cancelUrl: cancel,
  };
}

function withOrderId(baseUrl: string, orderId: string): string {
  const url = new URL(baseUrl);
  url.searchParams.delete('orderId');
  url.searchParams.delete('session_id');
  url.searchParams.set('orderId', orderId);
  return url.toString();
}
