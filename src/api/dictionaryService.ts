import { delay, getDb, saveDb, nextId } from './db';
import type { DictItem, Client, Supplier, Entity, Holiday } from '@/types/models';

export type DictEntity =
  | 'clients'
  | 'suppliers'
  | 'materials'
  | 'inquiryTypes'
  | 'certificates'
  | 'deliveryTimes'
  | 'holidays'
  | 'entities';

const entityMap: Record<DictEntity, keyof ReturnType<typeof getDb>> = {
  clients: 'clients',
  suppliers: 'suppliers',
  materials: 'materials',
  inquiryTypes: 'inquiryTypes',
  certificates: 'certificates',
  deliveryTimes: 'deliveryTimes',
  holidays: 'holidays',
  entities: 'entities',
};

export async function list(entity: DictEntity): Promise<(DictItem | Client | Supplier | Entity | Holiday)[]> {
  await delay();
  const db = getDb();
  const key = entityMap[entity];
  return db[key] as unknown as (DictItem | Client | Supplier | Entity | Holiday)[];
}

export async function create(entity: DictEntity, item: DictItem | Client | Supplier | Entity | Holiday): Promise<DictItem | Client | Supplier | Entity | Holiday> {
  await delay();
  const db = getDb();
  const key = entityMap[entity];
  const collection = db[key] as unknown as (DictItem | Client | Supplier | Entity | Holiday)[];

  const newItem = {
    ...item,
    id: nextId(key as keyof Omit<ReturnType<typeof getDb>, 'counters'>),
  };
  collection.push(newItem);
  saveDb();
  return newItem;
}

export async function update(entity: DictEntity, id: number, patch: Partial<DictItem | Client | Supplier | Entity | Holiday>): Promise<DictItem | Client | Supplier | Entity | Holiday | null> {
  await delay();
  const db = getDb();
  const key = entityMap[entity];
  const collection = db[key] as unknown as (DictItem | Client | Supplier | Entity | Holiday)[];

  const idx = collection.findIndex(item => (item as { id: number }).id === id);
  if (idx < 0) return null;

  collection[idx] = { ...collection[idx], ...patch };
  saveDb();
  return collection[idx];
}

export async function remove(entity: DictEntity, id: number): Promise<boolean> {
  await delay();
  const db = getDb();
  const key = entityMap[entity];
  const collection = db[key] as unknown as (DictItem | Client | Supplier | Entity | Holiday)[];

  const idx = collection.findIndex(item => (item as { id: number }).id === id);
  if (idx < 0) return false;

  collection.splice(idx, 1);
  saveDb();
  return true;
}
