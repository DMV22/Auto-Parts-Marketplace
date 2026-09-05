"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ActivityIcon,
  CarFrontIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  KeyRoundIcon,
  LogOutIcon,
  ShieldCheckIcon,
  Undo2Icon,
  WarehouseIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AuthSession, UserRole } from "@/lib/auth/session";
import { supplierMembershipQueryOptions } from "@/lib/query/supplier-queries";
import styles from "./AccountMenu.module.css";

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Адміністратор",
  CUSTOMER: "Клієнт",
  SUPPORT_MANAGER: "Підтримка",
  SUPPLIER_USER: "Постачальник",
};

type AccountMenuProps = {
  session: AuthSession;
  pathname: string;
  isSigningOut: boolean;
  onSignOut: () => Promise<void>;
};

function initialsFromName(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => Array.from(part)[0]?.toLocaleUpperCase("uk-UA") ?? "")
    .join("");

  return initials || "АП";
}

function menuRouteIsActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AccountMenuLink({
  href,
  label,
  pathname,
  icon: Icon,
}: Readonly<{
  href: string;
  label: string;
  pathname: string;
  icon: LucideIcon;
}>) {
  return (
    <DropdownMenuItem
      render={
        <Link
          href={href}
          aria-current={menuRouteIsActive(pathname, href) ? "page" : undefined}
        />
      }
    >
      <Icon aria-hidden="true" />
      {label}
    </DropdownMenuItem>
  );
}

export function AccountMenu({
  session,
  pathname,
  isSigningOut,
  onSignOut,
}: Readonly<AccountMenuProps>) {
  const membership = useQuery({
    ...supplierMembershipQueryOptions(),
    enabled:
      session.user.isActive && session.user.role === "SUPPLIER_USER",
  });
  const supplier = membership.data?.data;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            className={styles.trigger}
            type="button"
            variant="outline"
            aria-label={`Мій кабінет, ${session.user.name}`}
          />
        }
      >
        <Avatar size="sm" aria-hidden="true">
          <AvatarFallback className={styles.avatarFallback}>
            {initialsFromName(session.user.name)}
          </AvatarFallback>
        </Avatar>
        <span className={styles.triggerText}>
          <strong>Мій кабінет</strong>
          <span>{roleLabels[session.user.role]}</span>
        </span>
        <ChevronDownIcon className={styles.chevron} aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent className={styles.content} align="end" sideOffset={8}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className={styles.identity}>
            <strong>{session.user.name}</strong>
            <span>{roleLabels[session.user.role]}</span>
            {!session.user.isActive ? (
              <span className={styles.inactive}>Акаунт неактивний</span>
            ) : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        {session.user.isActive ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {session.user.role === "CUSTOMER" ? (
                <>
                  <AccountMenuLink
                    href="/garage"
                    label="Мій гараж"
                    pathname={pathname}
                    icon={CarFrontIcon}
                  />
                  <AccountMenuLink
                    href="/orders"
                    label="Мої замовлення"
                    pathname={pathname}
                    icon={ClipboardListIcon}
                  />
                </>
              ) : null}

              {session.user.role === "SUPPLIER_USER" ? (
                supplier?.status === "ACTIVE" ? (
                  <AccountMenuLink
                    href={`/supplier/${supplier.supplier.id}/listings`}
                    label="Кабінет постачальника"
                    pathname={pathname}
                    icon={WarehouseIcon}
                  />
                ) : (
                  <DropdownMenuItem disabled>
                    <WarehouseIcon aria-hidden="true" />
                    {membership.isPending
                      ? "Перевіряємо membership…"
                      : membership.isError
                        ? "Membership недоступний"
                        : "Membership неактивний"}
                  </DropdownMenuItem>
                )
              ) : null}

              {session.user.role === "SUPPORT_MANAGER" ||
              session.user.role === "ADMIN" ? (
                <>
                  <AccountMenuLink
                    href="/internal/orders"
                    label="Internal Orders"
                    pathname={pathname}
                    icon={ClipboardListIcon}
                  />
                  <AccountMenuLink
                    href="/internal/returns"
                    label="Повернення"
                    pathname={pathname}
                    icon={Undo2Icon}
                  />
                  <AccountMenuLink
                    href="/internal/activity"
                    label="Activity Log"
                    pathname={pathname}
                    icon={ActivityIcon}
                  />
                </>
              ) : null}

              {session.user.role === "ADMIN" ? (
                <AccountMenuLink
                  href="/admin/moderation"
                  label="Модерація"
                  pathname={pathname}
                  icon={ShieldCheckIcon}
                />
              ) : null}

              <AccountMenuLink
                href="/account/security"
                label="Безпека акаунта"
                pathname={pathname}
                icon={KeyRoundIcon}
              />
            </DropdownMenuGroup>
          </>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={isSigningOut}
            onClick={() => void onSignOut()}
          >
            <LogOutIcon aria-hidden="true" />
            {isSigningOut ? "Виходимо…" : "Вийти"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
