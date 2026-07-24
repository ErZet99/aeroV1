import type { BomNode } from '@/types/models';
import { round2 } from '@/lib/money';

/** Recalculate unitCost/totalCost bottom-up. MANUAL keeps unitCost; ROLLUP sums children.totalCost. */
export function recalcTree(nodes: BomNode[]): BomNode[] {
  const nodesCopy = JSON.parse(JSON.stringify(nodes)) as BomNode[];
  const roots = nodesCopy.filter(n => n.parentId === null);

  function visit(node: BomNode): void {
    const children = nodesCopy.filter(n => n.parentId === node.id);
    children.forEach(child => visit(child));

    if (node.costSource === 'ROLLUP') {
      if (children.length > 0) {
        node.unitCost = round2(children.reduce((acc, c) => acc + (c.totalCost || 0), 0));
      } else {
        node.unitCost = 0;
      }
    }

    node.totalCost = round2((node.unitCost || 0) * (node.ilosc || 0));
  }

  roots.forEach(root => visit(root));
  return nodesCopy;
}
