import { delay, getDb, saveDb, nextId } from './db';
import type { BomNode, BomNodeOperation, SupplierOffer } from '@/types/models';
import { recalcTree } from '@/services/costService';

function ownerNodesOf(node: BomNode, all: BomNode[]): BomNode[] {
  if (node.rfqId != null) return all.filter(n => n.rfqId === node.rfqId);
  return all.filter(n => n.templateId === node.templateId);
}

function persistRecalc(ownerNodes: BomNode[]): BomNode[] {
  const db = getDb();
  const recalced = recalcTree(ownerNodes);
  recalced.forEach(n => {
    const idx = db.bomNodes.findIndex(bn => bn.id === n.id);
    if (idx >= 0) db.bomNodes[idx] = n;
  });
  return recalced;
}

function emptyOps(ids: number[] = []): BomNodeOperation[] {
  return ids.map(operationId => ({
    operationId,
    cena: 0,
    supplierId: null,
    supplierOffers: [],
  }));
}

export async function getTree(ownerType: 'rfq' | 'template', ownerId: number): Promise<BomNode[]> {
  await delay();
  const db = getDb();
  const nodes = db.bomNodes.filter(n =>
    ownerType === 'rfq' ? n.rfqId === ownerId : n.templateId === ownerId
  );
  return JSON.parse(JSON.stringify(nodes));
}

/** Replace entire owner tree (document save). Recalcs and persists. */
export async function replaceTree(
  ownerType: 'rfq' | 'template',
  ownerId: number,
  nodes: BomNode[]
): Promise<BomNode[]> {
  await delay();
  const db = getDb();
  db.bomNodes = db.bomNodes.filter(n =>
    ownerType === 'rfq' ? n.rfqId !== ownerId : n.templateId !== ownerId
  );

  const copy = JSON.parse(JSON.stringify(nodes)) as BomNode[];
  copy.forEach(n => {
    if (ownerType === 'rfq') {
      n.rfqId = ownerId;
      n.templateId = null;
    } else {
      n.templateId = ownerId;
      n.rfqId = null;
    }
  });

  const recalced = recalcTree(copy);
  db.bomNodes.push(...recalced);
  saveDb();
  return JSON.parse(JSON.stringify(recalced));
}

export async function addNode(input: {
  ownerType: 'rfq' | 'template';
  ownerId: number;
  parentId: number | null;
  numerDetalu: string;
  ilosc: number;
  nazwaOpis: string;
  groupId: number;
  kindId: number;
  operations?: BomNodeOperation[];
  materialId?: number | null;
  materialWymiary?: string;
  materialCost?: number;
  procesySpecjalne?: boolean;
  dodatkowe?: string;
  manualUnitCost?: number | null;
  supplierOffers?: SupplierOffer[];
}): Promise<BomNode> {
  await delay();
  const db = getDb();

  const ownerNodes = db.bomNodes.filter(n => {
    if (input.ownerType === 'rfq') return n.rfqId === input.ownerId;
    return n.templateId === input.ownerId;
  });

  const siblings = ownerNodes.filter(n => n.parentId === input.parentId);
  const lp = siblings.length + 1;

  const newNode: BomNode = {
    id: nextId('bomNodes'),
    rfqId: input.ownerType === 'rfq' ? input.ownerId : null,
    templateId: input.ownerType === 'template' ? input.ownerId : null,
    parentId: input.parentId,
    lp,
    numerDetalu: input.numerDetalu,
    ilosc: input.ilosc,
    nazwaOpis: input.nazwaOpis,
    groupId: input.groupId,
    kindId: input.kindId,
    operations: input.operations ?? emptyOps(),
    materialId: input.materialId ?? null,
    materialWymiary: input.materialWymiary ?? '',
    materialCost: input.materialCost ?? 0,
    procesySpecjalne: input.procesySpecjalne ?? false,
    dodatkowe: input.dodatkowe ?? '',
    manualUnitCost: input.manualUnitCost ?? null,
    ownCost: 0,
    unitCost: 0,
    totalCost: 0,
    supplierOffers: input.supplierOffers ?? [],
    version: 1,
  };

  db.bomNodes.push(newNode);
  persistRecalc(ownerNodes.concat([newNode]));
  saveDb();
  return db.bomNodes.find(n => n.id === newNode.id)!;
}

export async function updateNode(id: number, patch: Partial<BomNode>): Promise<BomNode | null> {
  await delay();
  const db = getDb();
  const nodeIdx = db.bomNodes.findIndex(n => n.id === id);
  if (nodeIdx < 0) return null;

  const node = db.bomNodes[nodeIdx];
  db.bomNodes[nodeIdx] = { ...node, ...patch };

  persistRecalc(ownerNodesOf(node, db.bomNodes));
  saveDb();
  return db.bomNodes[nodeIdx];
}

export async function deleteNode(id: number): Promise<boolean> {
  await delay();
  const db = getDb();
  const node = db.bomNodes.find(n => n.id === id);
  if (!node) return false;

  const toDelete = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    db.bomNodes.forEach(n => {
      if (n.parentId !== null && toDelete.has(n.parentId) && !toDelete.has(n.id)) {
        toDelete.add(n.id);
        changed = true;
      }
    });
  }

  db.bomNodes = db.bomNodes.filter(n => !toDelete.has(n.id));

  const remaining = ownerNodesOf(node, db.bomNodes);
  if (remaining.length > 0) persistRecalc(remaining);

  saveDb();
  return true;
}

/** Apply supplier offers locally (caller persists via replaceTree / updateNode). */
export function applyNodeSupplierOffers(node: BomNode, offers: SupplierOffer[]): BomNode {
  const limited = offers.slice(0, 3);
  let finalCount = 0;
  limited.forEach(o => {
    if (o.isFinal) {
      finalCount++;
      if (finalCount > 1) o.isFinal = false;
    }
  });
  return { ...node, supplierOffers: limited };
}

/** Final quote → operation.cena (+ optional supplierId). */
export function applyOperationSupplierOffers(
  op: BomNodeOperation,
  offers: SupplierOffer[]
): BomNodeOperation {
  const limited = offers.slice(0, 3);
  let finalCount = 0;
  limited.forEach(o => {
    if (o.isFinal) {
      finalCount++;
      if (finalCount > 1) o.isFinal = false;
    }
  });
  const finalOffer = limited.find(o => o.isFinal);
  return {
    ...op,
    supplierOffers: limited,
    cena: finalOffer ? finalOffer.cena : op.cena,
    supplierId: finalOffer ? finalOffer.supplierId : op.supplierId,
  };
}

/** Save supplier offers on node; final price feeds ownCost via recalc. */
export async function setSupplierOffers(nodeId: number, offers: SupplierOffer[]): Promise<BomNode | null> {
  await delay();
  const db = getDb();
  const node = db.bomNodes.find(n => n.id === nodeId);
  if (!node) return null;

  const updated = applyNodeSupplierOffers(node, offers);
  const idx = db.bomNodes.findIndex(n => n.id === nodeId);
  db.bomNodes[idx] = updated;

  persistRecalc(ownerNodesOf(updated, db.bomNodes));
  saveDb();
  return db.bomNodes[idx];
}

/** Allocate a new node id without persisting (working-copy add). */
export function allocNodeId(): number {
  return nextId('bomNodes');
}
