import type { FitmentPresentation } from "@/lib/catalog/fitment-presentation";
import { FitmentBadge } from "./FitmentBadge";
import styles from "./FitmentExplanation.module.css";

export function FitmentExplanation({
  presentation,
}: Readonly<{ presentation: FitmentPresentation }>) {
  return (
    <div className={styles.explanation} data-status={presentation.status}>
      <FitmentBadge
        status={presentation.status}
        label={presentation.label}
      />
      <p>{presentation.explanation}</p>
    </div>
  );
}
