import { describe, it, expect, beforeEach } from 'vitest';
import { resetDb, getDb } from '@/api/db';
import * as offerService from '@/api/offerService';
import * as bomService from '@/api/bomService';
import { captureSnapshot, snapshotEquals } from '@/services/offerDocument';

describe('offerService.createFromRfq', () => {
  beforeEach(() => {
    resetDb();
  });

  it('creates one line per selected root and opens with snapshot cost', async () => {
    const roots = (await bomService.getTree('rfq', 9)).filter(n => n.parentId === null);
    expect(roots.length).toBeGreaterThan(0);

    const offer = await offerService.createFromRfq(9, 2, [roots[0].id]);
    expect(offer.rfqId).toBe(9);
    expect(offer.numer).toBe(getDb().rfqs.find(r => r.id === 9)!.numer);
    expect(offer.revision).toBeNull();

    const detail = await offerService.get(offer.id);
    expect(detail!.lines).toHaveLength(1);
    expect(detail!.lines[0].sourceBomNodeId).toBe(roots[0].id);
    expect(detail!.lines[0].kosztWykonania).toBe(roots[0].totalCost);
  });

  it('rejects second offer for same RFQ (1:1)', async () => {
    const roots = (await bomService.getTree('rfq', 9)).filter(n => n.parentId === null);
    await offerService.createFromRfq(9, 2, [roots[0].id]);
    await expect(offerService.createFromRfq(9, 2, [roots[0].id])).rejects.toThrow(/already exists/i);
  });

  it('findByRfqId returns existing offer', async () => {
    expect(await offerService.findByRfqId(1)).not.toBeNull();
    expect(await offerService.findByRfqId(9)).toBeNull();
  });

  it('line cost stays frozen after BOM change', async () => {
    const roots = (await bomService.getTree('rfq', 9)).filter(n => n.parentId === null);
    const frozen = roots[0].totalCost;
    const offer = await offerService.createFromRfq(9, 2, [roots[0].id]);

    await bomService.updateNode(roots[0].id, { manualUnitCost: frozen + 999 });

    const detail = await offerService.get(offer.id);
    expect(detail!.lines[0].kosztWykonania).toBe(frozen);
  });
});

