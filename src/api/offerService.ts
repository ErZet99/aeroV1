import { delay, getDb, saveDb, nextId } from './db';
import type { Offer, OfferLine, OfferRevision } from '@/types/models';
import type { OfferStatus, RabatType } from '@/types/enums';
import { round2 } from '@/lib/money';
import {
  captureRevisionSnapshot,
  captureSnapshot,
  nextRevisionLabel,
  snapshotEquals,
} from '@/services/offerDocument';

export { discountedTotal, offerSummary } from '@/services/offerDocument';

export interface OfferLineDTO {
  id: number;
  offerId: number;
  lp: number;
  nazwaPrzyrzadu: string;
  ilosc: number;
  sourceRfqId: number | null;
  sourceBomNodeId: number | null;
  kosztWykonania: number;
  rabat: number;
  cenaSprzedazy: number;
  wartosc?: number;
  zysk?: number;
  marza?: number;
}

/** One line in a working-copy save. `id: null` = new manual line to insert. */
export interface WorkingCopyLine {
  id: number | null;
  lp: number;
  nazwaPrzyrzadu: string;
  ilosc: number;
  kosztWykonania: number;
  rabat: number;
  cenaSprzedazy: number;
}

export interface WorkingCopyPayload {
  nrZamowieniaKlienta: string | null;
  rabatType: RabatType | null;
  rabatValue: number | null;
  lines: WorkingCopyLine[];
}

function toLineDtos(lines: OfferLine[], role?: string): OfferLineDTO[] {
  return lines.map(line => {
    const wartosc = round2((line.cenaSprzedazy - line.rabat) * line.ilosc);
    const zysk = round2((line.cenaSprzedazy - line.rabat - line.kosztWykonania) * line.ilosc);
    const marza = wartosc > 0 ? round2((zysk / wartosc) * 100) : 0;

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

  const lines = db.offerLines.filter(l => l.offerId === id).sort((a, b) => a.lp - b.lp);
  return {
    offer: JSON.parse(JSON.stringify(offer)),
    lines: toLineDtos(lines, role),
  };
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
    revision: null,
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
    rabat: 0,
    cenaSprzedazy: 0,
  }));

  db.offers.push(newOffer);
  db.offerLines.push(...newLines);
  saveDb();
  return JSON.parse(JSON.stringify(newOffer));
}

/**
 * Persist whole working copy (header + lines) — reconciles the line set:
 * updates existing, inserts manual lines (`id: null`), deletes omitted ones.
 * Does not create a revision.
 */
export async function saveWorkingCopy(id: number, payload: WorkingCopyPayload): Promise<Offer | null> {
  await delay();
  const db = getDb();
  const offerIdx = db.offers.findIndex(o => o.id === id);
  if (offerIdx < 0) return null;

  const offer = db.offers[offerIdx];
  db.offers[offerIdx] = {
    ...offer,
    nrZamowieniaKlienta: payload.nrZamowieniaKlienta,
    rabatType: payload.rabatType,
    rabatValue: payload.rabatValue,
    version: offer.version + 1,
    updatedAt: new Date().toISOString(),
  };

  const keptIds = new Set<number>();
  const rebuilt: OfferLine[] = payload.lines.map((patch, index) => {
    const lp = index + 1;
    if (patch.id !== null) {
      const existing = db.offerLines.find(l => l.id === patch.id && l.offerId === id);
      if (existing) {
        keptIds.add(existing.id);
        return {
          ...existing,
          lp,
          nazwaPrzyrzadu: patch.nazwaPrzyrzadu,
          ilosc: patch.ilosc,
          kosztWykonania: patch.kosztWykonania,
          rabat: patch.rabat,
          cenaSprzedazy: patch.cenaSprzedazy,
        };
      }
    }
    // New manual line — no BOM/RFQ source.
    const created: OfferLine = {
      id: nextId('offerLines'),
      offerId: id,
      lp,
      nazwaPrzyrzadu: patch.nazwaPrzyrzadu,
      ilosc: patch.ilosc,
      sourceRfqId: null,
      sourceBomNodeId: null,
      kosztWykonania: patch.kosztWykonania,
      rabat: patch.rabat,
      cenaSprzedazy: patch.cenaSprzedazy,
    };
    keptIds.add(created.id);
    return created;
  });

  // Drop lines the payload no longer contains; keep other offers' lines untouched.
  db.offerLines = db.offerLines.filter(l => l.offerId !== id || keptIds.has(l.id));
  for (const line of rebuilt) {
    const idx = db.offerLines.findIndex(l => l.id === line.id);
    if (idx >= 0) db.offerLines[idx] = line;
    else db.offerLines.push(line);
  }

  saveDb();
  return JSON.parse(JSON.stringify(db.offers[offerIdx]));
}

