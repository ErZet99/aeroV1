import type { ComponentGroup, ComponentKind, ComponentKindSupplier, Operation, Supplier, SupplierOffer } from '@/types/models';

export function kindsForGroup(kinds: ComponentKind[], groupId: number): ComponentKind[] {
  return kinds.filter(k => k.groupId === groupId && k.active).sort((a, b) => a.sort - b.sort);
}

export function operationsForKind(operations: Operation[], kindId: number): Operation[] {
  return operations.filter(o => o.kindId === kindId && o.active).sort((a, b) => a.sort - b.sort);
}

export function preferredSuppliersForKind(
  links: ComponentKindSupplier[],
  kindId: number
): ComponentKindSupplier[] {
  return links.filter(l => l.kindId === kindId).sort((a, b) => a.sort - b.sort);
}

/** Pre-seed supplier comparison from kind preferences. Default marked final. */
export function preseedSupplierOffers(
  links: ComponentKindSupplier[],
  suppliers: Supplier[],
  kindId: number
): SupplierOffer[] {
  const preferred = preferredSuppliersForKind(links, kindId);
  return preferred.slice(0, 3).map((link, index) => {
    const supplier = suppliers.find(s => s.id === link.supplierId);
    return {
      id: index + 1,
      supplierId: link.supplierId,
      supplierName: supplier?.name ?? '',
      cena: 0,
      isFinal: link.isDefault,
    };
  });
}

export function groupTypeOf(
  groups: ComponentGroup[],
  groupId: number
): ComponentGroup['groupType'] | null {
  return groups.find(g => g.id === groupId)?.groupType ?? null;
}

/** Changing group clears kind + third level. */
export function resetAfterGroupChange(): { kindId: number | null; operationIds: number[] } {
  return { kindId: null, operationIds: [] };
}

/** Changing kind clears operations (purchasing: caller should re-preseed suppliers). */
export function resetAfterKindChange(): { operationIds: number[] } {
  return { operationIds: [] };
}
