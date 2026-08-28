import Link from "next/link";
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { conditionLabel, formatMoney } from "@/lib/catalog/catalog-presentation";
import { presentCartIssue } from "@/lib/commerce/cart-presentation";
import type { CartItemView } from "@/lib/commerce/cart-types";
import styles from "./CartItem.module.css";

export function CartItem({
  item,
  pending,
  mutationError,
  onQuantityChange,
  onRemove,
}: Readonly<{
  item: CartItemView;
  pending: boolean;
  mutationError: string | null;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}>) {
  const productName = item.listing.productVariant.product.name;

  return (
    <li className={styles.item} aria-busy={pending}>
      <div className={styles.heading}>
        <div>
          <Link href={`/products/${item.listing.productVariant.product.id}`}>
            {productName}
          </Link>
          <p>
            <span translate="no">{item.listing.productVariant.sku}</span>
            {" · "}
            {conditionLabel(item.listing.condition)}
          </p>
        </div>
        <strong>{formatMoney(item.lineTotal, item.listing.currency)}</strong>
      </div>

      <p className={styles.supplier}>{item.listing.supplier.name}</p>

      {item.issues.length > 0 ? (
        <div className={styles.issues} role="status">
          {item.issues.map((issue) => {
            const presentation = presentCartIssue(issue);
            return (
              <div key={issue}>
                <strong>{presentation.title}</strong>
                <span>{presentation.message}</span>
              </div>
            );
          })}
        </div>
      ) : null}

      {mutationError ? (
        <p className={styles.error} role="alert">
          {mutationError}
        </p>
      ) : null}

      <div className={styles.actions}>
        <div className={styles.quantity} aria-label={`Кількість ${productName}`}>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={pending || item.quantity <= 1}
            aria-label={`Зменшити кількість ${productName}`}
            onClick={() => onQuantityChange(item.quantity - 1)}
          >
            <MinusIcon aria-hidden="true" />
          </Button>
          <output aria-live="polite">{item.quantity}</output>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={pending || !item.listing.inStock}
            aria-label={`Збільшити кількість ${productName}`}
            onClick={() => onQuantityChange(item.quantity + 1)}
          >
            <PlusIcon aria-hidden="true" />
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={onRemove}
          aria-label={`Видалити ${productName} з кошика`}
        >
          <Trash2Icon data-icon="inline-start" aria-hidden="true" />
          Видалити
        </Button>
      </div>
    </li>
  );
}
