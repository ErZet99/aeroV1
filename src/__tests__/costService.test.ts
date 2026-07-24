import { describe, it, expect } from 'vitest';
import { computedUnitCost, recalcTree } from '@/services/costService';
import type { BomNode, BomNodeOperation } from '@/types/models';

function op(partial: Partial<BomNodeOperation> & Pick<BomNodeOperation, 'operationId'>): BomNodeOperation {
  return {
    cena: 0,
    supplierId: null,
    supplierOffers: [],
    ...partial,
  };
}

function node(partial: Partial<BomNode> & Pick<BomNode, 'id' | 'parentId'>): BomNode {
  return {
    rfqId: 1,
    templateId: null,
    lp: 1,
    numerDetalu: '',
    ilosc: 1,
    nazwaOpis: '',
    groupId: null as number | null,
    kindId: null as number | null,
    operations: [],
    materialId: null,
    materialWymiary: '',
    materialCost: 0,
    procesySpecjalne: false,
    dodatkowe: '',
    manualUnitCost: null,
    ownCost: 0,
    unitCost: 0,
    totalCost: 0,
    supplierOffers: [],
    version: 1,
    ...partial,
  };
}

describe('costService', () => {
  it('ownCost = material + operation prices for operational node', () => {
    const nodes: BomNode[] = [
      node({
        id: 1,
        parentId: null,
        materialCost: 100,
        operations: [op({ operationId: 1, cena: 40 }), op({ operationId: 2, cena: 10 })],
      }),
    ];

    const leaf = recalcTree(nodes)[0];
    expect(leaf.ownCost).toBe(150);
    expect(leaf.unitCost).toBe(150);
    expect(leaf.totalCost).toBe(150);
  });

  it('ZAKUPOWA ownCost comes from final supplier quote', () => {
    const nodes: BomNode[] = [
      node({
        id: 1,
        parentId: null,
        materialCost: 999,
        supplierOffers: [
          { id: 1, supplierId: 1, supplierName: 'A', cena: 50, isFinal: false },
          { id: 2, supplierId: 2, supplierName: 'B', cena: 42, isFinal: true },
        ],
      }),
    ];

    const leaf = recalcTree(nodes)[0];
    expect(leaf.ownCost).toBe(42);
    expect(leaf.unitCost).toBe(42);
  });

  it('parent unitCost = ownCost + Σ children.totalCost', () => {
    const nodes: BomNode[] = [
      node({ id: 1, parentId: null, materialCost: 20, operations: [op({ operationId: 1, cena: 5 })] }),
      node({ id: 2, parentId: 1, materialCost: 100, ilosc: 1 }),
      node({ id: 3, parentId: 1, materialCost: 20, ilosc: 4 }),
    ];

    const map = new Map(recalcTree(nodes).map(n => [n.id, n]));
    expect(map.get(2)!.totalCost).toBe(100);
    expect(map.get(3)!.totalCost).toBe(80);
    // own 25 + children 180
    expect(map.get(1)!.ownCost).toBe(25);
    expect(map.get(1)!.unitCost).toBe(205);
    expect(map.get(1)!.totalCost).toBe(205);
  });

  it('manualUnitCost overrides computed unit; clearing returns to breakdown', () => {
    const nodes: BomNode[] = [
      node({
        id: 1,
        parentId: null,
        materialCost: 100,
        manualUnitCost: 500,
        operations: [op({ operationId: 1, cena: 20 })],
      }),
      node({ id: 2, parentId: 1, materialCost: 50, ilosc: 2 }),
    ];

    let map = new Map(recalcTree(nodes).map(n => [n.id, n]));
    expect(map.get(1)!.unitCost).toBe(500);
    expect(map.get(1)!.totalCost).toBe(500);
    // breakdown stays visible: own 120 + child 100 = 220
    expect(computedUnitCost(map.get(1)!, [map.get(2)!])).toBe(220);

    map.get(1)!.manualUnitCost = null;
    map = new Map(recalcTree([...map.values()]).map(n => [n.id, n]));
    expect(map.get(1)!.unitCost).toBe(220);
  });

  it('totalCost = unitCost × quantity', () => {
    const nodes: BomNode[] = [
      node({ id: 1, parentId: null, materialCost: 10, ilosc: 3 }),
    ];
    expect(recalcTree(nodes)[0].totalCost).toBe(30);
  });

  it('two roots compute independently', () => {
    const nodes: BomNode[] = [
      node({ id: 30, parentId: null, manualUnitCost: 100 }),
      node({ id: 31, parentId: null, lp: 2 }),
      node({ id: 32, parentId: 31, materialCost: 50, ilosc: 4 }),
    ];

    const map = new Map(recalcTree(nodes).map(n => [n.id, n]));
    expect(map.get(30)!.totalCost).toBe(100);
    expect(map.get(31)!.unitCost).toBe(200);
    expect(map.get(31)!.totalCost).toBe(200);
  });
});