describe('offerService document save + revisions', () => {
  beforeEach(() => {
    resetDb();
  });

  it('saveWorkingCopy persists header and lines without creating a revision', async () => {
    const before = await offerService.get(1);
    expect(before).not.toBeNull();

    await offerService.saveWorkingCopy(1, {
      nrZamowieniaKlienta: 'PO-99',
      rabatType: 'KWOTA',
      rabatValue: 200,
      lines: before!.lines.map(l => ({
        id: l.id,
        lp: l.lp,
        nazwaPrzyrzadu: l.nazwaPrzyrzadu,
        ilosc: l.ilosc,
        kosztWykonania: l.kosztWykonania,
        rabat: 10,
        cenaSprzedazy: 1500,
      })),
    });

    const after = await offerService.get(1);
    expect(after!.offer.nrZamowieniaKlienta).toBe('PO-99');
    expect(after!.offer.rabatType).toBe('KWOTA');
    expect(after!.offer.rabatValue).toBe(200);
    expect(after!.lines[0].cenaSprzedazy).toBe(1500);
    expect(after!.lines[0].rabat).toBe(10);
    expect(after!.offer.revision).toBeNull();
    expect(await offerService.listRevisions(1)).toHaveLength(0);
  });

  it('saveWorkingCopy inserts a manual line (id null) and deletes omitted lines', async () => {
    const before = await offerService.get(1);
    const original = before!.lines[0];

    // Add a manual line alongside the original.
    await offerService.saveWorkingCopy(1, {
      nrZamowieniaKlienta: null,
      rabatType: null,
      rabatValue: null,
      lines: [
        {
          id: original.id,
          lp: 1,
          nazwaPrzyrzadu: original.nazwaPrzyrzadu,
          ilosc: original.ilosc,
          kosztWykonania: original.kosztWykonania,
          rabat: 0,
          cenaSprzedazy: original.cenaSprzedazy,
        },
        {
          id: null,
          lp: 2,
          nazwaPrzyrzadu: 'Ręczna pozycja',
          ilosc: 3,
          kosztWykonania: 500,
          rabat: 25,
          cenaSprzedazy: 800,
        },
      ],
    });

    const withManual = await offerService.get(1);
    expect(withManual!.lines).toHaveLength(2);
    const manual = withManual!.lines[1];
    expect(manual.nazwaPrzyrzadu).toBe('Ręczna pozycja');
    expect(manual.sourceRfqId).toBeNull();
    expect(manual.sourceBomNodeId).toBeNull();
    // wartość = (800 - 25) * 3
    expect(manual.wartosc).toBe(2325);

    // Now drop the original line — only the manual one remains.
    await offerService.saveWorkingCopy(1, {
      nrZamowieniaKlienta: null,
      rabatType: null,
      rabatValue: null,
      lines: [
        {
          id: manual.id,
          lp: 1,
          nazwaPrzyrzadu: manual.nazwaPrzyrzadu,
          ilosc: manual.ilosc,
          kosztWykonania: manual.kosztWykonania,
          rabat: manual.rabat,
          cenaSprzedazy: manual.cenaSprzedazy,
        },
      ],
    });

    const afterDelete = await offerService.get(1);
    expect(afterDelete!.lines).toHaveLength(1);
    expect(afterDelete!.lines[0].nazwaPrzyrzadu).toBe('Ręczna pozycja');
  });

  it('createRevision freezes A then B and leaves prior snapshot immutable', async () => {
    const seedLine = (await offerService.get(1))!.lines[0];
    const lineAt = (cena: number) => ({
      id: seedLine.id,
      lp: 1,
      nazwaPrzyrzadu: seedLine.nazwaPrzyrzadu,
      ilosc: seedLine.ilosc,
      kosztWykonania: seedLine.kosztWykonania,
      rabat: 0,
      cenaSprzedazy: cena,
    });

    await offerService.saveWorkingCopy(1, {
      nrZamowieniaKlienta: null,
      rabatType: null,
      rabatValue: null,
      lines: [lineAt(1000)],
    });

    const revA = await offerService.createRevision(1, 2);
    expect(revA.revision).toBe('A');
    expect(revA.snapshot.lines[0].cenaSprzedazy).toBe(1000);

    await offerService.saveWorkingCopy(1, {
      nrZamowieniaKlienta: null,
      rabatType: null,
      rabatValue: null,
      lines: [lineAt(2000)],
    });

    const revB = await offerService.createRevision(1, 2);
    expect(revB.revision).toBe('B');

    const listed = await offerService.listRevisions(1);
    expect(listed.map(r => r.revision)).toEqual(['A', 'B']);
    expect(listed[0].snapshot.lines[0].cenaSprzedazy).toBe(1000);
    expect(listed[1].snapshot.lines[0].cenaSprzedazy).toBe(2000);

    const offer = (await offerService.get(1))!.offer;
    expect(offer.revision).toBe('B');
  });

  it('createRevision freezes each line BOM tree against later quotation edits', async () => {
    const roots = (await bomService.getTree('rfq', 9)).filter(n => n.parentId === null);
    const offer = await offerService.createFromRfq(9, 2, [roots[0].id]);

    const rev = await offerService.createRevision(offer.id, 2);
    const frozen = rev.snapshot.lines[0].bomSnapshot;
    // Root 1 plus its descendants 17, 2, 3, 4 (RFQ 9 seed).
    expect(frozen.map(n => n.id).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 17]);

    await bomService.updateNode(roots[0].id, { nazwaOpis: 'Po zmianie technologa' });
    await bomService.deleteNode(3);

    const listed = await offerService.listRevisions(offer.id);
    const stillFrozen = listed[0].snapshot.lines[0].bomSnapshot;
    expect(stillFrozen.map(n => n.id).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 17]);
    expect(stillFrozen.find(n => n.id === 1)!.nazwaOpis).toBe('Stół inspekcyjny');
  });

  it('hasUpToDateRevision ignores quotation tree edits (commercial content only)', async () => {
    const roots = (await bomService.getTree('rfq', 9)).filter(n => n.parentId === null);
    const offer = await offerService.createFromRfq(9, 2, [roots[0].id]);
    await offerService.createRevision(offer.id, 2);
    expect(offerService.hasUpToDateRevision(offer.id)).toBe(true);

    await bomService.updateNode(roots[0].id, { nazwaOpis: 'Po zmianie technologa' });
    expect(offerService.hasUpToDateRevision(offer.id)).toBe(true);
  });

  it('hasUpToDateRevision is false when dirty, true after matching revision', async () => {
    const seedLine = (await offerService.get(1))!.lines[0];
    const lineAt = (cena: number) => ({
      id: seedLine.id,
      lp: 1,
      nazwaPrzyrzadu: seedLine.nazwaPrzyrzadu,
      ilosc: seedLine.ilosc,
      kosztWykonania: seedLine.kosztWykonania,
      rabat: 0,
      cenaSprzedazy: cena,
    });

    expect(offerService.hasUpToDateRevision(1)).toBe(false);

    await offerService.saveWorkingCopy(1, {
      nrZamowieniaKlienta: null,
      rabatType: null,
      rabatValue: null,
      lines: [lineAt(800)],
    });
    await offerService.createRevision(1, 2);
    expect(offerService.hasUpToDateRevision(1)).toBe(true);

    await offerService.saveWorkingCopy(1, {
      nrZamowieniaKlienta: null,
      rabatType: null,
      rabatValue: null,
      lines: [lineAt(900)],
    });
    expect(offerService.hasUpToDateRevision(1)).toBe(false);
  });
});

describe('offerService markAsSent', () => {
  beforeEach(() => {
    resetDb();
  });

  it('markAsSent requires up-to-date revision and stamps RFQ', async () => {
    await expect(offerService.markAsSent(1)).rejects.toThrow(/revision/i);

    const seedLine = (await offerService.get(1))!.lines[0];
    await offerService.saveWorkingCopy(1, {
      nrZamowieniaKlienta: null,
      rabatType: null,
      rabatValue: null,
      lines: [
        {
          id: seedLine.id,
          lp: 1,
          nazwaPrzyrzadu: seedLine.nazwaPrzyrzadu,
          ilosc: seedLine.ilosc,
          kosztWykonania: seedLine.kosztWykonania,
          rabat: 0,
          cenaSprzedazy: 500,
        },
      ],
    });
    await offerService.createRevision(1, 2);

    const sent = await offerService.markAsSent(1);
    expect(sent.status).toBe('WYSLANA');

    const rfq = getDb().rfqs.find(r => r.id === 1)!;
    expect(rfq.status).toBe('WYSLANE');
    expect(rfq.dataWyslania).not.toBeNull();
  });

  it('seeded sent offer #2 already matches its revision A', () => {
    expect(offerService.hasUpToDateRevision(2)).toBe(true);
    const db = getDb();
    const offer = db.offers.find(o => o.id === 2)!;
    const lines = db.offerLines.filter(l => l.offerId === 2);
    const rev = db.offerRevisions.find(r => r.offerId === 2)!;
    expect(snapshotEquals(captureSnapshot(offer, lines), rev.snapshot)).toBe(true);
  });
});
