import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as rfqService from '@/api/rfqService';
import * as dictionaryService from '@/api/dictionaryService';
import { getDb } from '@/api/db';
import { useTabsStore } from '@/stores/tabsStore';
import type { Client, DictItem, Entity, User } from '@/types/models';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface RfqFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface SelectFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function SelectField({ id, label, placeholder, value, options, onChange }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        items={options}
        value={value || null}
        onValueChange={(v) => onChange(String(v))}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder} />
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

export function RfqForm({ open, onOpenChange, onCreated }: RfqFormProps) {
  const { t } = useTranslation();
  const openTab = useTabsStore(s => s.openTab);

  const [clients, setClients] = useState<Client[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [inquiryTypes, setInquiryTypes] = useState<DictItem[]>([]);
  const [certificates, setCertificates] = useState<DictItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [nazwa, setNazwa] = useState('');
  const [opis, setOpis] = useState('');
  const [clientId, setClientId] = useState('');
  const [entityId, setEntityId] = useState('');
  const [inquiryTypeId, setInquiryTypeId] = useState('');
  const [coordinatorId, setCoordinatorId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [wymaganaDokumentacja, setWymaganaDokumentacja] = useState(false);
  const [certificateIds, setCertificateIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    // reset form on each open
    setNazwa('');
    setOpis('');
    setClientId('');
    setEntityId('');
    setInquiryTypeId('');
    setCoordinatorId('');
    setDeadline('');
    setWymaganaDokumentacja(false);
    setCertificateIds([]);

    void (async () => {
      const [clientData, entityData, inquiryTypeData, certificateData] = await Promise.all([
        dictionaryService.list('clients'),
        dictionaryService.list('entities'),
        dictionaryService.list('inquiryTypes'),
        dictionaryService.list('certificates'),
      ]);
      setClients(clientData as Client[]);
      setEntities(entityData as Entity[]);
      setInquiryTypes(inquiryTypeData as DictItem[]);
      setCertificates(certificateData as DictItem[]);
      setUsers(getDb().users.filter(u => u.active));
    })();
  }, [open]);

  const valid =
    nazwa.trim() !== '' &&
    clientId !== '' &&
    entityId !== '' &&
    inquiryTypeId !== '' &&
    coordinatorId !== '' &&
    deadline !== '';

  function toggleCertificate(id: number, checked: boolean) {
    setCertificateIds(ids => (checked ? [...ids, id] : ids.filter(i => i !== id)));
  }

  async function handleSubmit() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const rfq = await rfqService.create({
        nazwa: nazwa.trim(),
        opis,
        clientId: Number(clientId),
        entityId: Number(entityId),
        inquiryTypeId: Number(inquiryTypeId),
        coordinatorId: Number(coordinatorId),
        deadline,
        wymaganaDokumentacja,
        certificateIds,
      });
      onOpenChange(false);
      onCreated();
      openTab({ type: 'rfq', entityId: rfq.id, title: rfq.numer });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('rfq.noweZapytanie')}</DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[65vh] flex-col gap-3 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rfq-nazwa">{t('rfq.nazwa')}</Label>
            <Input id="rfq-nazwa" value={nazwa} onChange={(e) => setNazwa(e.target.value)} />
          </div>

          <SelectField
            id="rfq-client"
            label={t('rfq.klient')}
            placeholder={t('common.select')}
            value={clientId}
            options={clients.map(c => ({ value: String(c.id), label: c.name }))}
            onChange={setClientId}
          />

          <SelectField
            id="rfq-entity"
            label={t('rfq.wystawiamyJako')}
            placeholder={t('common.select')}
            value={entityId}
            options={entities.map(en => ({ value: String(en.id), label: en.name }))}
            onChange={setEntityId}
          />

          <SelectField
            id="rfq-inquiry-type"
            label={t('rfq.typZapytania')}
            placeholder={t('common.select')}
            value={inquiryTypeId}
            options={inquiryTypes.map(it => ({ value: String(it.id), label: it.labelPL }))}
            onChange={setInquiryTypeId}
          />

          <SelectField
            id="rfq-coordinator"
            label={t('rfq.koordynator')}
            placeholder={t('common.select')}
            value={coordinatorId}
            options={users.map(u => ({ value: String(u.id), label: `${u.firstName} ${u.lastName}` }))}
            onChange={setCoordinatorId}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rfq-deadline">{t('rfq.deadline')}</Label>
            <Input
              id="rfq-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="rfq-dokumentacja"
              checked={wymaganaDokumentacja}
              onCheckedChange={(checked) => setWymaganaDokumentacja(Boolean(checked))}
            />
            <Label htmlFor="rfq-dokumentacja">{t('rfq.wymaganaDokumentacja')}</Label>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t('rfq.certyfikaty')}</Label>
            <div className="flex flex-col gap-1">
              {certificates.map(cert => (
                <div key={cert.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`rfq-cert-${cert.id}`}
                    checked={certificateIds.includes(cert.id)}
                    onCheckedChange={(checked) => toggleCertificate(cert.id, Boolean(checked))}
                  />
                  <Label htmlFor={`rfq-cert-${cert.id}`} className="font-normal">
                    {cert.labelPL}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rfq-opis">{t('rfq.opis')}</Label>
            <Textarea id="rfq-opis" value={opis} onChange={(e) => setOpis(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button disabled={!valid || saving} onClick={() => void handleSubmit()}>
            {t('rfq.utworz')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
