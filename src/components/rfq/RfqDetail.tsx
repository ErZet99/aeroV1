import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as rfqService from '@/api/rfqService';
import type { RfqWithComputed } from '@/api/rfqService';
import * as dictionaryService from '@/api/dictionaryService';
import * as bomService from '@/api/bomService';
import * as offerService from '@/api/offerService';
import { getDb } from '@/api/db';
import { useTabsStore } from '@/stores/tabsStore';
import { useAuthStore } from '@/stores/authStore';
import { RFQ_STATUSES } from '@/types/enums';
import type { RfqStatus } from '@/types/enums';
import type { Client, DictItem, Entity, User } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

export function RfqDetail({ rfqId }: RfqDetailProps) {
  const { t } = useTranslation();
  const openTab = useTabsStore(s => s.openTab);
  const currentUser = useAuthStore(s => s.currentUser);

  const [rfq, setRfq] = useState<RfqWithComputed | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [inquiryTypes, setInquiryTypes] = useState<DictItem[]>([]);
  const [certificates, setCertificates] = useState<DictItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [hasBom, setHasBom] = useState(false);

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

  const load = useCallback(async () => {
    const [rfqData, clientData, entityData, inquiryTypeData, certificateData, bomNodes] =
      await Promise.all([
        rfqService.get(rfqId),
        dictionaryService.list('clients'),
        dictionaryService.list('entities'),
        dictionaryService.list('inquiryTypes'),
        dictionaryService.list('certificates'),
        bomService.getTree('rfq', rfqId),
      ]);

    setClients(clientData as Client[]);
    setEntities(entityData as Entity[]);
    setInquiryTypes(inquiryTypeData as DictItem[]);
    setCertificates(certificateData as DictItem[]);
    setUsers(getDb().users.filter(u => u.active));
    setHasBom(bomNodes.length > 0);

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
    }
  }, [rfqId]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleCertificate(id: number, checked: boolean) {
    setCertificateIds(ids => (checked ? [...ids, id] : ids.filter(i => i !== id)));
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
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateOffer() {
    const offer = await offerService.createFromRfq(rfqId, currentUser.id);
    openTab({ type: 'offer', entityId: offer.id, title: offer.numer });
  }

  if (!rfq) {
    return <div className="p-8 text-muted-foreground">…</div>;
  }

  return (
    <div className="flex max-w-2xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{rfq.numer}</h2>
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={() =>
              openTab({
                type: 'bom',
                entityId: rfqId,
                title: `${t('rfq.bomTabPrefix')} ${rfq.numer}`,
              })
            }
          >
            {t('rfq.wycenaBom')}
          </Button>
          <Button
            variant="outline"
            disabled={!hasBom}
            title={!hasBom ? t('rfq.brakBom') : undefined}
            onClick={() => void handleCreateOffer()}
          >
            {t('rfq.utworzOferte')}
          </Button>
        </div>
      </div>

      <div className="flex gap-6 text-sm text-muted-foreground">
        <span>
          {t('rfq.dataZapytania')}: {rfq.dataZapytania}
        </span>
        <span>
          {t('rfq.dataWyslania')}: {rfq.dataWyslania ?? '—'}
        </span>
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

      <div>
        <Button disabled={saving} onClick={() => void handleSave()}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}
