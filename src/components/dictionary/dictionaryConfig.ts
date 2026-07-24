import type { DictEntity } from '@/api/dictionaryService';

export type ColumnType = 'text' | 'boolean' | 'number' | 'date';

export interface DictColumn {
  field: string;
  labelKey: string;
  type: ColumnType;
}

export interface DictConfig {
  collection: DictEntity;
  /** Klienci/Dostawcy are editable by everyone; other dictionaries only by SUPER_ADMIN. */
  editableByAll?: boolean;
  columns: DictColumn[];
}

const companyColumns: DictColumn[] = [
  { field: 'name', labelKey: 'fields.name', type: 'text' },
  { field: 'nip', labelKey: 'fields.nip', type: 'text' },
  { field: 'address', labelKey: 'fields.address', type: 'text' },
  { field: 'contactPerson', labelKey: 'fields.contactPerson', type: 'text' },
  { field: 'email', labelKey: 'fields.email', type: 'text' },
  { field: 'phone', labelKey: 'fields.phone', type: 'text' },
  { field: 'active', labelKey: 'fields.active', type: 'boolean' },
];

const simpleDictColumns: DictColumn[] = [
  { field: 'code', labelKey: 'fields.code', type: 'text' },
  { field: 'labelPL', labelKey: 'fields.labelPL', type: 'text' },
  { field: 'sort', labelKey: 'fields.sort', type: 'number' },
  { field: 'active', labelKey: 'fields.active', type: 'boolean' },
];

export const dictionaryConfig: Record<DictEntity, DictConfig> = {
  clients: { collection: 'clients', editableByAll: true, columns: companyColumns },
  suppliers: { collection: 'suppliers', editableByAll: true, columns: companyColumns },
  materials: { collection: 'materials', columns: simpleDictColumns },
  inquiryTypes: { collection: 'inquiryTypes', columns: simpleDictColumns },
  certificates: { collection: 'certificates', columns: simpleDictColumns },
  deliveryTimes: { collection: 'deliveryTimes', columns: simpleDictColumns },
  holidays: {
    collection: 'holidays',
    columns: [
      { field: 'date', labelKey: 'fields.date', type: 'date' },
      { field: 'name', labelKey: 'fields.name', type: 'text' },
    ],
  },
  entities: {
    collection: 'entities',
    columns: [
      { field: 'name', labelKey: 'fields.name', type: 'text' },
      { field: 'nip', labelKey: 'fields.nip', type: 'text' },
      { field: 'address', labelKey: 'fields.address', type: 'text' },
      { field: 'active', labelKey: 'fields.active', type: 'boolean' },
    ],
  },
};

/** Sidebar order. Cascade CRUD (3 panels) — poza tą iteracją. */
export const DICT_KEYS: DictEntity[] = [
  'clients',
  'suppliers',
  'materials',
  'inquiryTypes',
  'certificates',
  'deliveryTimes',
  'holidays',
  'entities',
];
