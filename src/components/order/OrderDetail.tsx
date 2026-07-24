import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import * as orderService from '@/api/orderService';
import * as offerService from '@/api/offerService';
import * as dictionaryService from '@/api/dictionaryService';
import { useTabsStore } from '@/stores/tabsStore';
import { ORDER_STATUSES, type OrderStatus } from '@/types/enums';
import type { Client, Order } from '@/types/models';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DocumentActionBar } from '@/components/layout/DocumentActionBar';
import { BomTree, type BomTreeHandle } from '@/components/bom/BomTree';
import { ORDER_STATUS_BADGE } from './OrderGrid';

interface OrderDetailProps {
  orderId: number;
}

function draftKey(nazwa: string, opis: string, status: OrderStatus): string {
  return JSON.stringify({ nazwa, opis, status });
}

export function OrderDetail({ orderId }: OrderDetailProps) {
  const { t } = useTranslation();
  const setTabDirty = useTabsStore(s => s.setTabDirty);
  const openTab = useTabsStore(s => s.openTab);
  const tabId = `order:${orderId}::`;

  const bomRef = useRef<BomTreeHandle>(null);

  const [order, setOrder] = useState<Order | null>(null);
  const [clientName, setClientName] = useState('');
  const [offerNumer, setOfferNumer] = useState('');
  const [revisionLabel, setRevisionLabel] = useState('');

  const [nazwa, setNazwa] = useState('');
  const [opis, setOpis] = useState('');
  const [status, setStatus] = useState<OrderStatus>('NOWE');
  const [committedKey, setCommittedKey] = useState('');
  const [bomDirty, setBomDirty] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const headerDirty = order !== null && draftKey(nazwa, opis, status) !== committedKey;
  const dirty = headerDirty || bomDirty;

  useEffect(() => {
    setTabDirty(tabId, dirty);
  }, [dirty, setTabDirty, tabId]);

  useEffect(() => {
    return () => setTabDirty(tabId, false);
  }, [setTabDirty, tabId]);

  const load = useCallback(async () => {
    const loaded = await orderService.get(orderId);
    if (!loaded) {
      setOrder(null);
      return;
    }

    const [clients, offer, revision] = await Promise.all([
      dictionaryService.list('clients') as Promise<Client[]>,
      offerService.get(loaded.offerId),
      offerService.getRevision(loaded.offerRevisionId),
    ]);

    setOrder(loaded);
    setNazwa(loaded.nazwa);
    setOpis(loaded.opis);
    setStatus(loaded.status);
    setCommittedKey(draftKey(loaded.nazwa, loaded.opis, loaded.status));
    setClientName(clients.find(c => c.id === loaded.clientId)?.name ?? '');
    setOfferNumer(offer?.offer.numer ?? '');
    setRevisionLabel(revision?.revision ?? '');
    setBomDirty(false);
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    if (!order) return;
    setSaving(true);
    try {
      await bomRef.current?.commit();
      const saved = await orderService.save(order.id, { nazwa, opis, status });
      if (!saved) return;
      setOrder(saved);
      setNazwa(saved.nazwa);
      setOpis(saved.opis);
      setStatus(saved.status);
      setCommittedKey(draftKey(saved.nazwa, saved.opis, saved.status));
      setBomDirty(false);
      const now = new Date();
      setSavedAt(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
    } finally {
      setSaving(false);
    }
  }

  if (!order) {
    return <div className="p-8 text-muted-foreground">…</div>;
  }

  const badge = ORDER_STATUS_BADGE[status];
  const statusItems = ORDER_STATUSES.map(s => ({
    value: s,
    label: t(`orderStatuses.${s}`),
  }));

  const title: ReactNode = (
    <span className="flex items-center gap-2">
      <span>{order.numer}</span>
      <Badge variant={badge.variant} className={badge.className}>
        {t(`orderStatuses.${status}`)}
      </Badge>
    </span>
  );

  return (
    <div className="flex min-w-0 flex-col">
      <DocumentActionBar
        title={title}
        dirty={dirty}
        saving={saving}
        savedAt={savedAt}
        onSave={() => void handleSave()}
      />

      <div className="flex max-w-5xl flex-col gap-4 p-4">
        <div className="flex flex-wrap items-end gap-6 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{t('order.oferta')}</span>
            <Button
              variant="link"
              className="h-auto justify-start p-0 text-sm"
              onClick={() =>
                openTab({
                  type: 'offer',
                  entityId: order.offerId,
                  title: offerNumer || String(order.offerId),
                })
              }
            >
              {t('order.provenance', {
                numer: offerNumer || '—',
                rev: revisionLabel || '—',
              })}
            </Button>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{t('order.klient')}</span>
            <span>{clientName}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">{t('order.status')}</Label>
            <Select
              items={statusItems}
              value={status}
              onValueChange={v => {
                if (v == null) return;
                setStatus(v as OrderStatus);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusItems.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="order-nazwa">{t('order.nazwa')}</Label>
          <Input
            id="order-nazwa"
            value={nazwa}
            onChange={e => setNazwa(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="order-opis">{t('order.opis')}</Label>
          <Input
            id="order-opis"
            value={opis}
            onChange={e => setOpis(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{t('order.bom')}</h3>
          <BomTree
            ref={bomRef}
            ownerType="order"
            ownerId={order.id}
            embedded
            onDirtyChange={setBomDirty}
          />
        </div>
      </div>
    </div>
  );
}
