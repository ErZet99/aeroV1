import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, getDb } from '@/api/db';
import * as bomService from '@/api/bomService';
import * as offerService from '@/api/offerService';
import * as orderService from '@/api/orderService';

async function offerWithRevision() {
  const roots = (await bomService.getTree('rfq', 9)).filter(n => n.parentId === null);
  const offer = await offerService.createFromRfq(9, 2, [roots[0].id]);
  const revision = await offerService.createRevision(offer.id, 2);
  return { offer, revision };
}

describe('orderService.createFromRevision', () => {
  beforeEach(() => {
    resetDb();
  });

  it('numbers the order, records provenance and cascades statuses', async () => {
    const { offer, revision } = await offerWithRevision();

    const order = await orderService.createFromRevision(revision.id);

    expect(order.numer).toMatch(/^\d{2}-\d{3}$/);
    expect(order.offerId).toBe(offer.id);
    expect(order.offerRevisionId).toBe(revision.id);
    expect(order.clientId).toBe(offer.clientId);
    expect(order.entityId).toBe(offer.entityId);
    expect(order.status).toBe('NOWE');

    const db = getDb();
    expect(db.offers.find(o => o.id === offer.id)!.status).toBe('ZAAKCEPTOWANA');
    expect(db.rfqs.find(r => r.id === 9)!.status).toBe('ZAAKCEPTOWANE');
  });

  it('materializes the frozen tree as an editable copy owned by the order', async () => {
    const { revision } = await offerWithRevision();
    const frozen = revision.snapshot.lines[0].bomSnapshot;

    const order = await orderService.createFromRevision(revision.id);
    const tree = await bomService.getTree('order', order.id);

    expect(tree.map(n => n.nazwaOpis).sort()).toEqual(frozen.map(n => n.nazwaOpis).sort());
    expect(tree.every(n => n.orderId === order.id)).toBe(true);
    expect(tree.every(n => n.rfqId === null && n.templateId === null)).toBe(true);
    // Deep copy: fresh node ids, and the copied tree keeps its shape.
    expect(tree.some(n => frozen.some(f => f.id === n.id))).toBe(false);
    expect(tree.filter(n => n.parentId === null)).toHaveLength(1);

    const copiedRoot = tree.find(n => n.parentId === null)!;
    const copiedChildren = tree.filter(n => n.parentId === copiedRoot.id);
    const frozenRoot = frozen.find(n => n.parentId === null)!;
    expect(copiedChildren).toHaveLength(frozen.filter(n => n.parentId === frozenRoot.id).length);
  });

  it('order tree edits leave the source quotation tree untouched', async () => {
    const { revision } = await offerWithRevision();
    const order = await orderService.createFromRevision(revision.id);

    const tree = await bomService.getTree('order', order.id);
    const child = tree.find(n => n.parentId !== null)!;
    await bomService.updateNode(child.id, { nazwaOpis: 'Zmiana przedprodukcyjna' });

    const rfqTree = await bomService.getTree('rfq', 9);
    expect(rfqTree.some(n => n.nazwaOpis === 'Zmiana przedprodukcyjna')).toBe(false);
  });

  it('numbers consecutive orders within the same year', async () => {
    const { revision } = await offerWithRevision();
    const first = await orderService.createFromRevision(revision.id);

    const otherRoots = (await bomService.getTree('rfq', 5)).filter(n => n.parentId === null);
    const otherOffer = await offerService.createFromRfq(5, 2, [otherRoots[0].id]);
    const otherRevision = await offerService.createRevision(otherOffer.id, 2);
    const second = await orderService.createFromRevision(otherRevision.id);

    const nnn = (numer: string) => parseInt(numer.split('-')[1], 10);
    expect(nnn(second.numer)).toBe(nnn(first.numer) + 1);
  });
});

describe('orderService register and save', () => {
  beforeEach(() => {
    resetDb();
  });

  it('lists created orders and loads one by id', async () => {
    expect(await orderService.list()).toHaveLength(0);

    const { revision } = await offerWithRevision();
    const order = await orderService.createFromRevision(revision.id);

    expect((await orderService.list()).map(o => o.id)).toEqual([order.id]);
    expect((await orderService.get(order.id))!.numer).toBe(order.numer);
    expect(await orderService.get(9999)).toBeNull();
  });

  it('save persists header fields and bumps version', async () => {
    const { revision } = await offerWithRevision();
    const order = await orderService.createFromRevision(revision.id);

    const saved = await orderService.save(order.id, {
      nazwa: 'Stół inspekcyjny — partia 1',
      opis: 'Do produkcji w sierpniu.',
      status: 'W_TOKU',
    });

    expect(saved!.nazwa).toBe('Stół inspekcyjny — partia 1');
    expect(saved!.opis).toBe('Do produkcji w sierpniu.');
    expect(saved!.status).toBe('W_TOKU');
    expect(saved!.version).toBe(order.version + 1);
  });

  it('manual revision lines without a BOM become a synthetic root on the order', async () => {
    const { offer } = await offerWithRevision();
    await offerService.saveWorkingCopy(offer.id, {
      nrZamowieniaKlienta: null,
      rabatType: null,
      rabatValue: null,
      lines: [
        {
          id: null,
          lp: 1,
          nazwaPrzyrzadu: 'Pozycja ręczna',
          ilosc: 2,
          kosztWykonania: 150,
          rabat: 0,
          cenaSprzedazy: 400,
        },
      ],
    });
    const revision = await offerService.createRevision(offer.id, 2);
    expect(revision.snapshot.lines[0].bomSnapshot).toEqual([]);

    const order = await orderService.createFromRevision(revision.id);
    const tree = await bomService.getTree('order', order.id);
    const roots = tree.filter(n => n.parentId === null);

    expect(roots).toHaveLength(1);
    expect(roots[0].nazwaOpis).toBe('Pozycja ręczna');
    expect(roots[0].ilosc).toBe(2);
    expect(roots[0].manualUnitCost).toBe(150);
  });
});
