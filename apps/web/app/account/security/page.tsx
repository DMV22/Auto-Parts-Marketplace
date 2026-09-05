import type { Metadata } from "next";
import { AccountSecurityPage } from "@/components/auth/account-security-page";

export const metadata: Metadata = {
  title: "Безпека акаунта | Auto Parts Marketplace",
};

type AccountSecurityRouteProps = {
  searchParams: Promise<{
    error?: string | string[];
    linkError?: string | string[];
    linked?: string | string[];
  }>;
};

export default async function AccountSecurityRoute({
  searchParams,
}: AccountSecurityRouteProps) {
  const parameters = await searchParams;

  return (
    <AccountSecurityPage
      linkFailed={
        parameters.linkError === "google" ||
        typeof parameters.error === "string"
      }
      linkSucceeded={parameters.linked === "google"}
    />
  );
}
