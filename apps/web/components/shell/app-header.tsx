"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { SupplierWorkspaceLink } from "@/components/supplier/SupplierWorkspaceLink";
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
import { signOut } from "@/lib/auth/auth-api";
import type { AuthSession, UserRole } from "@/lib/auth/session";
import { queryKeys } from "@/lib/query/query-keys";
import { sessionQueryOptions } from "@/lib/query/session-query";
import { AccountMenu } from "./AccountMenu";
import styles from "./app-header.module.css";

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Адміністратор",
  CUSTOMER: "Клієнт",
  SUPPORT_MANAGER: "Підтримка",
  SUPPLIER_USER: "Постачальник",
};

type HeaderLinkProps = {
  href: string;
  label: string;
  pathname: string;
  className?: string;
};

function routeIsActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === href;
  if (href === "/catalog") {
    return pathname === href || pathname.startsWith("/products/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function HeaderLink({
  href,
  label,
  pathname,
  className = styles.navigationLink,
}: HeaderLinkProps) {
  return (
    <Link
      className={className}
      href={href}
      aria-current={routeIsActive(pathname, href) ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

function Identity({ session }: { session: AuthSession }) {
  return (
    <span className={styles.identity}>
      <strong>{session.user.name}</strong>
      <span>{roleLabels[session.user.role]}</span>
      {!session.user.isActive ? (
        <span className={styles.inactive}>Акаунт неактивний</span>
      ) : null}
    </span>
  );
}

type SessionNavigationProps = {
  session: AuthSession;
  pathname: string;
  mobile?: boolean;
};

function SessionNavigation({
  session,
  pathname,
  mobile = false,
}: SessionNavigationProps) {
  const linkClassName = mobile
    ? styles.mobileNavigationLink
    : styles.workspaceLink;

  if (!session.user.isActive) return null;

  if (session.user.role === "CUSTOMER") return null;

  if (session.user.role === "SUPPLIER_USER") {
    return <SupplierWorkspaceLink className={linkClassName} />;
  }

  if (session.user.role === "SUPPORT_MANAGER") {
    const internalLink = (
      <HeaderLink
        href="/internal/orders"
        label="Internal Ops"
        pathname={pathname}
        className={linkClassName}
      />
    );
    return mobile ? <SheetClose render={internalLink} /> : internalLink;
  }

  if (session.user.role === "ADMIN") {
    const internalLink = (
      <HeaderLink
        href="/internal/orders"
        label="Internal Ops"
        pathname={pathname}
        className={linkClassName}
      />
    );
    const moderationLink = (
      <HeaderLink
        href="/admin/moderation"
        label="Модерація"
        pathname={pathname}
        className={linkClassName}
      />
    );

    return mobile ? (
      <>
        <SheetClose render={internalLink} />
        <SheetClose render={moderationLink} />
      </>
    ) : (
      <>
        {internalLink}
        {moderationLink}
      </>
    );
  }

  return null;
}

export function AppHeader() {
  const session = useQuery(sessionQueryOptions());
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const router = useRouter();
  const [signOutError, setSignOutError] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const showShoppingLinks =
    !session.isPending &&
    !session.isError &&
    (!session.data ||
      (session.data.user.role === "CUSTOMER" && session.data.user.isActive));

  async function handleSignOut() {
    setSignOutError(false);
    setIsSigningOut(true);

    try {
      await signOut();
      queryClient.removeQueries();
      queryClient.setQueryData(queryKeys.auth.session, null);
      router.refresh();
    } catch {
      setSignOutError(true);
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <header className={styles.header}>
      <nav className={styles.navigation} aria-label="Основна навігація">
        <Link
          className={styles.brand}
          href="/"
          aria-label="Auto Parts Marketplace — головна"
          aria-current={pathname === "/" ? "page" : undefined}
        >
          <span>AUTO</span>
          <span className={styles.brandAccent}>PARTS</span>
        </Link>

        <div className={styles.desktopShoppingNavigation}>
          <HeaderLink href="/catalog" label="Каталог" pathname={pathname} />
          {showShoppingLinks ? (
            <>
              <HeaderLink href="/garage" label="Гараж" pathname={pathname} />
              <HeaderLink href="/orders" label="Замовлення" pathname={pathname} />
            </>
          ) : null}
        </div>

        <div className={styles.utilities}>
          <CartDrawer />

          <div className={styles.desktopSessionArea}>
            {session.isPending ? (
              <span role="status" className={styles.status}>
                Перевіряємо сесію…
              </span>
            ) : session.isError ? (
              <span role="status" className={styles.status}>
                Сесія тимчасово недоступна
              </span>
            ) : session.data ? (
              <AccountMenu
                session={session.data}
                pathname={pathname}
                isSigningOut={isSigningOut}
                onSignOut={handleSignOut}
              />
            ) : (
              <div className={styles.actions}>
                <HeaderLink
                  href="/sign-in"
                  label="Увійти"
                  pathname={pathname}
                  className={styles.authLink}
                />
                <HeaderLink
                  href="/sign-up"
                  label="Створити акаунт"
                  pathname={pathname}
                  className={styles.primaryLink}
                />
              </div>
            )}
          </div>

          <Sheet>
            <SheetTrigger
              render={
                <Button
                  className={styles.mobileMenuTrigger}
                  variant="outline"
                  size="icon-lg"
                  aria-label="Відкрити меню"
                />
              }
            >
              <MenuIcon aria-hidden="true" />
            </SheetTrigger>
            <SheetContent className={styles.mobileMenu} side="right">
              <SheetHeader>
                <SheetTitle>Навігація</SheetTitle>
                <SheetDescription>
                  Каталог, ваш автомобіль і доступний робочий простір.
                </SheetDescription>
              </SheetHeader>

              <div className={styles.mobileMenuBody}>
                <nav aria-label="Мобільна навігація">
                  <SheetClose
                    render={
                      <HeaderLink
                        href="/catalog"
                        label="Каталог"
                        pathname={pathname}
                        className={styles.mobileNavigationLink}
                      />
                    }
                  />
                  {showShoppingLinks ? (
                    <>
                      <SheetClose
                        render={
                          <HeaderLink
                            href="/garage"
                            label="Гараж"
                            pathname={pathname}
                            className={styles.mobileNavigationLink}
                          />
                        }
                      />
                      <SheetClose
                        render={
                          <HeaderLink
                            href="/orders"
                            label="Замовлення"
                            pathname={pathname}
                            className={styles.mobileNavigationLink}
                          />
                        }
                      />
                    </>
                  ) : null}
                </nav>

                <div className={styles.mobileAccountSection}>
                  {session.isPending ? (
                    <span role="status" className={styles.status}>
                      Перевіряємо сесію…
                    </span>
                  ) : session.isError ? (
                    <span role="status" className={styles.status}>
                      Сесія тимчасово недоступна
                    </span>
                  ) : session.data ? (
                    <>
                      <Identity session={session.data} />
                      <SessionNavigation
                        session={session.data}
                        pathname={pathname}
                        mobile
                      />
                      {session.data.user.isActive ? (
                        <SheetClose
                          render={
                            <HeaderLink
                              href="/account/security"
                              label="Безпека акаунта"
                              pathname={pathname}
                              className={styles.mobileNavigationLink}
                            />
                          }
                        />
                      ) : null}
                      <SheetClose
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isSigningOut}
                            onClick={handleSignOut}
                          />
                        }
                      >
                        {isSigningOut ? "Виходимо…" : "Вийти"}
                      </SheetClose>
                    </>
                  ) : (
                    <div className={styles.mobileAuthActions}>
                      <SheetClose
                        render={
                          <HeaderLink
                            href="/sign-in"
                            label="Увійти"
                            pathname={pathname}
                            className={styles.mobileNavigationLink}
                          />
                        }
                      />
                      <SheetClose
                        render={
                          <HeaderLink
                            href="/sign-up"
                            label="Створити акаунт"
                            pathname={pathname}
                            className={styles.mobilePrimaryLink}
                          />
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {signOutError ? (
        <p className={styles.error} role="alert">
          Не вдалося завершити сесію. Спробуйте ще раз.
        </p>
      ) : null}
    </header>
  );
}
