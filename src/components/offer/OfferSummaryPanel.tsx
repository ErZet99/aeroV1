import { useTranslation } from 'react-i18next';
import type { OfferSummary as Summary } from '@/services/offerDocument';
import { formatPln, round2 } from '@/lib/money';
import { Input } from '@/components/ui/input';

interface OfferSummaryProps {
  summary: Summary;
  showMargin: boolean;
  /** Whole-offer discount amount (PLN). */
  rabatOgolny: number;
  onRabatOgolnyChange?: (value: number) => void;
  readOnly?: boolean;
}

/**
 * Commercial roll-up: Suma → Marża globalna (read-only Σ zysku) → Rabat ogólny (kwota) → Razem.
 * Marża globalna never feeds Razem; it only reports the profit already inside line prices.
 */
export function OfferSummaryPanel({
  summary,
  showMargin,
  rabatOgolny,
  onRabatOgolnyChange,
  readOnly = false,
}: OfferSummaryProps) {
  const { t } = useTranslation();

  return (
    <div className="ml-auto flex w-80 flex-col gap-2 border-t pt-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{t('offer.suma')}</span>
        <span>{formatPln(summary.suma)}</span>
      </div>
      {showMargin && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t('offer.marzaGlobalna')}</span>
          <span>{formatPln(summary.marzaKwota)}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground">{t('offer.rabatOgolny')}</span>
        {readOnly ? (
          <span>−{formatPln(summary.rabatKwota)}</span>
        ) : (
          <Input
            type="number"
            step="0.01"
            min={0}
            className="w-32"
            value={rabatOgolny}
            onChange={(e) => onRabatOgolnyChange?.(round2(Number(e.target.value) || 0))}
          />
        )}
      </div>
      <div className="flex items-center justify-between border-t pt-2 font-semibold">
        <span>{t('offer.razem')}</span>
        <span>{formatPln(summary.razem)}</span>
      </div>
    </div>
  );
}
