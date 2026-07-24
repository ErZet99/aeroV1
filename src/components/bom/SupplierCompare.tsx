import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as bomService from '@/api/bomService';
import type { BomNode, Supplier, SupplierOffer } from '@/types/models';
import { round2, formatPln } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const FREE_TEXT = '0';

interface OfferRow {
  id: number | null;
  supplierId: string;
  supplierName: string;
  cena: string;
  isFinal: boolean;
}

interface SupplierCompareProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: BomNode | null;
  suppliers: Supplier[];
  onSaved: () => void;
}

function emptyRow(): OfferRow {
  return { id: null, supplierId: FREE_TEXT, supplierName: '', cena: '', isFinal: false };
}

export function SupplierCompare({
  open,
  onOpenChange,
  node,
  suppliers,
  onSaved,
}: SupplierCompareProps) {
  const { t } = useTranslation();

  const [rows, setRows] = useState<OfferRow[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !node) return;
    const initial: OfferRow[] = [0, 1, 2].map(i => {
      const offer = node.supplierOffers[i];
      if (!offer) return emptyRow();
      return {
        id: offer.id,
        supplierId: offer.supplierId !== null ? String(offer.supplierId) : FREE_TEXT,
        supplierName: offer.supplierName,
        cena: String(offer.cena),
        isFinal: offer.isFinal,
      };
    });
    setRows(initial);
  }, [open, node]);

  if (!node) return null;

  const supplierOptions = [
    { value: FREE_TEXT, label: t('bom.freeName') },
    ...suppliers.map(s => ({ value: String(s.id), label: s.name })),
  ];

  function updateRow(index: number, patch: Partial<OfferRow>) {
    setRows(rs => rs.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function setFinal(index: number) {
    setRows(rs => rs.map((row, i) => ({ ...row, isFinal: i === index })));
  }

  function rowIsFilled(row: OfferRow): boolean {
    return row.supplierId !== FREE_TEXT || row.supplierName.trim() !== '' || Number(row.cena) > 0;
  }

  const finalRow = rows.find(row => row.isFinal && rowIsFilled(row));

  async function handleSave() {
    if (!node || saving) return;
    setSaving(true);
    try {
      let nextId = 1;
      const offers: SupplierOffer[] = rows.filter(rowIsFilled).map(row => {
        const supplierId = row.supplierId === FREE_TEXT ? null : Number(row.supplierId);
        const supplier = supplierId !== null ? suppliers.find(s => s.id === supplierId) : undefined;
        return {
          id: row.id ?? 1000 + nextId++,
          supplierId,
          supplierName: supplier ? supplier.name : row.supplierName.trim(),
          cena: round2(Number(row.cena) || 0),
          isFinal: row.isFinal,
        };
      });
      await bomService.setSupplierOffers(node.id, offers);
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {t('bom.suppliers')} — {node.nazwaOpis}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-[1fr_1fr_100px_60px] items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>{t('bom.supplier')}</span>
            <span>{t('bom.freeName')}</span>
            <span>{t('bom.cena')}</span>
            <span>{t('bom.finalny')}</span>
          </div>

          {rows.map((row, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_100px_60px] items-center gap-2">
              <Select
                items={supplierOptions}
                value={row.supplierId}
                onValueChange={(v) => updateRow(index, { supplierId: String(v) })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supplierOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={row.supplierName}
                disabled={row.supplierId !== FREE_TEXT}
                onChange={(e) => updateRow(index, { supplierName: e.target.value })}
              />

              <Input
                type="number"
                step="0.01"
                min={0}
                value={row.cena}
                onChange={(e) => updateRow(index, { cena: e.target.value })}
              />

              <div className="flex justify-center">
                <input
                  type="radio"
                  name="final-offer"
                  checked={row.isFinal}
                  onChange={() => setFinal(index)}
                />
              </div>
            </div>
          ))}

          {finalRow && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              {t('bom.contribution')}:{' '}
              <span className="font-medium">{formatPln(round2(Number(finalRow.cena) || 0))}</span>
              {' → '}{t('bom.manual')} {t('bom.kosztJedn').toLowerCase()}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button disabled={saving} onClick={() => void handleSave()}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
