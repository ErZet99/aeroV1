import { delay, getDb, saveDb, nextId } from './db';
import type { BomNode, Order } from '@/types/models';
import type { OrderStatus } from '@/types/enums';
import { nextOrderNumber } from '@/services/numberingService';
import { recalcTree } from '@/services/costService';

export interface OrderHeaderPayload {
  nazwa: string;
  opis: string;
  status: OrderStatus;
}

/** Frozen revision trees → editable nodes owned by the order (`03-RULES.md` §4). */
function materializeTree(frozenNodes: BomNode[], orderId: number): BomNode[] {
  const idMap = new Map<number, number>();
  frozenNodes.forEach(node => idMap.set(node.id, nextId('bomNodes')));

  return frozenNodes.map(node => ({
    ...(JSON.parse(JSON.stringify(node)) as BomNode),
    id: idMap.get(node.id)!,
    rfqId: null,
    templateId: null,
    orderId,
    parentId: node.parentId !== null ? idMap.get(node.parentId) ?? null : null,
  }));
}

/** Manual offer lines freeze an empty tree — still become a root product on the order. */
function syntheticRootFromLine(
  line: { nazwaPrzyrzadu: string; ilosc: number; kosztWykonania: number },
  orderId: number,
  lp: number
): BomNode {
  return {
    id: nextId('bomNodes'),
    rfqId: null,
    templateId: null,
    orderId,
    parentId: null,
    lp,
    numerDetalu: '',
    ilosc: line.ilosc,
    nazwaOpis: line.nazwaPrzyrzadu,
    groupId: null,
    kindId: null,
    operations: [],
    materialId: null,
    materialWymiary: '',
    materialCost: 0,
    procesySpecjalne: false,
    dodatkowe: '',
    manualUnitCost: line.kosztWykonania,
    ownCost: line.kosztWykonania,
    unitCost: line.kosztWykonania,
    totalCost: line.kosztWykonania * line.ilosc,
    supplierOffers: [],
    version: 1,
  };
}

export async function list(): Promise<Order[]> {
  await delay();
  const db = getDb();
  return JSON.parse(JSON.stringify(db.orders));
}

export async function get(id: number): Promise<Order | null> {
  await delay();
  const db = getDb();
  const order = db.orders.find(o => o.id === id);
  return order ? JSON.parse(JSON.stringify(order)) : null;
}

/**
 * Create an order from a frozen offer revision: allocate the number, deep copy the
 * revision trees, cascade offer → ZAAKCEPTOWANA and inquiry → ZAAKCEPTOWANE.
 */
export async function createFromRevision(revisionId: number): Promise<Order> {
  await delay();
  const db = getDb();

  const revision = db.offerRevisions.find(r => r.id === revisionId);
  if (!revision) throw new Error('Revision not found');

  const offer = db.offers.find(o => o.id === revision.offerId);
  if (!offer) throw new Error('Offer not found');

  const rfq = db.rfqs.find(r => r.id === offer.rfqId);
  const now = new Date().toISOString();

  const order: Order = {
    id: nextId('orders'),
    numer: nextOrderNumber(now, db.orders.map(o => o.numer)),
    offerId: offer.id,
    offerRevisionId: revision.id,
    clientId: offer.clientId,
    entityId: offer.entityId,
    status: 'NOWE',
    nazwa: rfq?.nazwa ?? offer.numer,
    opis: rfq?.opis ?? '',
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  const frozenNodes = revision.snapshot.lines.flatMap((line, index) => {
    if (line.bomSnapshot.length > 0) {
      return materializeTree(line.bomSnapshot, order.id);
    }
    return [syntheticRootFromLine(line, order.id, index + 1)];
  });
  const materialized = recalcTree(frozenNodes);

  db.orders.push(order);
  db.bomNodes.push(...materialized);

  offer.status = 'ZAAKCEPTOWANA';
  offer.version += 1;
  offer.updatedAt = now;

  if (rfq) {
    rfq.status = 'ZAAKCEPTOWANE';
    rfq.version += 1;
    rfq.updatedAt = now;
  }

  saveDb();
  return JSON.parse(JSON.stringify(order));
}

/** Persist the order header. The BOM tree commits separately via bomService.replaceTree. */
export async function save(id: number, payload: OrderHeaderPayload): Promise<Order | null> {
  await delay();
  const db = getDb();
  const idx = db.orders.findIndex(o => o.id === id);
  if (idx < 0) return null;

  db.orders[idx] = {
    ...db.orders[idx],
    nazwa: payload.nazwa,
    opis: payload.opis,
    status: payload.status,
    version: db.orders[idx].version + 1,
    updatedAt: new Date().toISOString(),
  };

  saveDb();
  return JSON.parse(JSON.stringify(db.orders[idx]));
}
