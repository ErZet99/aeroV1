import { delay, getDb, saveDb, nextId } from './db';
import type { Rfq } from '@/types/models';
import { nextRfqNumber } from '@/services/numberingService';
import { businessDaysBetween } from '@/lib/businessDays';

export interface RfqWithComputed extends Rfq {
  clientName?: string;
  coordinatorName?: string;
  dniDoWyslania?: number;
  dniPoWyslaniu?: number;
}

export async function list(): Promise<RfqWithComputed[]> {
  await delay();
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const holidayDates = db.holidays.map(h => h.date);

  return db.rfqs.map(rfq => {
    const client = db.clients.find(c => c.id === rfq.clientId);
    const coordinator = db.users.find(u => u.id === rfq.coordinatorId);

    let dniDoWyslania: number | undefined;
    if (!rfq.dataWyslania) {
      dniDoWyslania = businessDaysBetween(today, rfq.deadline, holidayDates);
    }

    let dniPoWyslaniu: number | undefined;
    if (rfq.dataWyslania) {
      dniPoWyslaniu = businessDaysBetween(rfq.dataWyslania, today, holidayDates);
    }

    return {
      ...rfq,
      clientName: client?.name,
      coordinatorName: coordinator ? `${coordinator.firstName} ${coordinator.lastName}` : '',
      dniDoWyslania,
      dniPoWyslaniu,
    };
  });
}

export async function get(id: number): Promise<RfqWithComputed | null> {
  await delay();
  const db = getDb();
  const rfq = db.rfqs.find(r => r.id === id);
  if (!rfq) return null;

  const today = new Date().toISOString().split('T')[0];
  const holidayDates = db.holidays.map(h => h.date);

  const client = db.clients.find(c => c.id === rfq.clientId);
  const coordinator = db.users.find(u => u.id === rfq.coordinatorId);

  let dniDoWyslania: number | undefined;
  if (!rfq.dataWyslania) {
    dniDoWyslania = businessDaysBetween(today, rfq.deadline, holidayDates);
  }

  let dniPoWyslaniu: number | undefined;
  if (rfq.dataWyslania) {
    dniPoWyslaniu = businessDaysBetween(rfq.dataWyslania, today, holidayDates);
  }

  return {
    ...rfq,
    clientName: client?.name,
    coordinatorName: coordinator ? `${coordinator.firstName} ${coordinator.lastName}` : '',
    dniDoWyslania,
    dniPoWyslaniu,
  };
}

export async function create(input: {
  nazwa: string;
  opis: string;
  clientId: number;
  entityId: number;
  inquiryTypeId: number;
  coordinatorId: number;
  deadline: string;
  wymaganaDokumentacja: boolean;
  certificateIds: number[];
}): Promise<Rfq> {
  await delay();
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const numer = nextRfqNumber(today, db.rfqs.map(r => r.numer));

  const newRfq: Rfq = {
    id: nextId('rfqs'),
    numer,
    clientId: input.clientId,
    entityId: input.entityId,
    inquiryTypeId: input.inquiryTypeId,
    nazwa: input.nazwa,
    opis: input.opis,
    status: 'NOWE',
    coordinatorId: input.coordinatorId,
    dataZapytania: today,
    deadline: input.deadline,
    dataWyslania: null,
    wymaganaDokumentacja: input.wymaganaDokumentacja,
    certificateIds: input.certificateIds,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.rfqs.push(newRfq);
  saveDb();
  return newRfq;
}

export async function update(id: number, patch: Partial<Rfq>): Promise<Rfq | null> {
  await delay();
  const db = getDb();
  const rfq = db.rfqs.find(r => r.id === id);
  if (!rfq) return null;

  // If setting status to WYSLANE and dataWyslania is null, set it to today
  if (patch.status === 'WYSLANE' && !rfq.dataWyslania) {
    patch.dataWyslania = new Date().toISOString().split('T')[0];
  }

  const updated = {
    ...rfq,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  const idx = db.rfqs.findIndex(r => r.id === id);
  db.rfqs[idx] = updated;
  saveDb();
  return updated;
}
