import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as bomService from '@/api/bomService';
import type { CostSource } from '@/types/enums';
import type { BomNode } from '@/types/models';
import { round2, formatPln } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: BomNode | null;
  onSaved: () => void;
  onOpenSuppliers?: (node: BomNode) => void;
}

export function CostModal({ open, onOpenChange, node, onSaved, onOpenSuppliers }: CostModalProps) {
  const { t } = useTranslation();

  const [costSource, setCostSource] = useState<CostSource>('ROLLUP');
  const [unitCost, setUnitCost] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !node) return;
    setCostSource(node.costSource);
    setUnitCost(String(node.unitCost));
  }, [open, node]);

  if (!node) return null;

  const liveTotal = round2((Number(unitCost) || 0) * node.ilosc);

  async function handleSave() {
    if (!node || saving) return;
    setSaving(true);
    try {
      const patch: Partial<BomNode> = { costSource };
      if (costSource === 'MANUAL') {
        patch.unitCost = round2(Number(unitCost) || 0);
      }
      await bomService.updateNode(node.id, patch);
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('bom.costCalc')} — {node.nazwaOpis}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{t('bom.costSource')}</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="cost-source"
                  checked={costSource === 'ROLLUP'}
                  onChange={() => setCostSource('ROLLUP')}
                />
                {t('bom.rollup')}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="cost-source"
                  checked={costSource === 'MANUAL'}
                  onChange={() => setCostSource('MANUAL')}
                />
                {t('bom.manual')}
              </label>
            </div>
          </div>

          {costSource === 'MANUAL' ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="cost-unit" className="w-40">
                  {t('bom.kosztJedn')}
                </Label>
                <Input
                  id="cost-unit"
                  type="number"
                  step="0.01"
                  className="max-w-40"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                />
              </div>
              <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm font-semibold">
                <span>{t('bom.kosztCalk')}</span>
                <span>{formatPln(liveTotal)}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('bom.kosztJedn')}</span>
                <span>{formatPln(node.unitCost)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm font-semibold">
                <span>{t('bom.kosztCalk')}</span>
                <span>{formatPln(node.totalCost)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {onOpenSuppliers && (
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onOpenSuppliers(node);
              }}
            >
              {t('bom.suppliers')}
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button disabled={saving} onClick={() => void handleSave()}>
              {t('common.save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
