import { describe, it, expect } from 'vitest';
import { seedBomNodes } from '@/api/seed';
import { computedUnitCost, recalcTree } from '@/services/costService';
import { isBomRoot } from '@/services/bomEditor';

describe('seed BOM — new cost model', () => {
  const recalced = (() => {
    const byOwner = new Map<string, typeof seedBomNodes>();
    for (const n of seedBomNodes) {
      const key = n.rfqId != null ? `rfq:${n.rfqId}` : `tpl:${n.templateId}`;
      const list = byOwner.get(key) ?? [];
      list.push(n);
      byOwner.set(key, list);
    }
    const out: typeof seedBomNodes = [];
    for (const nodes of byOwner.values()) {
      out.push(...recalcTree(JSON.parse(JSON.stringify(nodes))));
    }
    return out;
  })();

  it('roots are lean: no group, kind, material, or operations', () => {
    const roots = recalced.filter(isBomRoot);
    expect(roots.length).toBeGreaterThan(0);
    for (const root of roots) {
      expect(root.groupId).toBeNull();
      expect(root.kindId).toBeNull();
      expect(root.materialId).toBeNull();
      expect(root.operations).toEqual([]);
      expect(root.supplierOffers).toEqual([]);
    }
  });

  it('product card roots show non-zero execution cost after recalc', () => {
    const rfqRoots = recalced.filter(n => n.rfqId != null && isBomRoot(n));
    expect(rfqRoots.length).toBeGreaterThan(0);
    for (const root of rfqRoots) {
      expect(root.totalCost).toBeGreaterThan(0);
    }
  });

  it('has an intermediate assembly with own priced operation and no material', () => {
    const rama = recalced.find(n => n.nazwaOpis === 'Rama nośna' && n.rfqId === 9);
    expect(rama).toBeDefined();
    expect(rama!.materialId).toBeNull();
    expect(rama!.operations.length).toBeGreaterThan(0);
    expect(rama!.operations.some(o => o.cena > 0)).toBe(true);
  });

  it('has a detail with materialCost and a cooperative op with supplier comparison', () => {
    const belka = recalced.find(n => n.numerDetalu === 'BELKA-001');
    expect(belka).toBeDefined();
    expect(belka!.materialCost).toBeGreaterThan(0);
    const coop = belka!.operations.find(o => o.supplierOffers.length >= 2);
    expect(coop).toBeDefined();
    expect(coop!.supplierOffers.some(o => o.isFinal)).toBe(true);
    expect(coop!.cena).toBeGreaterThan(0);
  });

  it('has a purchasing node whose own cost equals final supplier quote', () => {
    const srub = recalced.find(n => n.numerDetalu === 'SRUBA-M8' && n.rfqId === 9);
    expect(srub).toBeDefined();
    const finalOffer = srub!.supplierOffers.find(o => o.isFinal);
    expect(finalOffer).toBeDefined();
    expect(srub!.ownCost).toBe(finalOffer!.cena);
  });

  it('has a node with manual price different from breakdown', () => {
    const manual = recalced.find(n => n.manualUnitCost !== null);
    expect(manual).toBeDefined();
    const children = recalced.filter(n => n.parentId === manual!.id);
    const breakdown = computedUnitCost(manual!, children);
    expect(manual!.manualUnitCost).not.toBe(breakdown);
    expect(manual!.unitCost).toBe(manual!.manualUnitCost);
  });

  it('models final assembly as a normal child node', () => {
    const root = recalced.find(n => n.id === 1);
    const montaz = recalced.find(n => n.nazwaOpis === 'Montaż stołu');
    expect(root).toBeDefined();
    expect(montaz).toBeDefined();
    expect(montaz!.parentId).toBe(root!.id);
    expect(montaz!.operations.some(o => o.cena > 0)).toBe(true);
  });
});