/** Status / header-only patch (no auto revision bump). Prefer saveWorkingCopy for commercial edits. */
export async function update(id: number, patch: Partial<Offer>): Promise<Offer | null> {
  await delay();
  const db = getDb();
  const offerIdx = db.offers.findIndex(o => o.id === id);
  if (offerIdx < 0) return null;

  const offer = db.offers[offerIdx];
  const { revision: _ignoreRevision, version: _ignoreVersion, ...safePatch } = patch;

  db.offers[offerIdx] = {
    ...offer,
    ...safePatch,
    version: offer.version + 1,
    updatedAt: new Date().toISOString(),
  };

  saveDb();
  return JSON.parse(JSON.stringify(db.offers[offerIdx]));
}

export async function listRevisions(offerId: number): Promise<OfferRevision[]> {
  await delay();
  const db = getDb();
  return JSON.parse(
    JSON.stringify(
      db.offerRevisions
        .filter(r => r.offerId === offerId)
        .sort((a, b) => a.revision.localeCompare(b.revision))
    )
  );
}

export async function getRevision(revisionId: number): Promise<OfferRevision | null> {
  await delay();
  const db = getDb();
  const rev = db.offerRevisions.find(r => r.id === revisionId);
  return rev ? JSON.parse(JSON.stringify(rev)) : null;
}

/** Freeze current working copy as next revision letter (A, B, C…). */
export async function createRevision(offerId: number, userId: number): Promise<OfferRevision> {
  await delay();
  const db = getDb();
  const offerIdx = db.offers.findIndex(o => o.id === offerId);
  if (offerIdx < 0) throw new Error('Offer not found');

  const offer = db.offers[offerIdx];
  const lines = db.offerLines.filter(l => l.offerId === offerId);
  const existing = db.offerRevisions.filter(r => r.offerId === offerId).map(r => r.revision);
  const label = nextRevisionLabel(existing);
  const snapshot = captureRevisionSnapshot(offer, lines, db.bomNodes);

  const revision: OfferRevision = {
    id: nextId('offerRevisions'),
    offerId,
    revision: label,
    snapshot,
    createdBy: userId,
    createdAt: new Date().toISOString(),
  };

  db.offerRevisions.push(revision);
  db.offers[offerIdx] = {
    ...offer,
    revision: label,
    version: offer.version + 1,
    updatedAt: new Date().toISOString(),
  };
  saveDb();
  return JSON.parse(JSON.stringify(revision));
}

/** True when a revision exists and equals the current working copy. */
export function hasUpToDateRevision(offerId: number): boolean {
  const db = getDb();
  const offer = db.offers.find(o => o.id === offerId);
  if (!offer || !offer.revision) return false;
  const rev = db.offerRevisions.find(r => r.offerId === offerId && r.revision === offer.revision);
  if (!rev) return false;
  const lines = db.offerLines.filter(l => l.offerId === offerId);
  return snapshotEquals(captureSnapshot(offer, lines), rev.snapshot);
}

/**
 * Mark offer as WYSLANA. Requires an up-to-date revision.
 * Cascades RFQ → WYSLANE and stamps dataWyslania.
 */
export async function markAsSent(id: number): Promise<Offer> {
  await delay();
  const db = getDb();
  const offerIdx = db.offers.findIndex(o => o.id === id);
  if (offerIdx < 0) throw new Error('Offer not found');

  const offer = db.offers[offerIdx];
  if (offer.status !== 'SZKIC') {
    throw new Error('Only SZKIC offers can be marked as sent');
  }
  if (!hasUpToDateRevision(id)) {
    throw new Error('Save as revision first');
  }

  db.offers[offerIdx] = {
    ...offer,
    status: 'WYSLANA' as OfferStatus,
    version: offer.version + 1,
    updatedAt: new Date().toISOString(),
  };

  const rfq = db.rfqs.find(r => r.id === offer.rfqId);
  if (rfq) {
    rfq.status = 'WYSLANE';
    if (!rfq.dataWyslania) {
      rfq.dataWyslania = new Date().toISOString().split('T')[0];
    }
    rfq.updatedAt = new Date().toISOString();
  }

  saveDb();
  return JSON.parse(JSON.stringify(db.offers[offerIdx]));
}
