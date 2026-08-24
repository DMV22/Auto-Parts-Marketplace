import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import styles from "./auth-form.module.css";

type AuthFormShellProps = {
  children: ReactNode;
  description: string;
  title: string;
};

export function AuthFormShell({
  children,
  description,
  title,
}: AuthFormShellProps) {
  return (
    <Card className={styles.card}>
      <CardHeader>
        <CardTitle>
          <h1 className={styles.title}>{title}</h1>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
