import { describe, it, expect } from 'vitest';
import {
  activeCardSubtree,
  isBomRoot,
  leanRootFields,
  resolveBomRowGesture,
  validateBomNodeFields,
} from '@/services/bomEditor';
import type { BomNode } from '@/types/models';

function node(partial: Partial<BomNode> & Pick<BomNode, 'id' | 'parentId'>): BomNode {
  return {
    rfqId: 1,
    templateId: null,
    orderId: null,
    lp: 1,
    numerDetalu: '',
    ilosc: 1,
    nazwaOpis: 'X',
    groupId: 1,
    kindId: 1,
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

describe('bomEditor — root vs component validation', () => {
  it('root allows null groupId/kindId and requires only name + qty', () => {
    expect(
      validateBomNodeFields({
        isRoot: true,
        nazwaOpis: 'Stół',
        ilosc: 1,
        groupId: null,
        kindId: null,
      })
    ).toBe(true);

    expect(
      validateBomNodeFields({
        isRoot: true,
        nazwaOpis: '',
        ilosc: 1,
        groupId: null,
        kindId: null,
      })
    ).toBe(false);
  });

  it('component requires groupId and kindId', () => {
    expect(
      validateBomNodeFields({
        isRoot: false,
        nazwaOpis: 'Belka',
        ilosc: 2,
        groupId: null,
        kindId: null,
      })
    ).toBe(false);

    expect(
      validateBomNodeFields({
        isRoot: false,
        nazwaOpis: 'Belka',
        ilosc: 2,
        groupId: 2,
        kindId: 22,
      })
    ).toBe(true);
  });

  it('leanRootFields clears classification, material, operations, suppliers', () => {
    expect(
      leanRootFields({
        numerDetalu: 'ST-1',
        ilosc: 1,
        nazwaOpis: 'Stół',
        manualUnitCost: 1200,
      })
    ).toEqual({
      numerDetalu: 'ST-1',
      ilosc: 1,
      nazwaOpis: 'Stół',
      groupId: null,
      kindId: null,
      operations: [],
      materialId: null,
      materialWymiary: '',
      materialCost: 0,
      procesySpecjalne: false,
      dodatkowe: '',
      manualUnitCost: 1200,
      supplierOffers: [],
    });
  });

  it('isBomRoot is true iff parentId is null', () => {
    expect(isBomRoot(node({ id: 1, parentId: null }))).toBe(true);
    expect(isBomRoot(node({ id: 2, parentId: 1 }))).toBe(false);
  });
});

describe('bomEditor — active card subtree', () => {
  it('table shows only descendants of the active root, never the root itself', () => {
    const nodes = [
      node({ id: 1, parentId: null, nazwaOpis: 'Stół' }),
      node({ id: 2, parentId: 1, lp: 1, nazwaOpis: 'Rama' }),
      node({ id: 3, parentId: 2, lp: 1, nazwaOpis: 'Belka' }),
      node({ id: 4, parentId: null, lp: 2, nazwaOpis: 'Inny produkt' }),
      node({ id: 5, parentId: 4, lp: 1, nazwaOpis: 'Dziecko innego' }),
    ];

    const subtree = activeCardSubtree(nodes, 1);
    expect(subtree.map(n => n.id)).toEqual([2, 3]);
    expect(subtree.some(n => n.id === 1)).toBe(false);
    expect(subtree.some(n => n.id === 5)).toBe(false);
  });
});

describe('bomEditor — row gesture', () => {
  it('single click selects an unselected row; does not open edit', () => {
    expect(resolveBomRowGesture('click', 42, null)).toEqual({ type: 'select', nodeId: 42 });
    expect(resolveBomRowGesture('click', 42, 7)).toEqual({ type: 'select', nodeId: 42 });
  });

  it('single click on the selected row deselects it', () => {
    expect(resolveBomRowGesture('click', 42, 42)).toEqual({ type: 'deselect' });
  });

  it('double click opens edit even when the row is already selected', () => {
    expect(resolveBomRowGesture('dblclick', 42, 42)).toEqual({ type: 'edit', nodeId: 42 });
    expect(resolveBomRowGesture('dblclick', 42, null)).toEqual({ type: 'edit', nodeId: 42 });
  });
});
