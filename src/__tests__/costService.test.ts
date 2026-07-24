import { describe, it, expect } from 'vitest';
import { recalcTree } from '@/services/costService';
import type { BomNode } from '@/types/models';

function node(partial: Partial<BomNode> & Pick<BomNode, 'id' | 'parentId' | 'costSource'>): BomNode {
  return {
    rfqId: 1,
    templateId: null,
    lp: 1,
    numerDetalu: '',
    ilosc: 1,
    nazwaOpis: '',
    groupId: 1,
    kindId: 1,
    operationIds: [],
    materialId: null,
    materialWymiary: '',
    procesySpecjalne: false,
    dodatkowe: '',
    unitCost: 0,
    totalCost: 0,
    supplierOffers: [],
    version: 1,
    ...partial,
  };
}

describe('costService', () => {
  it('ROLLUP parent sums children totalCost into unitCost', () => {
    const nodes: BomNode[] = [
      node({ id: 1, parentId: null, costSource: 'ROLLUP', nazwaOpis: 'Root' }),
      node({
        id: 2,
        parentId: 1,
        costSource: 'MANUAL',
        unitCost: 100,
        ilosc: 1,
        nazwaOpis: 'A',
      }),
      node({
        id: 3,
        parentId: 1,
        costSource: 'MANUAL',
        unitCost: 20,
        ilosc: 4,
        nazwaOpis: 'B',
      }),
    ];

    const result = recalcTree(nodes);
    const map = new Map(result.map(n => [n.id, n]));

    expect(map.get(2)!.totalCost).toBe(100);
    expect(map.get(3)!.totalCost).toBe(80);
    expect(map.get(1)!.unitCost).toBe(180);
    expect(map.get(1)!.totalCost).toBe(180);
  });

  it('MANUAL parent ignores children', () => {
    const nodes: BomNode[] = [
      node({
        id: 10,
        parentId: null,
        costSource: 'MANUAL',
        unitCost: 500,
        nazwaOpis: 'Parent',
      }),
      node({
        id: 11,
        parentId: 10,
        costSource: 'MANUAL',
        unitCost: 50,
        ilosc: 2,
        nazwaOpis: 'Child',
      }),
    ];

    const result = recalcTree(nodes);
    const parent = result.find(n => n.id === 10)!;
    expect(parent.unitCost).toBe(500);
    expect(parent.totalCost).toBe(500);
  });

  it('ROLLUP leaf without children has zero cost', () => {
    const nodes: BomNode[] = [
      node({
        id: 20,
        parentId: null,
        costSource: 'ROLLUP',
        supplierOffers: [
          { id: 1, supplierId: 1, supplierName: 'S', cena: 100, isFinal: true },
        ],
      }),
    ];

    const leaf = recalcTree(nodes)[0];
    expect(leaf.unitCost).toBe(0);
    expect(leaf.totalCost).toBe(0);
  });

  it('two roots compute independently', () => {
    const nodes: BomNode[] = [
      node({ id: 30, parentId: null, costSource: 'MANUAL', unitCost: 100 }),
      node({ id: 31, parentId: null, costSource: 'ROLLUP', lp: 2 }),
      node({
        id: 32,
        parentId: 31,
        costSource: 'MANUAL',
        unitCost: 50,
        ilosc: 4,
      }),
    ];

    const map = new Map(recalcTree(nodes).map(n => [n.id, n]));
    expect(map.get(30)!.totalCost).toBe(100);
    expect(map.get(31)!.unitCost).toBe(200);
    expect(map.get(31)!.totalCost).toBe(200);
  });
});
