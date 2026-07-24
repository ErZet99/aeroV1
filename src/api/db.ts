import type {
  User, Entity, Client, Supplier, DictItem, Holiday, Rfq, BomNode, Template, Offer, OfferLine,
  OfferRevision, Order, ComponentGroup, ComponentKind, Operation, ComponentKindSupplier,
} from '@/types/models';
import {
  seedUsers,
  seedEntities,
  seedClients,
  seedSuppliers,
  seedInquiryTypes,
  seedMaterials,
  seedCertificates,
  seedDeliveryTimes,
  seedHolidays,
  seedRfqs,
  seedBomNodes,
  seedTemplates,
  seedOffers,
  seedOfferLines,
  seedOfferRevisions,
  seedComponentGroups,
  seedComponentKinds,
  seedOperations,
  seedComponentKindSuppliers,
} from './seed';
import { recalcTree } from '@/services/costService';
import { nodeSubtree } from '@/services/bomEditor';
import type { OfferRevisionSnapshot } from '@/types/models';

export interface Db {
  users: User[];
  entities: Entity[];
  clients: Client[];
  suppliers: Supplier[];
  componentGroups: ComponentGroup[];
  componentKinds: ComponentKind[];
  operations: Operation[];
  componentKindSuppliers: ComponentKindSupplier[];
  inquiryTypes: DictItem[];
  materials: DictItem[];
  certificates: DictItem[];
  deliveryTimes: DictItem[];
  holidays: Holiday[];
  rfqs: Rfq[];
  bomNodes: BomNode[];
  templates: Template[];
  offers: Offer[];
  offerLines: OfferLine[];
  offerRevisions: OfferRevision[];
  orders: Order[];
  counters: Record<string, number>;
}

export class ConflictError extends Error {
  current: unknown;

  constructor(current: unknown) {
    super('Version conflict');
    this.current = current;
  }
}

const DB_KEY = 'aero-erp-db-v8';

function createInitialDb(): Db {
  const bomNodes = JSON.parse(JSON.stringify(seedBomNodes)) as BomNode[];

  const rfqIds = new Set<number>();
  const templateIds = new Set<number>();

  bomNodes.forEach(node => {
    if (node.rfqId !== null) rfqIds.add(node.rfqId);
    if (node.templateId !== null) templateIds.add(node.templateId);
  });

  rfqIds.forEach(rfqId => {
    const ownerNodes = bomNodes.filter(n => n.rfqId === rfqId);
    const recalced = recalcTree(ownerNodes);
    recalced.forEach(n => {
      const idx = bomNodes.findIndex(bn => bn.id === n.id);
      if (idx >= 0) bomNodes[idx] = n;
    });
  });

  templateIds.forEach(templateId => {
    const ownerNodes = bomNodes.filter(n => n.templateId === templateId);
    const recalced = recalcTree(ownerNodes);
    recalced.forEach(n => {
      const idx = bomNodes.findIndex(bn => bn.id === n.id);
      if (idx >= 0) bomNodes[idx] = n;
    });
  });

  return {
    users: JSON.parse(JSON.stringify(seedUsers)),
    entities: JSON.parse(JSON.stringify(seedEntities)),
    clients: JSON.parse(JSON.stringify(seedClients)),
    suppliers: JSON.parse(JSON.stringify(seedSuppliers)),
    componentGroups: JSON.parse(JSON.stringify(seedComponentGroups)),
    componentKinds: JSON.parse(JSON.stringify(seedComponentKinds)),
    operations: JSON.parse(JSON.stringify(seedOperations)),
    componentKindSuppliers: JSON.parse(JSON.stringify(seedComponentKindSuppliers)),
    inquiryTypes: JSON.parse(JSON.stringify(seedInquiryTypes)),
    materials: JSON.parse(JSON.stringify(seedMaterials)),
    certificates: JSON.parse(JSON.stringify(seedCertificates)),
    deliveryTimes: JSON.parse(JSON.stringify(seedDeliveryTimes)),
    holidays: JSON.parse(JSON.stringify(seedHolidays)),
    rfqs: JSON.parse(JSON.stringify(seedRfqs)),
    bomNodes,
    templates: JSON.parse(JSON.stringify(seedTemplates)),
    offers: JSON.parse(JSON.stringify(seedOffers)),
    offerLines: JSON.parse(JSON.stringify(seedOfferLines)),
    offerRevisions: JSON.parse(JSON.stringify(seedOfferRevisions)),
    orders: [],
    counters: {
      users: 4,
      entities: 3,
      clients: 7,
      suppliers: 30,
      componentGroups: 6,
      componentKinds: 53,
      operations: 69,
      componentKindSuppliers: 37,
      inquiryTypes: 6,
      materials: 9,
      certificates: 5,
      deliveryTimes: 9,
      holidays: 9,
      rfqs: 11,
      bomNodes: 22,
      templates: 3,
      offers: 3,
      offerLines: 3,
      offerRevisions: 2,
      orders: 0,
    },
  };
}

