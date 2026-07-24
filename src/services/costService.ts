import type { BomNode } from '@/types/models';
import { round2 } from '@/lib/money';

/** Own cost: final node quote when no ops (ZAKUPOWA); else material + operation prices. */
export function computeOwnCost(node: BomNode): number {
  const finalOffer = (node.operations?.length ?? 0) === 0
    ? node.supplierOffers.find(o => o.isFinal)
    : undefined;
  if (finalOffer) return round2(finalOffer.cena || 0);

  const opsSum = (node.operations ?? []).reduce((acc, o) => acc + (o.cena || 0), 0);
  return round2((node.materialCost || 0) + opsSum);
}

/** Breakdown unit cost before manual override (own + children totals). */
export function computedUnitCost(node: BomNode, children: BomNode[]): number {
  const childrenTotal = children.reduce((acc, c) => acc + (c.totalCost || 0), 0);
  return round2((node.ownCost || 0) + childrenTotal);
}

/** Recalculate ownCost / unitCost / totalCost bottom-up; bubble to roots. */
export function recalcTree(nodes: BomNode[]): BomNode[] {
  const nodesCopy = JSON.parse(JSON.stringify(nodes)) as BomNode[];
  const roots = nodesCopy.filter(n => n.parentId === null);

  function visit(node: BomNode): void {
    const children = nodesCopy.filter(n => n.parentId === node.id);
    children.forEach(child => visit(child));

    node.ownCost = computeOwnCost(node);
    const computed = computedUnitCost(node, children);
    node.unitCost =
      node.manualUnitCost !== null && node.manualUnitCost !== undefined
        ? round2(node.manualUnitCost)
        : computed;
    node.totalCost = round2((node.unitCost || 0) * (node.ilosc || 0));
  }

  roots.forEach(root => visit(root));
  return nodesCopy;
}
