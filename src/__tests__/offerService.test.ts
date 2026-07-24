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
      rabatType: 'PROCENT',
      rabatValue: 5,
      globalMarginPct: null,
      lines: before!.lines.map(l => ({
        id: l.id,
        negocjacje: 10,
        cenaSprzedazy: 1500,
      })),
    });

    const after = await offerService.get(1);
    expect(after!.offer.nrZamowieniaKlienta).toBe('PO-99');
    expect(after!.offer.rabatType).toBe('PROCENT');
    expect(after!.offer.rabatValue).toBe(5);
    expect(after!.lines[0].cenaSprzedazy).toBe(1500);
    expect(after!.lines[0].negocjacje).toBe(10);
    expect(after!.offer.revision).toBeNull();
    expect(await offerService.listRevisions(1)).toHaveLength(0);
  });

  it('createRevision freezes A then B and leaves prior snapshot immutable', async () => {
    await offerService.saveWorkingCopy(1, {
      nrZamowieniaKlienta: null,
      rabatType: null,
      rabatValue: null,
      globalMarginPct: null,
      lines: [{ id: 1, negocjacje: 0, cenaSprzedazy: 1000 }],
    });

    const revA = await offerService.createRevision(1, 2);
    expect(revA.revision).toBe('A');
    expect(revA.snapshot.lines[0].cenaSprzedazy).toBe(1000);

    await offerService.saveWorkingCopy(1, {
      nrZamowieniaKlienta: null,
      rabatType: null,
      rabatValue: null,
      globalMarginPct: null,
      lines: [{ id: 1, negocjacje: 0, cenaSprzedazy: 2000 }],
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

  it('hasUpToDateRevision is false when dirty, true after matching revision', async () => {
    expect(offerService.hasUpToDateRevision(1)).toBe(false);

    await offerService.saveWorkingCopy(1, {
      nrZamowieniaKlienta: null,
      rabatType: null,
      rabatValue: null,
      globalMarginPct: null,
      lines: [{ id: 1, negocjacje: 0, cenaSprzedazy: 800 }],
    });
    await offerService.createRevision(1, 2);
    expect(offerService.hasUpToDateRevision(1)).toBe(true);

    await offerService.saveWorkingCopy(1, {
      nrZamowieniaKlienta: null,
      rabatType: null,
      rabatValue: null,
      globalMarginPct: null,
      lines: [{ id: 1, negocjacje: 0, cenaSprzedazy: 900 }],
    });
    expect(offerService.hasUpToDateRevision(1)).toBe(false);
  });
});

describe('offerService margin, discount, markAsSent', () => {
  beforeEach(() => {
    resetDb();
  });

  it('applyGlobalMargin recalculates cenaSprzedazy from cost', async () => {
    await offerService.saveWorkingCopy(1, {
      nrZamowieniaKlienta: null,
      rabatType: null,
      rabatValue: null,
      globalMarginPct: null,
      lines: [{ id: 1, negocjacje: 25, cenaSprzedazy: 0 }],
    });
    // Seed line has koszt 0 — set koszt via db for a meaningful margin check
    const db = getDb();
    db.offerLines[0].kosztWykonania = 1000;
    db.offerLines[0].negocjacje = 25;

    await offerService.applyGlobalMargin(1, 20);
    const detail = await offerService.get(1);
    expect(detail!.offer.globalMarginPct).toBe(20);
    expect(detail!.lines[0].cenaSprzedazy).toBe(1200);
    expect(detail!.lines[0].negocjacje).toBe(25);
  });

  it('applyDiscount stores rabat without mutating line prices', async () => {
    const before = await offerService.get(2);
    const price = before!.lines[0].cenaSprzedazy;
    await offerService.applyDiscount(2, 'KWOTA', 100);
    const after = await offerService.get(2);
    expect(after!.offer.rabatType).toBe('KWOTA');
    expect(after!.offer.rabatValue).toBe(100);
    expect(after!.lines[0].cenaSprzedazy).toBe(price);
  });

  it('markAsSent requires up-to-date revision and stamps RFQ', async () => {
    await expect(offerService.markAsSent(1)).rejects.toThrow(/revision/i);

    await offerService.saveWorkingCopy(1, {
      nrZamowieniaKlienta: null,
      rabatType: null,
      rabatValue: null,
      globalMarginPct: null,
      lines: [{ id: 1, negocjacje: 0, cenaSprzedazy: 500 }],
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
