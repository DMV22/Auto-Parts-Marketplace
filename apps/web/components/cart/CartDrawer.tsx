"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ShoppingCartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { resolveCartAccess } from "@/lib/commerce/cart-owner";
import { cartQueryOptions } from "@/lib/query/commerce-queries";
import { sessionQueryOptions } from "@/lib/query/session-query";
import { CartBoundary } from "./CartBoundary";
import styles from "./CartDrawer.module.css";

function cartQuantityLabel(quantity: number): string {
  const remainder10 = quantity % 10;
  const remainder100 = quantity % 100;
  const noun =
    remainder10 === 1 && remainder100 !== 11
      ? "товар"
      : remainder10 >= 2 &&
          remainder10 <= 4 &&
          (remainder100 < 12 || remainder100 > 14)
        ? "товари"
        : "товарів";

  return `${quantity} ${noun}`;
}

export function CartDrawer() {
  const session = useQuery(sessionQueryOptions());
  const cartUnavailable = Boolean(
    session.data &&
      (!session.data.user.isActive || session.data.user.role !== "CUSTOMER"),
  );
  const cartAccess =
    session.isPending || session.isError || cartUnavailable
      ? null
      : resolveCartAccess(session.data ?? null);
  const cart = useQuery(
    cartQueryOptions(cartAccess?.allowed ? cartAccess.ownerKey : null),
  );
  const totalQuantity = cart.data?.totalQuantity ?? 0;
  const cartLabel =
    totalQuantity > 0 ? `Кошик, ${cartQuantityLabel(totalQuantity)}` : "Кошик";

  if (cartUnavailable) return null;

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            className={styles.trigger}
            variant="outline"
            size="icon-lg"
            disabled={session.isPending}
            aria-label={cartLabel}
            title="Кошик"
          />
        }
      >
        <ShoppingCartIcon aria-hidden="true" />
        {totalQuantity > 0 ? (
          <span className={styles.count} aria-hidden="true">
            {totalQuantity > 99 ? "99+" : totalQuantity}
          </span>
        ) : null}
      </SheetTrigger>
      <SheetContent className={styles.drawer} side="right">
        <SheetHeader>
          <SheetTitle>Кошик</SheetTitle>
          <SheetDescription>
            Перевірте товари та кількість перед переходом до оплати.
          </SheetDescription>
        </SheetHeader>
        <div className={styles.content}>
          <CartBoundary compact />
        </div>
        <SheetFooter>
          <Link className={styles.pageLink} href="/cart">
            Відкрити повну сторінку кошика
          </Link>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
