import { describe, it, expect } from 'vitest';
import {
  kindsForGroup,
  operationsForKind,
  preseedSupplierOffers,
  resetAfterGroupChange,
  resetAfterKindChange,
  groupTypeOf,
} from '@/services/cascadeService';
import type {
  ComponentGroup,
  ComponentKind,
  ComponentKindSupplier,
  Operation,
  Supplier,
} from '@/types/models';

const groups: ComponentGroup[] = [
  { id: 1, code: 'KOOPERACJA', groupType: 'OPERACYJNA', labelPL: 'Kooperacja', sort: 1, active: true },
  { id: 3, code: 'NORMATYWA', groupType: 'ZAKUPOWA', labelPL: 'Normatywa', sort: 3, active: true },
];

const kinds: ComponentKind[] = [
  { id: 10, groupId: 1, code: 'CNC', labelPL: 'Obróbka CNC', sort: 1, active: true },
  { id: 11, groupId: 1, code: 'EDM', labelPL: 'Obróbka EDM', sort: 2, active: true },
  { id: 20, groupId: 3, code: 'MET', labelPL: 'Komponenty met.', sort: 1, active: true },
  { id: 21, groupId: 3, code: 'INACTIVE', labelPL: 'Off', sort: 2, active: false },
];

const operations: Operation[] = [
  { id: 100, kindId: 10, code: 'CNC', labelPL: 'Obróbka CNC', sort: 1, active: true },
  { id: 101, kindId: 10, code: 'MOD', labelPL: 'Modyfikacja', sort: 2, active: true },
  { id: 102, kindId: 11, code: 'WIRE', labelPL: 'Wire EDM', sort: 1, active: true },
];

const links: ComponentKindSupplier[] = [
  { id: 1, kindId: 20, supplierId: 1, isDefault: true, sort: 1 },
  { id: 2, kindId: 20, supplierId: 2, isDefault: false, sort: 2 },
  { id: 3, kindId: 20, supplierId: 3, isDefault: false, sort: 3 },
];

const suppliers: Supplier[] = [
  { id: 1, name: 'Śrubres', nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 2, name: 'Asmet', nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
  { id: 3, name: 'Euro-Met', nip: '', address: '', contactPerson: '', email: '', phone: '', active: true },
];

describe('cascadeService', () => {
  it('kindsForGroup returns only active kinds of that group', () => {
    const result = kindsForGroup(kinds, 3);
    expect(result.map(k => k.code)).toEqual(['MET']);
  });

  it('operationsForKind filters by kind', () => {
    expect(operationsForKind(operations, 10).map(o => o.code)).toEqual(['CNC', 'MOD']);
  });

  it('preseedSupplierOffers marks default as final', () => {
    const offers = preseedSupplierOffers(links, suppliers, 20);
    expect(offers).toHaveLength(3);
    expect(offers[0]).toMatchObject({ supplierId: 1, supplierName: 'Śrubres', isFinal: true, cena: 0 });
    expect(offers.filter(o => o.isFinal)).toHaveLength(1);
  });

  it('resetAfterGroupChange clears kind and operations', () => {
    expect(resetAfterGroupChange()).toEqual({ kindId: null, operationIds: [] });
  });

  it('resetAfterKindChange clears operations', () => {
    expect(resetAfterKindChange()).toEqual({ operationIds: [] });
  });

  it('groupTypeOf returns type', () => {
    expect(groupTypeOf(groups, 1)).toBe('OPERACYJNA');
    expect(groupTypeOf(groups, 3)).toBe('ZAKUPOWA');
  });
});
