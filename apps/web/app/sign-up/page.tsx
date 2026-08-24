import type { Metadata } from "next";
import { AuthFormShell } from "@/components/auth/auth-form-shell";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { safeReturnTo } from "@/lib/auth/auth-navigation";

export const metadata: Metadata = {
  title: "Реєстрація | Auto Parts Marketplace",
};

type SignUpPageProps = {
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const parameters = await searchParams;
  const returnTo = safeReturnTo(
    typeof parameters.returnTo === "string" ? parameters.returnTo : null,
  );

  return (
    <AuthPageShell>
      <AuthFormShell
        title="Створення акаунта"
        description="Новий акаунт отримує роль Customer. Інші ролі призначаються лише сервером."
      >
        <SignUpForm returnTo={returnTo} />
      </AuthFormShell>
    </AuthPageShell>
  );
}
