import { apiRequest } from "@/lib/api/api-client";
import { AppError } from "@/lib/api/app-error";
import {
  cartResponseSchema,
  type CartResponse,
  type CartView,
} from "./cart-types";

function parseCart(payload: unknown): CartView {
  const result = cartResponseSchema.safeParse(payload);

  if (!result.success) {
    throw new AppError("Cart response does not match its contract", {
      kind: "invalid_response",
      details: result.error.flatten(),
    });
  }

  return result.data.data;
}

async function cartRequest(
  path: string,
  options?: Parameters<typeof apiRequest>[1],
): Promise<CartView> {
  const payload = await apiRequest<unknown>(path, options);
  return parseCart(payload);
}

export function getCart(signal?: AbortSignal): Promise<CartView> {
  return cartRequest("/api/v1/cart", { signal });
}

export function addCartItem(
  listingId: string,
  quantity: number,
): Promise<CartView> {
  return cartRequest("/api/v1/cart/items", {
    method: "POST",
    body: { listingId, quantity },
  });
}

export function updateCartItem(
  itemId: string,
  quantity: number,
): Promise<CartView> {
  return cartRequest(`/api/v1/cart/items/${itemId}`, {
    method: "PATCH",
    body: { quantity },
  });
}

export function removeCartItem(itemId: string): Promise<CartView> {
  return cartRequest(`/api/v1/cart/items/${itemId}`, { method: "DELETE" });
}

export function clearCart(): Promise<CartView> {
  return cartRequest("/api/v1/cart", { method: "DELETE" });
}

export function toCartResponse(cart: CartView): CartResponse {
  return { data: cart };
}
