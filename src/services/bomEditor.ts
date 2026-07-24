import type { BomNode, BomNodeOperation, SupplierOffer } from '@/types/models';

export function isBomRoot(node: Pick<BomNode, 'parentId'>): boolean {
  return node.parentId === null;
}

export function validateBomNodeFields(fields: {
  isRoot: boolean;
  nazwaOpis: string;
  ilosc: number;
  groupId: number | null;
  kindId: number | null;
}): boolean {
  if (fields.nazwaOpis.trim() === '') return false;
  if (!(fields.ilosc >= 1)) return false;
  if (fields.isRoot) return true;
  return fields.groupId !== null && fields.kindId !== null;
}

/** Lean root payload — no classification, material, operations, or suppliers. */
export function leanRootFields(input: {
  numerDetalu: string;
  ilosc: number;
  nazwaOpis: string;
  manualUnitCost: number | null;
}): Omit<
  BomNode,
  'id' | 'rfqId' | 'templateId' | 'orderId' | 'parentId' | 'lp' | 'ownCost' | 'unitCost' | 'totalCost' | 'version'
> {
  return {
    numerDetalu: input.numerDetalu,
    ilosc: input.ilosc,
    nazwaOpis: input.nazwaOpis,
    groupId: null,
    kindId: null,
    operations: [] as BomNodeOperation[],
    materialId: null,
    materialWymiary: '',
    materialCost: 0,
    procesySpecjalne: false,
    dodatkowe: '',
    manualUnitCost: input.manualUnitCost,
    supplierOffers: [] as SupplierOffer[],
  };
}

/**
 * Descendants of the active product card for the table — never includes the root
 * itself (04-UI.md §6). Direct children become table top-level rows when built.
 */
export function activeCardSubtree(nodes: BomNode[], activeRootId: number | null): BomNode[] {
  if (activeRootId === null) return [];
  const result: BomNode[] = [];
  const queue = [activeRootId];
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    nodes
      .filter(n => n.parentId === parentId)
      .sort((a, b) => a.lp - b.lp)
      .forEach(n => {
        result.push(n);
        queue.push(n.id);
      });
  }
  return result;
}

/** Root node plus every descendant, root first. */
export function nodeSubtree(nodes: BomNode[], rootId: number): BomNode[] {
  const root = nodes.find(n => n.id === rootId);
  if (!root) return [];
  return [root, ...activeCardSubtree(nodes, rootId)];
}

export type BomRowGesture = 'click' | 'dblclick';

export type BomRowOutcome =
  | { type: 'select'; nodeId: number }
  | { type: 'deselect' }
  | { type: 'edit'; nodeId: number };

/** Single click toggles selection (action bar). Double click → edit. Never open edit on click. */
export function resolveBomRowGesture(
  gesture: BomRowGesture,
  nodeId: number,
  selectedId: number | null
): BomRowOutcome {
  if (gesture === 'dblclick') return { type: 'edit', nodeId };
  if (selectedId === nodeId) return { type: 'deselect' };
  return { type: 'select', nodeId };
}
