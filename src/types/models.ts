import type { Role, RfqStatus, OfferStatus, RabatType, GroupType } from './enums';

export interface DictItem {
  id: number;
  code: string;
  labelPL: string;
  sort: number;
  active: boolean;
}

export interface ComponentGroup {
  id: number;
  code: string;
  groupType: GroupType;
  labelPL: string;
  sort: number;
  active: boolean;
}

export interface ComponentKind {
  id: number;
  groupId: number;
  code: string;
  labelPL: string;
  sort: number;
  active: boolean;
}

export interface Operation {
  id: number;
  kindId: number;
  code: string;
  labelPL: string;
  sort: number;
  active: boolean;
}

export interface ComponentKindSupplier {
  id: number;
  kindId: number;
  supplierId: number;
  isDefault: boolean;
  sort: number;
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
}

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: Role;
  active: boolean;
}

export interface Entity {
  id: number;
  name: string;
  nip: string;
  address: string;
  active: boolean;
}

export interface Client {
  id: number;
  name: string;
  nip: string;
  address: string;
  contactPerson: string;
  email: string;
  phone: string;
  active: boolean;
}

export interface Supplier {
  id: number;
  name: string;
  nip: string;
  address: string;
  contactPerson: string;
  email: string;
  phone: string;
  active: boolean;
}

export interface Rfq {
  id: number;
  numer: string;
  clientId: number;
  entityId: number;
  inquiryTypeId: number;
  nazwa: string;
  opis: string;
  status: RfqStatus;
  coordinatorId: number;
  dataZapytania: string;
  deadline: string;
  dataWyslania: string | null;
  wymaganaDokumentacja: boolean;
  certificateIds: number[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierOffer {
  id: number;
  supplierId: number | null;
  supplierName: string;
  cena: number;
  isFinal: boolean;
}

/** Priced work step on a BOM node. Empty supplierId = in-house. */
export interface BomNodeOperation {
  operationId: number;
  cena: number;
  supplierId: number | null;
  supplierOffers: SupplierOffer[];
}

export interface BomNode {
  id: number;
  rfqId: number | null;
  templateId: number | null;
  parentId: number | null;
  lp: number;
  numerDetalu: string;
  ilosc: number;
  nazwaOpis: string;
  /** Null on root products — roots carry no classification (01-DOMAIN.md §4). */
  groupId: number | null;
  /** Null on root products — roots carry no classification (01-DOMAIN.md §4). */
  kindId: number | null;
  operations: BomNodeOperation[];
  materialId: number | null;
  materialWymiary: string;
  materialCost: number;
  procesySpecjalne: boolean;
  dodatkowe: string;
  /** Quick-quote override; null = use breakdown. */
  manualUnitCost: number | null;
  /** materialCost + Σ op.cena, or final node supplier quote (ZAKUPOWA). */
  ownCost: number;
  unitCost: number;
  totalCost: number;
  /** Node-level quotes for ZAKUPOWA groups. */
  supplierOffers: SupplierOffer[];
  version: number;
}

export interface Template {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfferLine {
  id: number;
  offerId: number;
  lp: number;
  nazwaPrzyrzadu: string;
  ilosc: number;
  sourceRfqId: number | null;
  sourceBomNodeId: number | null;
  kosztWykonania: number;
  negocjacje: number;
  cenaSprzedazy: number;
}

export interface Offer {
  id: number;
  rfqId: number;
  numer: string;
  /** Latest frozen revision label (`A`…), or null when none exist yet. */
  revision: string | null;
  entityId: number;
  clientId: number;
  nrZamowieniaKlienta: string | null;
  status: OfferStatus;
  rabatType: RabatType | null;
  rabatValue: number | null;
  globalMarginPct: number | null;
  salesRepId: number;
  deliveryTimeId: number | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** Header + lines frozen inside an offer revision. */
export interface OfferDocumentSnapshot {
  numer: string;
  entityId: number;
  clientId: number;
  nrZamowieniaKlienta: string | null;
  rabatType: RabatType | null;
  rabatValue: number | null;
  globalMarginPct: number | null;
  salesRepId: number;
  deliveryTimeId: number | null;
  lines: Array<{
    lp: number;
    nazwaPrzyrzadu: string;
    ilosc: number;
    sourceRfqId: number | null;
    sourceBomNodeId: number | null;
    kosztWykonania: number;
    negocjacje: number;
    cenaSprzedazy: number;
  }>;
}

/** Immutable frozen snapshot of an offer working copy. */
export interface OfferRevision {
  id: number;
  offerId: number;
  revision: string;
  snapshot: OfferDocumentSnapshot;
  createdBy: number;
  createdAt: string;
}
