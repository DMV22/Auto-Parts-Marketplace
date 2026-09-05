import type { ReactNode } from "react";
import { CarFrontIcon, PackageSearchIcon, ShieldCheckIcon } from "lucide-react";
import styles from "./auth-page-shell.module.css";

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className={styles.main}>
      <div className={styles.layout}>
        <div className={styles.formSlot}>{children}</div>
        <aside className={styles.context} aria-labelledby="auth-context-title">
          <p className={styles.eyebrow}>Точність починається з автомобіля</p>
          <h2 id="auth-context-title">Ваші запчастини. Ваш гараж. Один кабінет.</h2>
          <p className={styles.intro}>
            Збережіть автомобіль, перевіряйте сумісність і повертайтеся до
            історії замовлень у будь-який момент.
          </p>
          <ul>
            <li>
              <CarFrontIcon aria-hidden="true" />
              <span><strong>Активне авто</strong> застосовується до каталогу та PDP.</span>
            </li>
            <li>
              <PackageSearchIcon aria-hidden="true" />
              <span><strong>Fitment-відповідь</strong> надходить із каталогу, а не визначається браузером.</span>
            </li>
            <li>
              <ShieldCheckIcon aria-hidden="true" />
              <span><strong>Сесія</strong> працює через захищену серверну cookie.</span>
            </li>
          </ul>
        </aside>
      </div>
    </main>
  );
}
