import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as rfqService from '@/api/rfqService';
import type { RfqWithComputed } from '@/api/rfqService';
import * as bomService from '@/api/bomService';
import * as dictionaryService from '@/api/dictionaryService';
import * as offerService from '@/api/offerService';
import { getDb } from '@/api/db';
import { useTabsStore } from '@/stores/tabsStore';
import { useAuthStore } from '@/stores/authStore';
import { RFQ_STATUSES } from '@/types/enums';
import type { RfqStatus } from '@/types/enums';
import type { BomNode, Client, DictItem, Entity, Offer, User } from '@/types/models';
import { recalcTree } from '@/services/costService';
import { formatPln } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface RfqDetailProps {
  rfqId: number;
}

interface SelectRowProps {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function SelectRow({ id, label, value, options, onChange }: SelectRowProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select items={options} value={value || null} onValueChange={(v) => onChange(String(v))}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function wycenaTabId(rfqId: number): string {
  return `bom:${rfqId}::rfq`;
}

export function RfqDetail({ rfqId }: RfqDetailProps) {
  const { t } = useTranslation();
  const openTab = useTabsStore(s => s.openTab);
  const setTabDirty = useTabsStore(s => s.setTabDirty);
  const activeTabId = useTabsStore(s => s.activeTabId);
  const currentUser = useAuthStore(s => s.currentUser);
  const tabId = `rfq:${rfqId}::`;

  const [rfq, setRfq] = useState<RfqWithComputed | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [inquiryTypes, setInquiryTypes] = useState<DictItem[]>([]);
  const [certificates, setCertificates] = useState<DictItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [bomRoots, setBomRoots] = useState<BomNode[]>([]);
  const [existingOffer, setExistingOffer] = useState<Offer | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [selectedRootIds, setSelectedRootIds] = useState<number[]>([]);

  const [nazwa, setNazwa] = useState('');
  const [opis, setOpis] = useState('');
  const [clientId, setClientId] = useState('');
  const [entityId, setEntityId] = useState('');
  const [inquiryTypeId, setInquiryTypeId] = useState('');
  const [coordinatorId, setCoordinatorId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<RfqStatus>('NOWE');
  const [wymaganaDokumentacja, setWymaganaDokumentacja] = useState(false);
  const [certificateIds, setCertificateIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [headerDirty, setHeaderDirty] = useState(false);
  const [headerSnap, setHeaderSnap] = useState('');

  useEffect(() => {
    setTabDirty(tabId, headerDirty);
  }, [headerDirty, setTabDirty, tabId]);

  const loadSavedRoots = useCallback(async () => {
    const nodes = recalcTree(await bomService.getTree('rfq', rfqId));
    setBomRoots(nodes.filter(n => n.parentId === null).sort((a, b) => a.lp - b.lp));
  }, [rfqId]);

  const load = useCallback(async () => {
    const [rfqData, clientData, entityData, inquiryTypeData, certificateData, offer] =
      await Promise.all([
        rfqService.get(rfqId),
        dictionaryService.list('clients'),
        dictionaryService.list('entities'),
        dictionaryService.list('inquiryTypes'),
        dictionaryService.list('certificates'),
        offerService.findByRfqId(rfqId),
      ]);

    setClients(clientData as Client[]);
    setEntities(entityData as Entity[]);
    setInquiryTypes(inquiryTypeData as DictItem[]);
    setCertificates(certificateData as DictItem[]);
    setUsers(getDb().users.filter(u => u.active));
    setExistingOffer(offer);
    await loadSavedRoots();

    if (rfqData) {
      setRfq(rfqData);
      setNazwa(rfqData.nazwa);
      setOpis(rfqData.opis);
      setClientId(String(rfqData.clientId));
      setEntityId(String(rfqData.entityId));
      setInquiryTypeId(String(rfqData.inquiryTypeId));
      setCoordinatorId(String(rfqData.coordinatorId));
      setDeadline(rfqData.deadline);
      setStatus(rfqData.status);
      setWymaganaDokumentacja(rfqData.wymaganaDokumentacja);
      setCertificateIds(rfqData.certificateIds);
      const snap = JSON.stringify({
        nazwa: rfqData.nazwa,
        opis: rfqData.opis,
        clientId: String(rfqData.clientId),
        entityId: String(rfqData.entityId),
        inquiryTypeId: String(rfqData.inquiryTypeId),
        coordinatorId: String(rfqData.coordinatorId),
        deadline: rfqData.deadline,
        status: rfqData.status,
        wymaganaDokumentacja: rfqData.wymaganaDokumentacja,
        certificateIds: rfqData.certificateIds,
      });
      setHeaderSnap(snap);
      setHeaderDirty(false);
    }
  }, [rfqId, loadSavedRoots]);

  useEffect(() => {
    void load();
  }, [load]);

  // Refresh quotation summary when returning to the header tab after editing wycena.
  useEffect(() => {
    if (activeTabId === tabId) {
      void loadSavedRoots();
    }
  }, [activeTabId, tabId, loadSavedRoots]);

  useEffect(() => {
    if (!rfq) return;
    const current = JSON.stringify({
      nazwa,
      opis,
      clientId,
      entityId,
      inquiryTypeId,
      coordinatorId,
      deadline,
      status,
      wymaganaDokumentacja,
      certificateIds,
    });
    setHeaderDirty(current !== headerSnap);
  }, [
    nazwa,
    opis,
    clientId,
    entityId,
    inquiryTypeId,
    coordinatorId,
    deadline,
    status,
    wymaganaDokumentacja,
    certificateIds,
    headerSnap,
    rfq,
  ]);

  function toggleCertificate(id: number, checked: boolean) {
    setCertificateIds(ids => (checked ? [...ids, id] : ids.filter(i => i !== id)));
  }

  function openWycena() {
    if (!rfq) return;
    openTab({
      type: 'bom',
      entityId: rfqId,
      ownerType: 'rfq',
      title: t('rfq.wycenaTabTitle', { numer: rfq.numer }),
    });
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await rfqService.update(rfqId, {
        nazwa,
        opis,
        clientId: Number(clientId),
        entityId: Number(entityId),
        inquiryTypeId: Number(inquiryTypeId),
        coordinatorId: Number(coordinatorId),
        deadline,
        status,
        wymaganaDokumentacja,
        certificateIds,
      });
      const now = new Date();
      setSavedAt(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function openCreateOfferDialog() {
    const wycenaDirty = useTabsStore.getState().tabs.find(tab => tab.id === wycenaTabId(rfqId))?.dirty;
    if (wycenaDirty) {
      if (!window.confirm(t('bom.saveFirst'))) return;
      openWycena();
      return;
    }
    const nodes = recalcTree(await bomService.getTree('rfq', rfqId));
    const roots = nodes.filter(n => n.parentId === null).sort((a, b) => a.lp - b.lp);
    setBomRoots(roots);
    setSelectedRootIds(roots.map(r => r.id));
    setPickOpen(true);
  }

  function toggleRoot(id: number, checked: boolean) {
    setSelectedRootIds(ids => (checked ? [...ids, id] : ids.filter(i => i !== id)));
  }

  async function handleCreateOffer() {
    if (selectedRootIds.length === 0 || !currentUser) return;
    const offer = await offerService.createFromRfq(rfqId, currentUser.id, selectedRootIds);
    setPickOpen(false);
    openTab({ type: 'offer', entityId: offer.id, title: offer.numer });
    await load();
  }

  if (!rfq) {
    return <div className="p-8 text-muted-foreground">…</div>;
  }

  const hasBom = bomRoots.length > 0;
  const totalKoszt = bomRoots.reduce((sum, root) => sum + root.totalCost, 0);

  return (
    <div className="flex min-w-0 flex-col">
      <DocumentActionBar
        title={rfq.numer}
        dirty={headerDirty}
        saving={saving}
        savedAt={savedAt}
        onSave={() => void handleSave()}
        secondaryActions={
          existingOffer ? (
            <Button
              variant="outline"
              onClick={() =>
                openTab({
                  type: 'offer',
                  entityId: existingOffer.id,
                  title: existingOffer.numer,
                })
              }
            >
              {t('rfq.otworzOferte', { numer: existingOffer.numer })}
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled={!hasBom}
              title={!hasBom ? t('rfq.brakBom') : undefined}
              onClick={() => void openCreateOfferDialog()}
            >
              {t('rfq.utworzOferte')}
            </Button>
          )
        }
      />

      <div className="flex max-w-2xl flex-col gap-4 p-4">
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <span>
            {t('rfq.dataZapytania')}: {rfq.dataZapytania}
          </span>
          <span>
            {t('rfq.dataWyslania')}: {rfq.dataWyslania ?? '—'}
          </span>
          {existingOffer && (
            <button
              type="button"
              className="text-primary underline-offset-2 hover:underline"
              onClick={() =>
                openTab({
                  type: 'offer',
                  entityId: existingOffer.id,
                  title: existingOffer.numer,
                })
              }
            >
              {t('rfq.linkOferta', { numer: existingOffer.numer })}
            </button>
          )}
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="rfqd-nazwa">{t('rfq.nazwa')}</Label>
            <Input id="rfqd-nazwa" value={nazwa} onChange={(e) => setNazwa(e.target.value)} />
          </div>

          <SelectRow
            id="rfqd-client"
            label={t('rfq.klient')}
            value={clientId}
            options={clients.map(c => ({ value: String(c.id), label: c.name }))}
            onChange={setClientId}
          />

          <SelectRow
            id="rfqd-entity"
            label={t('rfq.wystawiamyJako')}
            value={entityId}
            options={entities.map(en => ({ value: String(en.id), label: en.name }))}
            onChange={setEntityId}
          />

          <SelectRow
            id="rfqd-inquiry-type"
            label={t('rfq.typZapytania')}
            value={inquiryTypeId}
            options={inquiryTypes.map(it => ({ value: String(it.id), label: it.labelPL }))}
            onChange={setInquiryTypeId}
          />

          <SelectRow
            id="rfqd-coordinator"
            label={t('rfq.koordynator')}
            value={coordinatorId}
            options={users.map(u => ({ value: String(u.id), label: `${u.firstName} ${u.lastName}` }))}
            onChange={setCoordinatorId}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rfqd-deadline">{t('rfq.deadline')}</Label>
            <Input
              id="rfqd-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <SelectRow
            id="rfqd-status"
            label={t('rfq.status')}
            value={status}
            options={RFQ_STATUSES.map(s => ({ value: s, label: t(`statuses.${s}`) }))}
            onChange={(v) => setStatus(v as RfqStatus)}
          />

          <div className="col-span-2 flex items-center gap-2">
            <Checkbox
              id="rfqd-dokumentacja"
              checked={wymaganaDokumentacja}
              onCheckedChange={(checked) => setWymaganaDokumentacja(Boolean(checked))}
            />
            <Label htmlFor="rfqd-dokumentacja">{t('rfq.wymaganaDokumentacja')}</Label>
          </div>

          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>{t('rfq.certyfikaty')}</Label>
            <div className="flex flex-wrap gap-4">
              {certificates.map(cert => (
                <div key={cert.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`rfqd-cert-${cert.id}`}
                    checked={certificateIds.includes(cert.id)}
                    onCheckedChange={(checked) => toggleCertificate(cert.id, Boolean(checked))}
                  />
                  <Label htmlFor={`rfqd-cert-${cert.id}`} className="font-normal">
                    {cert.labelPL}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="rfqd-opis">{t('rfq.opis')}</Label>
            <Textarea id="rfqd-opis" value={opis} onChange={(e) => setOpis(e.target.value)} />
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">{t('rfq.wycenaBom')}</h3>
          <div className="flex flex-wrap items-end gap-6 text-sm">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{t('rfq.wycenaRootCount')}</span>
              <span className="tabular-nums">{bomRoots.length}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{t('bom.kosztWykonania')}</span>
              <span className="tabular-nums">{formatPln(totalKoszt)}</span>
            </div>
          </div>
          <div>
            <Button onClick={openWycena}>{t('rfq.otworzWycene')}</Button>
          </div>
        </div>
      </div>

      <Dialog open={pickOpen} onOpenChange={setPickOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('rfq.wybierzProdukty')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {bomRoots.map(root => (
              <label key={root.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedRootIds.includes(root.id)}
                  onCheckedChange={(checked) => toggleRoot(root.id, Boolean(checked))}
                />
                <span>
                  {root.lp}. {root.nazwaOpis || root.numerDetalu}
                </span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={selectedRootIds.length === 0}
              onClick={() => void handleCreateOffer()}
            >
              {t('rfq.utworzOferte')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