let db: Db | null = null;

const memoryStore = new Map<string, string>();

function storageGet(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined' && localStorage?.getItem) {
      return localStorage.getItem(key);
    }
  } catch {
    /* vitest / node without DOM storage */
  }
  return memoryStore.get(key) ?? null;
}

function storageSet(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined' && localStorage?.setItem) {
      localStorage.setItem(key, value);
      return;
    }
  } catch {
    /* fall through */
  }
  memoryStore.set(key, value);
}

function storageRemove(key: string): void {
  try {
    if (typeof localStorage !== 'undefined' && localStorage?.removeItem) {
      localStorage.removeItem(key);
    }
  } catch {
    /* fall through */
  }
  memoryStore.delete(key);
}

export function getDb(): Db {
  if (!db) {
    const stored = storageGet(DB_KEY);
    if (stored) {
      db = JSON.parse(stored) as Db;
      // Stale localStorage from older prototype — backfill cascade tables.
      if (!db.componentGroups?.length) {
        db.componentGroups = JSON.parse(JSON.stringify(seedComponentGroups));
      }
      if (!db.componentKinds?.length) {
        db.componentKinds = JSON.parse(JSON.stringify(seedComponentKinds));
      }
      if (!db.operations?.length) {
        db.operations = JSON.parse(JSON.stringify(seedOperations));
      }
      if (!db.componentKindSuppliers?.length) {
        db.componentKindSuppliers = JSON.parse(JSON.stringify(seedComponentKindSuppliers));
      }
      if (!db.suppliers?.length) {
        db.suppliers = JSON.parse(JSON.stringify(seedSuppliers));
      }
      if (!db.offerRevisions) {
        db.offerRevisions = JSON.parse(JSON.stringify(seedOfferRevisions));
      }
      if (!db.orders) {
        db.orders = [];
      }
      if (db.counters && db.counters.orders == null) {
        db.counters.orders = 0;
      }
      // Option A: older revisions froze commercial lines only — backfill trees from live BOM.
      db.offerRevisions = db.offerRevisions.map(rev => {
        const snapshot = rev.snapshot as OfferRevisionSnapshot;
        return {
          ...rev,
          snapshot: {
            ...snapshot,
            lines: snapshot.lines.map(line => {
              if (Array.isArray(line.bomSnapshot)) return line;
              const bomSnapshot =
                line.sourceBomNodeId == null
                  ? []
                  : (JSON.parse(
                      JSON.stringify(nodeSubtree(db!.bomNodes, line.sourceBomNodeId))
                    ) as BomNode[]);
              return { ...line, bomSnapshot };
            }),
          },
        };
      });
      db.bomNodes.forEach(n => {
        if (n.orderId === undefined) n.orderId = null;
      });
      saveDb();
    } else {
      db = createInitialDb();
      saveDb();
    }
  }
  return db as Db;
}

export function saveDb(): void {
  if (db) {
    storageSet(DB_KEY, JSON.stringify(db));
  }
}

export function nextId(collection: keyof Omit<Db, 'counters'>): number {
  const database = getDb();
  database.counters[collection] = (database.counters[collection] || 0) + 1;
  saveDb();
  return database.counters[collection];
}

/** Wipe persisted DB. Pass reload=true from UI; tests omit reload. */
export function resetDb(reload = false): void {
  storageRemove(DB_KEY);
  storageRemove('aero-erp-db-v7');
  storageRemove('aero-erp-db-v6');
  storageRemove('aero-erp-db-v5');
  storageRemove('aero-erp-db-v4');
  storageRemove('aero-erp-db-v3');
  storageRemove('aero-erp-db-v2');
  db = null;
  if (reload && typeof location !== 'undefined' && location.reload) {
    location.reload();
  }
}

export function delay(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 100));
}
