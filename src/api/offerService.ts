import { delay, getDb, saveDb, nextId } from './db';
import type { Offer, OfferLine } from '@/types/models';
import type { RabatType } from '@/types/enums';
import { nextRevision } from '@/services/numberingService';
import { round2 } from '@/lib/money';

/** Offer total after discount, per plan 1b: PROCENT → total*(1-v/100), KWOTA → total-v (round2). */
export function discountedTotal(
  total: number,
  rabatType: RabatType | null,
  rabatValue: number | null
): number {
  if (!rabatType || rabatValue === null) return round2(total);
  if (rabatType === 'PROCENT') return round2(total * (1 - rabatValue / 100));
  return round2(total - rabatValue);
}

export interface OfferLineDTO {
  id: number;
  offerId: number;
  lp: number;
  nazwaPrzyrzadu: string;
  ilosc: number;
  sourceRfqId: number | null;
  sourceBomNodeId: number | null;
  kosztWykonania: number;
  negocjacje: number;
  cenaSprzedazy: number;
  wartosc?: number;
  zysk?: number;
  marza?: number;
}

export async function list(): Promise<Offer[]> {
  await delay();
  const db = getDb();
  return JSON.parse(JSON.stringify(db.offers));
}

export async function findByRfqId(rfqId: number): Promise<Offer | null> {
  await delay();
  const db = getDb();
  const offer = db.offers.find(o => o.rfqId === rfqId);
  return offer ? JSON.parse(JSON.stringify(offer)) : null;
}

export async function get(id: number, role?: string): Promise<{ offer: Offer; lines: OfferLineDTO[] } | null> {
  await delay();
  const db = getDb();
  const offer = db.offers.find(o => o.id === id);
  if (!offer) return null;

  let lines = db.offerLines.filter(l => l.offerId === id);

  // Snapshot frozen at create — later inquiry edits do not rewrite line costs.
  const lineDtos = lines.map(line => {
    const wartosc = round2((line.cenaSprzedazy + line.negocjacje) * line.ilosc);
    const zysk = round2((line.cenaSprzedazy + line.negocjacje - line.kosztWykonania) * line.ilosc);
    const marza = wartosc > 0 ? round2(zysk / wartosc * 100) : 0;

    const dto: OfferLineDTO = {
      ...line,
      wartosc,
    };

    if (role !== 'PRACOWNIK') {
      dto.zysk = zysk;
      dto.marza = marza;
    }

    return dto;
  });

  return { offer, lines: lineDtos };
}

/** Create offer from RFQ (1:1). rootNodeIds = selected main products; omit = all roots. */
export async function createFromRfq(
  rfqId: number,
  currentUserId: number,
  rootNodeIds?: number[]
): Promise<Offer> {
  await delay();
  const db = getDb();
  const rfq = db.rfqs.find(r => r.id === rfqId);
  if (!rfq) throw new Error('RFQ not found');

  if (db.offers.some(o => o.rfqId === rfqId)) {
    throw new Error('Offer already exists for this RFQ');
  }

  let bomRoots = db.bomNodes
    .filter(n => n.rfqId === rfqId && n.parentId === null)
    .sort((a, b) => a.lp - b.lp);

  if (rootNodeIds && rootNodeIds.length > 0) {
    const idSet = new Set(rootNodeIds);
    bomRoots = bomRoots.filter(r => idSet.has(r.id));
  }

  if (bomRoots.length === 0) {
    throw new Error('No root products selected');
  }

  const newOffer: Offer = {
    id: nextId('offers'),
    rfqId,
    numer: rfq.numer,
    revision: 'A',
    entityId: rfq.entityId,
    clientId: rfq.clientId,
    nrZamowieniaKlienta: null,
    status: 'SZKIC',
    rabatType: null,
    rabatValue: null,
    salesRepId: currentUserId,
    deliveryTimeId: null,
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const newLines: OfferLine[] = bomRoots.map((root, index) => ({
    id: nextId('offerLines'),
    offerId: newOffer.id,
    lp: index + 1,
    nazwaPrzyrzadu: root.nazwaOpis || rfq.nazwa,
    ilosc: 1,
    sourceRfqId: rfqId,
    sourceBomNodeId: root.id,
    kosztWykonania: root.totalCost,
    negocjacje: 0,
    cenaSprzedazy: 0,
  }));

  db.offers.push(newOffer);
  db.offerLines.push(...newLines);
  saveDb();
  return newOffer;
}

export async function updateLine(lineId: number, patch: Partial<OfferLine>): Promise<OfferLine | null> {
  await delay();
  const db = getDb();
  const lineIdx = db.offerLines.findIndex(l => l.id === lineId);
  if (lineIdx < 0) return null;

  const line = db.offerLines[lineIdx];
  const offer = db.offers.find(o => o.id === line.offerId);
  if (!offer) return null;

  if (offer.status !== 'SZKIC') {
    offer.revision = nextRevision(offer.revision);
    offer.updatedAt = new Date().toISOString();
  }

  db.offerLines[lineIdx] = { ...line, ...patch };
  saveDb();
  return db.offerLines[lineIdx];
}

export async function update(id: number, patch: Partial<Offer>): Promise<Offer | null> {
  await delay();
  const db = getDb();
  const offerIdx = db.offers.findIndex(o => o.id === id);
  if (offerIdx < 0) return null;

  const offer = db.offers[offerIdx];

  if (offer.status !== 'SZKIC') {
    patch.revision = nextRevision(offer.revision);
  }

  db.offers[offerIdx] = {
    ...offer,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  saveDb();
  return db.offers[offerIdx];
}

export async function finalize(id: number): Promise<Offer | null> {
  await delay();
  const db = getDb();
  const offer = db.offers.find(o => o.id === id);
  if (!offer || offer.status !== 'SZKIC') return null;

  offer.status = 'WYSLANA';
  offer.updatedAt = new Date().toISOString();
  saveDb();
  return offer;
}

export async function applyDiscount(id: number, type: string, value: number): Promise<Offer | null> {
  await delay();
  const db = getDb();
  const offer = db.offers.find(o => o.id === id);
  if (!offer) return null;

  offer.rabatType = type as RabatType;
  offer.rabatValue = value;

  if (offer.status !== 'SZKIC') {
    offer.revision = nextRevision(offer.revision);
  }

  offer.updatedAt = new Date().toISOString();
  saveDb();
  return offer;
}
