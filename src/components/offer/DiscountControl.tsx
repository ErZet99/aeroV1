import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as offerService from '@/api/offerService';
import { discountedTotal } from '@/api/offerService';
import type { RabatType } from '@/types/enums';
import type { Offer } from '@/types/models';
import { formatPln, round2 } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DiscountControlProps {
  offer: Offer;
  /** Sum of line wartość values (before discount). */
  total: number;
  onApplied: () => void;
}

export function DiscountControl({ offer, total, onApplied }: DiscountControlProps) {
  const { t } = useTranslation();

  const [rabatType, setRabatType] = useState<RabatType>('PROCENT');
  const [rabatValue, setRabatValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRabatType(offer.rabatType ?? 'PROCENT');
    setRabatValue(offer.rabatValue !== null ? String(offer.rabatValue) : '');
  }, [offer.id, offer.rabatType, offer.rabatValue]);

  const typeItems = [
    { value: 'PROCENT', label: t('offer.rabatProcent') },
    { value: 'KWOTA', label: t('offer.rabatKwota') },
  ];

  const afterDiscount = discountedTotal(total, offer.rabatType, offer.rabatValue);
  const discountAmount = round2(total - afterDiscount);

  async function handleApply() {
    if (saving) return;
    setSaving(true);
    try {
      await offerService.applyDiscount(offer.id, rabatType, round2(Number(rabatValue) || 0));
      onApplied();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">{t('offer.rabat')}</span>
          <Select
            items={typeItems}
            value={rabatType}
            onValueChange={(v) => setRabatType(v as RabatType)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeItems.map(item => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          type="number"
          step="0.01"
          min={0}
          className="w-28"
          value={rabatValue}
          onChange={(e) => setRabatValue(e.target.value)}
        />
        <Button variant="outline" disabled={saving} onClick={() => void handleApply()}>
          {t('offer.zastosuj')}
        </Button>
      </div>

      <Card className="min-w-64">
        <CardContent className="flex flex-col gap-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('offer.suma')}</span>
            <span>{formatPln(total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('offer.rabat')}</span>
            <span>−{formatPln(discountAmount)}</span>
          </div>
          <div className="flex justify-between border-t pt-1 font-semibold">
            <span>{t('offer.razemPoRabacie')}</span>
            <span>{formatPln(afterDiscount)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
