import { useTranslation } from 'react-i18next';
import type { OfferSummary as Summary } from '@/services/offerDocument';
import { formatPln } from '@/lib/money';

interface OfferSummaryProps {
  summary: Summary;
  showMargin: boolean;
}

/** Live commercial roll-up: suma → marża → rabat → razem. */
export function OfferSummaryPanel({ summary, showMargin }: OfferSummaryProps) {
  const { t } = useTranslation();

  return (
    <div className="ml-auto flex w-72 flex-col gap-1 border-t pt-3 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">{t('offer.suma')}</span>
        <span>{formatPln(summary.suma)}</span>
      </div>
      {showMargin && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t('offer.marzaKwota')}</span>
          <span>{formatPln(summary.marzaKwota)}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-muted-foreground">{t('offer.rabat')}</span>
        <span>−{formatPln(summary.rabatKwota)}</span>
      </div>
      <div className="flex justify-between border-t pt-1 font-semibold">
        <span>{t('offer.razem')}</span>
        <span>{formatPln(summary.razem)}</span>
      </div>
    </div>
  );
}
