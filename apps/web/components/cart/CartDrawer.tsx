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
import { sessionQueryOptions } from "@/lib/query/session-query";
import { CartBoundary } from "./CartBoundary";
import styles from "./CartDrawer.module.css";

export function CartDrawer() {
  const session = useQuery(sessionQueryOptions());
  const activeNonCustomer =
    session.data?.user.isActive && session.data.user.role !== "CUSTOMER";

  if (activeNonCustomer) return null;

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="outline" size="sm" disabled={session.isPending} />
        }
      >
        <ShoppingCartIcon data-icon="inline-start" aria-hidden="true" />
        Кошик
      </SheetTrigger>
      <SheetContent className={styles.drawer} side="right">
        <SheetHeader>
          <SheetTitle>Кошик</SheetTitle>
          <SheetDescription>
            Ціни, валюта й доступність повторно перевіряються сервером.
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
