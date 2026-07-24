import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as offerService from '@/api/offerService';
import * as orderService from '@/api/orderService';
import type { Offer, OfferRevision, Order } from '@/types/models';
import { Button } from '@/components/ui/button';
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

interface OrderCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (order: Order) => void;
  /** Pre-select a revision (shortcut from offer revisions panel). */
  preselectedRevisionId?: number | null;
}

export function OrderCreateDialog({
  open,
  onOpenChange,
  onCreated,
  preselectedRevisionId = null,
}: OrderCreateDialogProps) {
  const { t } = useTranslation();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [revisions, setRevisions] = useState<OfferRevision[]>([]);
  const [offerId, setOfferId] = useState<string>('');
  const [revisionId, setRevisionId] = useState<string>('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const listed = await offerService.list();
      setOffers(listed);

      if (preselectedRevisionId != null) {
        const rev = await offerService.getRevision(preselectedRevisionId);
        if (rev) {
          setOfferId(String(rev.offerId));
          setRevisionId(String(rev.id));
          setRevisions(await offerService.listRevisions(rev.offerId));
          return;
        }
      }

      setOfferId('');
      setRevisionId('');
      setRevisions([]);
    })();
  }, [open, preselectedRevisionId]);

  useEffect(() => {
    if (!open || offerId === '' || preselectedRevisionId != null) return;
    void (async () => {
      const revs = await offerService.listRevisions(Number(offerId));
      setRevisions(revs);
      setRevisionId(revs.length > 0 ? String(revs[revs.length - 1].id) : '');
    })();
  }, [open, offerId, preselectedRevisionId]);

  const selectedOffer = useMemo(
    () => offers.find(o => o.id === Number(offerId)),
    [offers, offerId]
  );
  const selectedRevision = useMemo(
    () => revisions.find(r => r.id === Number(revisionId)),
    [revisions, revisionId]
  );

  const offerItems = offers.map(o => ({
    value: String(o.id),
    label: `${o.numer}${o.revision ? ` (${o.revision})` : ''}`,
  }));
  const revisionItems = revisions.map(r => ({
    value: String(r.id),
    label: r.revision,
  }));

  async function handleCreate() {
    if (!selectedOffer || !selectedRevision) return;
    const ok = window.confirm(
      t('order.confirmCreate', {
        numer: selectedOffer.numer,
        rev: selectedRevision.revision,
      })
    );
    if (!ok) return;

    setCreating(true);
    try {
      const order = await orderService.createFromRevision(selectedRevision.id);
      onCreated(order);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('order.noweZlecenie')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t('order.wybierzOferte')}</span>
            <Select
              items={offerItems}
              value={offerId || null}
              onValueChange={v => {
                if (v == null) return;
                setOfferId(String(v));
                setRevisionId('');
              }}
              disabled={preselectedRevisionId != null}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('common.select')} />
              </SelectTrigger>
              <SelectContent>
                {offerItems.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t('order.wybierzRewizje')}</span>
            {offerId !== '' && revisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('order.brakRewizji')}</p>
            ) : (
              <Select
                items={revisionItems}
                value={revisionId || null}
                onValueChange={v => {
                  if (v == null) return;
                  setRevisionId(String(v));
                }}
                disabled={preselectedRevisionId != null || revisionItems.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.select')} />
                </SelectTrigger>
                <SelectContent>
                  {revisionItems.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            disabled={!selectedRevision || creating}
            onClick={() => void handleCreate()}
          >
            {t('order.utworz')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
