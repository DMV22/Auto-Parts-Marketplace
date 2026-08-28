import type { ReactNode } from "react";
import styles from "./auth-page-shell.module.css";

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className={styles.main}>
      {children}
    </main>
  );
}
