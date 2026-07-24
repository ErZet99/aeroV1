import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import * as offerService from '@/api/offerService';
import type { OfferLineDTO } from '@/api/offerService';
import * as dictionaryService from '@/api/dictionaryService';
import { getDb } from '@/api/db';
import { useAuthStore } from '@/stores/authStore';
import { useTabsStore } from '@/stores/tabsStore';
import type { OfferStatus } from '@/types/enums';
import type { Client, Entity, Offer, OfferRevision, User } from '@/types/models';
import {
  buildOfferPdfHtml,
  captureSnapshot,
  offerSummary,
  type OfferDocumentSnapshot,
} from '@/services/offerDocument';
import { round2 } from '@/lib/money';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
import { DocumentActionBar } from '@/components/layout/DocumentActionBar';
import { OfferLines, type EditableLineField } from './OfferLines';
import { OfferSummaryPanel } from './OfferSummaryPanel';
import { RevisionsPanel } from './RevisionsPanel';
import { OfferPdfDialog, type PdfSource } from './OfferPdfDialog';
import { OFFER_STATUS_BADGE } from './OfferGrid';
import { OrderCreateDialog } from '@/components/order/OrderCreateDialog';

interface OfferDetailProps {
  offerId: number;
}

const LEGAL_MOVES: Partial<Record<OfferStatus, OfferStatus[]>> = {
  SZKIC: ['WYSLANA'],
  WYSLANA: ['ZAAKCEPTOWANA', 'ODRZUCONA', 'WSTRZYMANA'],
};

const LEGAL_CLAUSES = {
  PL: [
    'Oferta jest ważna przez 30 dni od daty generowania, o ile nie wskazano inaczej.',
    'Ceny netto w PLN; do cen doliczany jest podatek VAT według obowiązujących stawek.',
    'Warunki płatności i dostawy według uzgodnień handlowych.',
  ],
  EN: [
    'This offer is valid for 30 days from the generation date unless stated otherwise.',
    'Prices are net PLN; VAT is added at the applicable rate.',
    'Payment and delivery terms as agreed commercially.',
  ],
} as const;

/** Client-only ids for lines not yet persisted (manual adds / branched revisions). */
let tempCounter = 0;
function nextTempId(): number {
  tempCounter -= 1;
  return tempCounter;
}

function enrichLines(lines: OfferLineDTO[], role: string): OfferLineDTO[] {
  return lines.map(line => {
    const wartosc = round2((line.cenaSprzedazy - line.rabat) * line.ilosc);
    const zysk = round2((line.cenaSprzedazy - line.rabat - line.kosztWykonania) * line.ilosc);
    const marza = wartosc > 0 ? round2((zysk / wartosc) * 100) : 0;
    const dto: OfferLineDTO = { ...line, wartosc };
    if (role !== 'PRACOWNIK') {
      dto.zysk = zysk;
      dto.marza = marza;
    } else {
      delete dto.zysk;
      delete dto.marza;
    }
    return dto;
  });
}

function draftSnapshot(
  offer: Offer,
  nrZamowienia: string,
  rabatOgolny: number,
  lines: OfferLineDTO[]
): OfferDocumentSnapshot {
  return captureSnapshot(
    {
      ...offer,
      nrZamowieniaKlienta: nrZamowienia.trim() === '' ? null : nrZamowienia.trim(),
      rabatType: rabatOgolny > 0 ? 'KWOTA' : null,
      rabatValue: rabatOgolny > 0 ? rabatOgolny : null,
    },
    lines.map((l, index) => ({
      id: l.id,
      offerId: l.offerId,
      lp: index + 1,
      nazwaPrzyrzadu: l.nazwaPrzyrzadu,
      ilosc: l.ilosc,
      sourceRfqId: l.sourceRfqId,
      sourceBomNodeId: l.sourceBomNodeId,
      kosztWykonania: l.kosztWykonania,
      rabat: l.rabat,
      cenaSprzedazy: l.cenaSprzedazy,
    }))
  );
}

function draftKey(nr: string, rabatOgolny: number, lines: OfferLineDTO[]): string {
  return JSON.stringify({
    nr,
    rabatOgolny,
    lines: lines.map((l, index) => ({
      lp: index + 1,
      nazwaPrzyrzadu: l.nazwaPrzyrzadu,
      ilosc: l.ilosc,
      kosztWykonania: l.kosztWykonania,
      rabat: l.rabat,
      cenaSprzedazy: l.cenaSprzedazy,
    })),
  });
}

