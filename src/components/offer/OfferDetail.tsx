import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontalIcon } from 'lucide-react';
import * as offerService from '@/api/offerService';
import type { OfferLineDTO } from '@/api/offerService';
import * as dictionaryService from '@/api/dictionaryService';
import { useAuthStore } from '@/stores/authStore';
import { useTabsStore } from '@/stores/tabsStore';
import type { OfferStatus } from '@/types/enums';
import type { Client, Entity, Offer } from '@/types/models';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DocumentActionBar } from '@/components/layout/DocumentActionBar';
import { OfferLines } from './OfferLines';
import { DiscountControl } from './DiscountControl';
import { OFFER_STATUS_BADGE } from './OfferGrid';

interface OfferDetailProps {
  offerId: number;
}

/** Legal manual moves per plan: SZKIC → none (finalize only); WYSLANA → accepted/rejected/on-hold. */
const LEGAL_MOVES: Partial<Record<OfferStatus, OfferStatus[]>> = {
  WYSLANA: ['ZAAKCEPTOWANA', 'ODRZUCONA', 'WSTRZYMANA'],
};

export function OfferDetail({ offerId }: OfferDetailProps) {
  const { t } = useTranslation();
  const role = useAuthStore(s => s.currentUser.role);
  const setTabDirty = useTabsStore(s => s.setTabDirty);
  const tabId = `offer:${offerId}::`;

  const [offer, setOffer] = useState<Offer | null>(null);
  const [lines, setLines] = useState<OfferLineDTO[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [nrZamowienia, setNrZamowienia] = useState('');
  const [nrSnap, setNrSnap] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const dirty = nrZamowienia !== nrSnap;

  useEffect(() => {
    setTabDirty(tabId, dirty);
  }, [dirty, setTabDirty, tabId]);

  const load = useCallback(async () => {
    const [detail, clientData, entityData] = await Promise.all([
      offerService.get(offerId, role),
      dictionaryService.list('clients'),
      dictionaryService.list('entities'),
    ]);
    setClients(clientData as Client[]);
    setEntities(entityData as Entity[]);
    if (detail) {
      setOffer(detail.offer);
      setLines(detail.lines);
      const nr = detail.offer.nrZamowieniaKlienta ?? '';
      setNrZamowienia(nr);
      setNrSnap(nr);
    }
  }, [offerId, role]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = useMemo(
    () => lines.reduce((acc, line) => acc + (line.wartosc ?? 0), 0),
    [lines]
  );

  if (!offer) {
    return <div className="p-8 text-muted-foreground">…</div>;
  }

  const badge = OFFER_STATUS_BADGE[offer.status];
  const legalMoves = LEGAL_MOVES[offer.status] ?? [];
  const isSzkic = offer.status === 'SZKIC';

  const statusItems = [
    { value: offer.status, label: t(`offerStatuses.${offer.status}`) },
    ...legalMoves.map(status => ({ value: status, label: t(`offerStatuses.${status}`) })),
  ];

  async function handleStatusChange(status: string) {
    if (!offer || status === offer.status) return;
    await offerService.update(offer.id, { status: status as OfferStatus });
    await load();
  }

  async function handleFinalize() {
    if (!offer) return;
    if (!window.confirm(t('offer.confirmFinalize'))) return;
    await offerService.finalize(offer.id);
    await load();
  }

  async function handleSave() {
    if (!offer || saving) return;
    setSaving(true);
    try {
      const value = nrZamowienia.trim() === '' ? null : nrZamowienia.trim();
      await offerService.update(offer.id, { nrZamowieniaKlienta: value });
      const now = new Date();
      setSavedAt(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
      await load();
    } finally {
      setSaving(false);
    }
  }

  const clientName = clients.find(c => c.id === offer.clientId)?.name ?? '';
  const entityName = entities.find(en => en.id === offer.entityId)?.name ?? '';

  const title: ReactNode = (
    <span className="flex items-center gap-2">
      <span>{offer.numer}</span>
      <Badge variant="outline">{offer.revision}</Badge>
      <Badge variant={badge.variant} className={badge.className}>
        {t(`offerStatuses.${offer.status}`)}
      </Badge>
    </span>
  );

  const secondaryActions = (
    <>
      <Button variant="outline" disabled title={t('common.underConstruction')}>
        {t('offer.saveAsRevision')}
      </Button>
      <Button variant="outline" disabled title={t('common.underConstruction')}>
        {t('offer.generatePdf')}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="icon" aria-label={t('offer.moreActions')} />
          }
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled>{t('offer.globalMargin')}</DropdownMenuItem>
          <DropdownMenuItem disabled>{t('offer.rabat')}</DropdownMenuItem>
          <DropdownMenuItem disabled>{t('offer.markSent')}</DropdownMenuItem>
          {isSzkic && (
            <DropdownMenuItem onClick={() => void handleFinalize()}>
              {t('offer.finalize')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  return (
    <div className="flex min-w-0 flex-col">
      <DocumentActionBar
        title={title}
        dirty={dirty}
        saving={saving}
        savedAt={savedAt}
        onSave={() => void handleSave()}
        secondaryActions={secondaryActions}
      />

      <div className="flex max-w-4xl flex-col gap-4 p-4">
        <div className="flex flex-wrap items-end gap-6 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{t('offer.podmiot')}</span>
            <span>{entityName}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{t('offer.klient')}</span>
            <span>{clientName}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="offer-nr-zamowienia" className="text-xs text-muted-foreground">
              {t('offer.nrZamowienia')}
            </Label>
            <Input
              id="offer-nr-zamowienia"
              className="w-52"
              value={nrZamowienia}
              onChange={(e) => setNrZamowienia(e.target.value)}
            />
          </div>
          {legalMoves.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">{t('offer.status')}</span>
              <Select
                items={statusItems}
                value={offer.status}
                onValueChange={(v) => void handleStatusChange(String(v))}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusItems.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {!isSzkic && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
            {t('offer.revisionNotice')}
          </div>
        )}

        <Separator />

        <OfferLines lines={lines} status={offer.status} onChanged={() => void load()} />

        <Separator />

        <DiscountControl offer={offer} total={total} onApplied={() => void load()} />
      </div>
    </div>
  );
}
