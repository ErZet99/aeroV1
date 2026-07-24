import { delay, getDb, saveDb, nextId } from './db';
import type { BomNode, SupplierOffer } from '@/types/models';
import { recalcTree } from '@/services/costService';
import { round2 } from '@/lib/money';

function ownerNodesOf(node: BomNode, all: BomNode[]): BomNode[] {
  if (node.rfqId != null) return all.filter(n => n.rfqId === node.rfqId);
  return all.filter(n => n.templateId === node.templateId);
}

function persistRecalc(ownerNodes: BomNode[]): void {
  const db = getDb();
  const recalced = recalcTree(ownerNodes);
  recalced.forEach(n => {
    const idx = db.bomNodes.findIndex(bn => bn.id === n.id);
    if (idx >= 0) db.bomNodes[idx] = n;
  });
}

export async function getTree(ownerType: 'rfq' | 'template', ownerId: number): Promise<BomNode[]> {
  await delay();
  const db = getDb();
  const nodes = db.bomNodes.filter(n =>
    ownerType === 'rfq' ? n.rfqId === ownerId : n.templateId === ownerId
  );
  return JSON.parse(JSON.stringify(nodes));
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
  operationIds?: number[];
  materialId?: number | null;
  materialWymiary?: string;
  procesySpecjalne?: boolean;
  dodatkowe?: string;
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
    operationIds: input.operationIds ?? [],
    materialId: input.materialId ?? null,
    materialWymiary: input.materialWymiary ?? '',
    procesySpecjalne: input.procesySpecjalne ?? false,
    dodatkowe: input.dodatkowe ?? '',
    costSource: 'ROLLUP',
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

/** Save supplier offers; final price → MANUAL unitCost. */
export async function setSupplierOffers(nodeId: number, offers: SupplierOffer[]): Promise<BomNode | null> {
  await delay();
  const db = getDb();
  const node = db.bomNodes.find(n => n.id === nodeId);
  if (!node) return null;

  const limited = offers.slice(0, 3);
  let finalCount = 0;
  limited.forEach(o => {
    if (o.isFinal) {
      finalCount++;
      if (finalCount > 1) o.isFinal = false;
    }
  });

  node.supplierOffers = limited;
  const finalOffer = limited.find(o => o.isFinal);
  // Only promote to MANUAL when a real final price exists (preseed cena:0 stays ROLLUP).
  if (finalOffer && finalOffer.cena > 0) {
    node.costSource = 'MANUAL';
    node.unitCost = round2(finalOffer.cena);
  }

  const idx = db.bomNodes.findIndex(n => n.id === nodeId);
  db.bomNodes[idx] = node;

  persistRecalc(ownerNodesOf(node, db.bomNodes));
  saveDb();
  return db.bomNodes[db.bomNodes.findIndex(n => n.id === nodeId)];
}