export function OfferDetail({ offerId }: OfferDetailProps) {
  const { t } = useTranslation();
  const role = useAuthStore(s => s.currentUser.role);
  const currentUserId = useAuthStore(s => s.currentUser.id);
  const setTabDirty = useTabsStore(s => s.setTabDirty);
  const openTab = useTabsStore(s => s.openTab);
  const tabId = `offer:${offerId}::`;

  const [offer, setOffer] = useState<Offer | null>(null);
  const [lines, setLines] = useState<OfferLineDTO[]>([]);
  const [committedKey, setCommittedKey] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [revisions, setRevisions] = useState<OfferRevision[]>([]);
  const [nrZamowienia, setNrZamowienia] = useState('');
  const [rabatOgolny, setRabatOgolny] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfInitial, setPdfInitial] = useState<PdfSource | undefined>();
  const [viewRevision, setViewRevision] = useState<OfferRevision | null>(null);
  const [upToDateRevision, setUpToDateRevision] = useState(false);
  const [orderCreateRevisionId, setOrderCreateRevisionId] = useState<number | null>(null);

  const dirty = useMemo(
    () => committedKey !== '' && draftKey(nrZamowienia, rabatOgolny, lines) !== committedKey,
    [committedKey, nrZamowienia, rabatOgolny, lines]
  );

  useEffect(() => {
    setTabDirty(tabId, dirty);
  }, [dirty, setTabDirty, tabId]);

  const applyLoaded = useCallback(
    (detail: { offer: Offer; lines: OfferLineDTO[] }, revs: OfferRevision[]) => {
      const enriched = enrichLines(detail.lines, role);
      const nr = detail.offer.nrZamowieniaKlienta ?? '';
      const rabat = detail.offer.rabatValue ?? 0;
      setOffer(detail.offer);
      setLines(enriched);
      setNrZamowienia(nr);
      setRabatOgolny(rabat);
      setCommittedKey(draftKey(nr, rabat, enriched));
      setRevisions(revs);
      setUpToDateRevision(offerService.hasUpToDateRevision(detail.offer.id));
    },
    [role]
  );

  const load = useCallback(async () => {
    const [detail, clientData, entityData, revs] = await Promise.all([
      offerService.get(offerId, role),
      dictionaryService.list('clients'),
      dictionaryService.list('entities'),
      offerService.listRevisions(offerId),
    ]);
    setClients(clientData as Client[]);
    setEntities(entityData as Entity[]);
    setUsers(getDb().users);
    if (detail) applyLoaded(detail, revs);
  }, [offerId, role, applyLoaded]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(
    () => offerSummary(lines, 'KWOTA', rabatOgolny),
    [lines, rabatOgolny]
  );

  const showMargin = role !== 'PRACOWNIK';

  const handleFieldChange = useCallback(
    (lineId: number, field: EditableLineField, value: number | string) => {
      setLines(prev =>
        enrichLines(
          prev.map(l => (l.id === lineId ? { ...l, [field]: value } : l)),
          role
        )
      );
    },
    [role]
  );

  const handleAddLine = useCallback(() => {
    if (!offer) return;
    setLines(prev =>
      enrichLines(
        [
          ...prev,
          {
            id: nextTempId(),
            offerId: offer.id,
            lp: prev.length + 1,
            nazwaPrzyrzadu: '',
            ilosc: 1,
            sourceRfqId: null,
            sourceBomNodeId: null,
            kosztWykonania: 0,
            rabat: 0,
            cenaSprzedazy: 0,
          },
        ],
        role
      )
    );
  }, [offer, role]);

  const handleRemoveLine = useCallback(
    (lineId: number) => {
      setLines(prev =>
        enrichLines(
          prev
            .filter(l => l.id !== lineId)
            .map((l, index) => ({ ...l, lp: index + 1 })),
          role
        )
      );
    },
    [role]
  );

  async function persistWorkingCopy(): Promise<boolean> {
    if (!offer) return false;
    setSaving(true);
    try {
      await offerService.saveWorkingCopy(offer.id, {
        nrZamowieniaKlienta: nrZamowienia.trim() === '' ? null : nrZamowienia.trim(),
        rabatType: rabatOgolny > 0 ? 'KWOTA' : null,
        rabatValue: rabatOgolny > 0 ? rabatOgolny : null,
        lines: lines.map((l, index) => ({
          id: l.id < 0 ? null : l.id,
          lp: index + 1,
          nazwaPrzyrzadu: l.nazwaPrzyrzadu,
          ilosc: l.ilosc,
          kosztWykonania: l.kosztWykonania,
          rabat: l.rabat,
          cenaSprzedazy: l.cenaSprzedazy,
        })),
      });
      const now = new Date();
      setSavedAt(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
      await load();
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!offer || saving || !dirty) return;
    await persistWorkingCopy();
  }

  async function handleCreateRevision() {
    if (!offer || saving) return;
    if (!window.confirm(t('offer.confirmSaveRevision'))) return;
    if (dirty) {
      const ok = await persistWorkingCopy();
      if (!ok) return;
    }
    setSaving(true);
    try {
      await offerService.createRevision(offer.id, currentUserId);
      await load();
    } finally {
      setSaving(false);
    }
  }

  function handleCreateRevisionFrom(rev: OfferRevision) {
    if (!offer) return;
    setNrZamowienia(rev.snapshot.nrZamowieniaKlienta ?? '');
    setRabatOgolny(rev.snapshot.rabatValue ?? 0);
    setLines(
      enrichLines(
        rev.snapshot.lines.map(l => ({
          id: nextTempId(),
          offerId: offer.id,
          lp: l.lp,
          nazwaPrzyrzadu: l.nazwaPrzyrzadu,
          ilosc: l.ilosc,
          sourceRfqId: l.sourceRfqId,
          sourceBomNodeId: l.sourceBomNodeId,
          kosztWykonania: l.kosztWykonania,
          rabat: l.rabat,
          cenaSprzedazy: l.cenaSprzedazy,
        })),
        role
      )
    );
    setViewRevision(null);
  }

  async function handleMarkSent() {
    if (!offer || offer.status !== 'SZKIC') return;
    if (dirty) {
      if (!window.confirm(t('offer.saveFirst'))) return;
      await persistWorkingCopy();
    }
    if (!offerService.hasUpToDateRevision(offer.id)) {
      window.alert(t('offer.saveRevisionFirst'));
      return;
    }
    if (!window.confirm(t('offer.confirmMarkSent'))) return;
    try {
      await offerService.markAsSent(offer.id);
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleStatusChange(status: string) {
    if (!offer || status === offer.status) return;
    if (offer.status === 'SZKIC' && status === 'WYSLANA') {
      await handleMarkSent();
      return;
    }
    if (dirty) {
      if (!window.confirm(t('offer.saveFirst'))) return;
      await persistWorkingCopy();
    }
    await offerService.update(offer.id, { status: status as OfferStatus });
    await load();
  }

  function openPdf(source?: PdfSource) {
    setPdfInitial(source);
    setPdfOpen(true);
  }

  function printFromSnapshot(
    language: 'PL' | 'EN',
    snapshot: OfferDocumentSnapshot,
    revisionLabel: string | null,
    meta: { entity: Entity; client: Client; salesRep: User; numer: string }
  ) {
    const lineRows = snapshot.lines.map(l => ({
      lp: l.lp,
      nazwa: l.nazwaPrzyrzadu,
      ilosc: l.ilosc,
      cena: round2(l.cenaSprzedazy - l.rabat),
      wartosc: round2((l.cenaSprzedazy - l.rabat) * l.ilosc),
    }));
    const sum = offerSummary(snapshot.lines, snapshot.rabatType, snapshot.rabatValue);
    const now = new Date();
    const generatedAt = `${now.toISOString().slice(0, 10)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const html = buildOfferPdfHtml({
      language,
      numer: meta.numer,
      revisionLabel,
      generatedAt,
      entityName: meta.entity.name,
      entityAddress: meta.entity.address,
      entityNip: meta.entity.nip,
      clientName: meta.client.name,
      clientAddress: meta.client.address,
      salesRepName: `${meta.salesRep.firstName} ${meta.salesRep.lastName}`,
      lines: lineRows,
      summary: sum,
      legalClauses: [...LEGAL_CLAUSES[language]],
    });
    const win = window.open('', '_blank');
    if (!win) {
      window.alert(t('offer.pdfPopupBlocked'));
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  function handleGeneratePdf(language: 'PL' | 'EN', source: PdfSource) {
    if (!offer) return;
    const entity = entities.find(e => e.id === offer.entityId);
    const client = clients.find(c => c.id === offer.clientId);
    const salesRep = users.find(u => u.id === offer.salesRepId);
    if (!entity || !client || !salesRep) return;

    if (source.type === 'revision') {
      const rev = revisions.find(r => r.id === source.revisionId);
      if (!rev) return;
      printFromSnapshot(language, rev.snapshot, rev.revision, {
        entity,
        client,
        salesRep,
        numer: offer.numer,
      });
      return;
    }

    // External PDF must match a stored revision (03-RULES.md §3).
    if (dirty || !upToDateRevision) {
      window.alert(t('offer.saveRevisionFirst'));
      return;
    }

    const workingSnapshot = draftSnapshot(offer, nrZamowienia, rabatOgolny, lines);
    printFromSnapshot(language, workingSnapshot, offer.revision, {
      entity,
      client,
      salesRep,
      numer: offer.numer,
    });
  }

  if (!offer) {
    return <div className="p-8 text-muted-foreground">…</div>;
  }

  const badge = OFFER_STATUS_BADGE[offer.status];
  const legalMoves = LEGAL_MOVES[offer.status] ?? [];
  const clientName = clients.find(c => c.id === offer.clientId)?.name ?? '';
  const entityName = entities.find(en => en.id === offer.entityId)?.name ?? '';
  const revisionIndicator =
    !dirty && upToDateRevision && offer.revision
      ? t('offer.revisionLabel', { rev: offer.revision })
      : t('offer.workingCopy');

  const statusItems = [
    { value: offer.status, label: t(`offerStatuses.${offer.status}`) },
    ...legalMoves.map(status => ({ value: status, label: t(`offerStatuses.${status}`) })),
  ];

  const title: ReactNode = (
    <span className="flex items-center gap-2">
      <span>{offer.numer}</span>
      <Badge variant="outline">{revisionIndicator}</Badge>
      <Badge variant={badge.variant} className={badge.className}>
        {t(`offerStatuses.${offer.status}`)}
      </Badge>
    </span>
  );

  const secondaryActions = (
    <>
      <Button
        variant="outline"
        disabled={saving || (!dirty && upToDateRevision)}
        onClick={() => void handleCreateRevision()}
      >
        {t('offer.createRevision')}
      </Button>
      <Button variant="outline" onClick={() => openPdf({ type: 'working' })}>
        {t('offer.generatePdf')}
      </Button>
    </>
  );

  const viewLines: OfferLineDTO[] = viewRevision
    ? enrichLines(
        viewRevision.snapshot.lines.map((l, idx) => ({
          id: idx + 1,
          offerId: offer.id,
          ...l,
        })),
        role
      )
    : [];

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

      <div className="flex max-w-5xl flex-col gap-4 p-4">
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

        <Separator />

        <OfferLines
          lines={lines}
          onFieldChange={handleFieldChange}
          onAddLine={handleAddLine}
          onRemoveLine={handleRemoveLine}
        />

        <OfferSummaryPanel
          summary={summary}
          showMargin={showMargin}
          rabatOgolny={rabatOgolny}
          onRabatOgolnyChange={setRabatOgolny}
        />

        <Separator />

        <RevisionsPanel
          revisions={revisions}
          userName={(id) => {
            const u = users.find(x => x.id === id);
            return u ? `${u.firstName} ${u.lastName}` : String(id);
          }}
          onView={setViewRevision}
          onPdf={(rev) => openPdf({ type: 'revision', revisionId: rev.id })}
          onCreateFrom={handleCreateRevisionFrom}
          onCreateOrder={(rev) => setOrderCreateRevisionId(rev.id)}
        />
      </div>

      <OfferPdfDialog
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        revisions={revisions}
        initialSource={pdfInitial}
        workingCopyNeedsRevision={dirty || !upToDateRevision}
        onGenerate={handleGeneratePdf}
      />

      <OrderCreateDialog
        open={orderCreateRevisionId !== null}
        onOpenChange={(open) => {
          if (!open) setOrderCreateRevisionId(null);
        }}
        preselectedRevisionId={orderCreateRevisionId}
        onCreated={(order) => {
          setOrderCreateRevisionId(null);
          void load();
          openTab({ type: 'order', entityId: order.id, title: order.numer });
        }}
      />
      <Dialog open={viewRevision !== null} onOpenChange={(o) => !o && setViewRevision(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {t('offer.viewRevisionTitle', { rev: viewRevision?.revision ?? '' })}
            </DialogTitle>
          </DialogHeader>
          {viewRevision && (
            <div className="max-h-[70vh] overflow-y-auto">
              <OfferLines lines={viewLines} readOnly />
              <OfferSummaryPanel
                summary={offerSummary(
                  viewRevision.snapshot.lines,
                  viewRevision.snapshot.rabatType,
                  viewRevision.snapshot.rabatValue
                )}
                showMargin={showMargin}
                rabatOgolny={viewRevision.snapshot.rabatValue ?? 0}
                readOnly
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => viewRevision && handleCreateRevisionFrom(viewRevision)}
            >
              {t('offer.createRevisionFrom')}
            </Button>
            <Button variant="outline" onClick={() => setViewRevision(null)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
