import type { Role, RfqStatus, OfferStatus, CostSource, RabatType, GroupType } from './enums';

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

export interface BomNode {
  id: number;
  rfqId: number | null;
  templateId: number | null;
  parentId: number | null;
  lp: number;
  numerDetalu: string;
  ilosc: number;
  nazwaOpis: string;
  groupId: number;
  kindId: number;
  operationIds: number[];
  materialId: number | null;
  materialWymiary: string;
  procesySpecjalne: boolean;
  dodatkowe: string;
  costSource: CostSource;
  unitCost: number;
  totalCost: number;
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
  sourceRfqId: number | null;   // provenance while SZKIC (live cost); kept after freeze but no longer read
  sourceBomNodeId: number | null; // id of the root BomNode this line snapshots (null on legacy lines)
  kosztWykonania: number;       // unit cost frozen from BOM root at line create / refresh
  negocjacje: number;
  cenaSprzedazy: number;        // unit sale price, user-entered
}

export interface Offer {
  id: number;
  rfqId: number;
  numer: string;
  revision: string;             // 'A','B','C',… — Etap 2: working copy + frozen revisions
  entityId: number;
  clientId: number;
  nrZamowieniaKlienta: string | null;
  status: OfferStatus;
  rabatType: RabatType | null;
  rabatValue: number | null;
  salesRepId: number;
  deliveryTimeId: number | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}
