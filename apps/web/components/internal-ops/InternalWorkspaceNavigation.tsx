"use client";

import {
  ClipboardListIcon,
  MenuIcon,
  RotateCcwIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  WrenchIcon,
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
import type { UserRole } from "@/lib/auth/session";
import styles from "./internal-ops.module.css";

const navigationItems = [
  { href: "/internal/orders", label: "Замовлення", icon: ClipboardListIcon },
  { href: "/internal/returns", label: "Повернення", icon: RotateCcwIcon },
  { href: "/internal/activity", label: "Журнал дій", icon: ScrollTextIcon },
] as const;

export function InternalWorkspaceNavigation({
  name,
  role,
}: Readonly<{ name: string; role: UserRole }>) {
  const pathname = usePathname();
  const isAdmin = role === "ADMIN";

  return (
    <>
      <aside className={styles.desktopSidebar} aria-label="Операційний центр">
        <InternalIdentity name={name} role={role} />
        <InternalNavigationLinks pathname={pathname} isAdmin={isAdmin} />
      </aside>

      <div className={styles.mobileWorkspaceBar}>
        <div>
          <span>Операційний центр</span>
          <strong>{name}</strong>
        </div>
        <Sheet>
          <SheetTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                aria-label="Відкрити навігацію операційного центру"
              />
            }
          >
            <MenuIcon aria-hidden="true" />
          </SheetTrigger>
          <SheetContent className={styles.mobileWorkspaceSheet} side="left">
            <SheetHeader>
              <SheetTitle>Операційний центр</SheetTitle>
              <SheetDescription>
                Замовлення, повернення, журнал дій і доступна Admin-модерація.
              </SheetDescription>
            </SheetHeader>
            <InternalIdentity name={name} role={role} />
            <InternalNavigationLinks
              pathname={pathname}
              isAdmin={isAdmin}
              mobile
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

function InternalIdentity({
  name,
  role,
}: Readonly<{ name: string; role: UserRole }>) {
  const isAdmin = role === "ADMIN";
  return (
    <div className={styles.operatorIdentity}>
      <span className={styles.operatorMark} aria-hidden="true">
        <WrenchIcon />
      </span>
      <div>
        <span>{isAdmin ? "Адміністратор" : "Менеджер підтримки"}</span>
        <strong>{name}</strong>
      </div>
      {isAdmin ? (
        <ShieldCheckIcon className={styles.identityStatusIcon} aria-hidden="true" />
      ) : null}
    </div>
  );
}

function InternalNavigationLinks({
  pathname,
  isAdmin,
  mobile = false,
}: Readonly<{ pathname: string; isAdmin: boolean; mobile?: boolean }>) {
  const links = (
    <>
      {navigationItems.map((item) => (
        <NavigationLink
          key={item.href}
          {...item}
          active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
          mobile={mobile}
        />
      ))}
      {isAdmin ? (
        <div className={styles.adminNavigationGroup}>
          <span>Тільки для Admin</span>
          <NavigationLink
            href="/admin/moderation"
            label="Модерація"
            icon={ShieldCheckIcon}
            active={pathname.startsWith("/admin/moderation")}
            mobile={mobile}
          />
        </div>
      ) : null}
    </>
  );

  return (
    <nav className={styles.workspaceNav} aria-label="Розділи операційного центру">
      {links}
    </nav>
  );
}

function NavigationLink({
  href,
  label,
  icon: Icon,
  active,
  mobile,
}: Readonly<{
  href: string;
  label: string;
  icon: typeof ClipboardListIcon;
  active: boolean;
  mobile: boolean;
}>) {
  const link = (
    <Link href={href} aria-current={active ? "page" : undefined}>
      <Icon aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );

  return mobile ? <SheetClose render={link} /> : link;
}
