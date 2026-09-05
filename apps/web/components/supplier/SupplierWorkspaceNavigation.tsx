"use client";

import {
  BoxesIcon,
  ClipboardListIcon,
  MenuIcon,
  PackageSearchIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import styles from "./supplier.module.css";

const navigationItems = [
  { segment: "listings", label: "Оголошення", icon: PackageSearchIcon },
  { segment: "inventory", label: "Залишки", icon: BoxesIcon },
  {
    segment: "order-items",
    label: "Позиції замовлень",
    icon: ClipboardListIcon,
  },
] as const;

export function SupplierWorkspaceNavigation({
  supplierId,
  supplierName,
  isAdmin,
}: Readonly<{
  supplierId: string;
  supplierName: string;
  isAdmin: boolean;
}>) {
  const pathname = usePathname();
  const navigation = (
    <SupplierNavigationLinks supplierId={supplierId} pathname={pathname} />
  );

  return (
    <>
      <aside className={styles.desktopSidebar} aria-label="Кабінет постачальника">
        <SupplierIdentity supplierName={supplierName} isAdmin={isAdmin} />
        {navigation}
      </aside>

      <div className={styles.mobileWorkspaceBar}>
        <div>
          <span>Кабінет постачальника</span>
          <strong>{supplierName}</strong>
        </div>
        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="icon-lg"
                aria-label="Відкрити навігацію кабінету постачальника"
              />
            }
          >
            <MenuIcon aria-hidden="true" />
          </SheetTrigger>
          <SheetContent className={styles.mobileWorkspaceSheet} side="left">
            <SheetHeader>
              <SheetTitle>Кабінет постачальника</SheetTitle>
              <SheetDescription>
                Оголошення, залишки та позиції замовлень постачальника.
              </SheetDescription>
            </SheetHeader>
            <SupplierIdentity supplierName={supplierName} isAdmin={isAdmin} />
            <SupplierNavigationLinks
              supplierId={supplierId}
              pathname={pathname}
              mobile
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

function SupplierIdentity({
  supplierName,
  isAdmin,
}: Readonly<{ supplierName: string; isAdmin: boolean }>) {
  return (
    <div className={styles.supplierIdentity}>
      <span className={styles.supplierMark} aria-hidden="true">
        <BoxesIcon />
      </span>
      <div>
        <span>{isAdmin ? "Прямий перегляд Admin" : "Активний постачальник"}</span>
        <strong>{supplierName}</strong>
      </div>
      {isAdmin ? (
        <ShieldCheckIcon className={styles.identityStatusIcon} aria-hidden="true" />
      ) : null}
    </div>
  );
}

function SupplierNavigationLinks({
  supplierId,
  pathname,
  mobile = false,
}: Readonly<{ supplierId: string; pathname: string; mobile?: boolean }>) {
  return (
    <nav className={styles.workspaceNav} aria-label="Розділи кабінету постачальника">
      {navigationItems.map(({ segment, label, icon: Icon }) => {
        const href = `/supplier/${supplierId}/${segment}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const link = (
          <Link href={href} aria-current={active ? "page" : undefined}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );

        return mobile ? (
          <SheetClose key={segment} render={link} />
        ) : (
          <span key={segment}>{link}</span>
        );
      })}
    </nav>
  );
}
