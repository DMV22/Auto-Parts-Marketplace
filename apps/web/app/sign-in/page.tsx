import type { Metadata } from "next";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { safeReturnTo } from "@/lib/auth/auth-navigation";

export const metadata: Metadata = { title: "Вхід | Auto Parts Marketplace" };

type SignInPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    returnTo?: string | string[];
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const parameters = await searchParams;
  const returnTo = safeReturnTo(
    typeof parameters.returnTo === "string" ? parameters.returnTo : null,
  );
  const oauthError =
    typeof parameters.error === "string" ? parameters.error : null;

  return (
    <AuthPageShell>
      <AuthFormShell
        title="Вхід до акаунта"
        description="Використайте email і пароль або продовжте через Google."
      >
        <SignInForm returnTo={returnTo} oauthError={oauthError} />
      </AuthFormShell>
    </AuthPageShell>
  );
}
