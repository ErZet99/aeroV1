import { describe, it, expect } from 'vitest';
import {
  applyMarginToLines,
  buildOfferPdfHtml,
  captureSnapshot,
  discountedTotal,
  nextRevisionLabel,
  offerSummary,
  salePriceFromMargin,
  snapshotEquals,
} from '@/services/offerDocument';
import type { Offer, OfferLine } from '@/types/models';

describe('offerDocument commercial math', () => {
  it('derives sale price from margin percent on cost', () => {
    expect(salePriceFromMargin(1000, 20)).toBe(1200);
    expect(salePriceFromMargin(100, 12.5)).toBe(112.5);
  });

  it('applies global margin to all lines without touching negocjacje', () => {
    const lines = applyMarginToLines(
      [
        { id: 1, kosztWykonania: 1000, cenaSprzedazy: 0, negocjacje: 50 },
        { id: 2, kosztWykonania: 200, cenaSprzedazy: 0, negocjacje: 0 },
      ],
      25
    );
    expect(lines[0]).toMatchObject({ cenaSprzedazy: 1250, negocjacje: 50 });
    expect(lines[1]).toMatchObject({ cenaSprzedazy: 250, negocjacje: 0 });
  });

  it('computes discount PROCENT and KWOTA', () => {
    expect(discountedTotal(1000, 'PROCENT', 10)).toBe(900);
    expect(discountedTotal(1000, 'KWOTA', 150)).toBe(850);
    expect(discountedTotal(1000, null, null)).toBe(1000);
  });

  it('builds live summary suma → marża → rabat → razem', () => {
    const summary = offerSummary(
      [
        { cenaSprzedazy: 1200, negocjacje: 0, kosztWykonania: 1000, ilosc: 1 },
        { cenaSprzedazy: 500, negocjacje: 100, kosztWykonania: 400, ilosc: 2 },
      ],
      'PROCENT',
      10
    );
    // line1 wartosc=1200 zysk=200; line2 wartosc=1200 zysk=400 → suma=2400, marża=600
    expect(summary.suma).toBe(2400);
    expect(summary.marzaKwota).toBe(600);
    expect(summary.rabatKwota).toBe(240);
    expect(summary.razem).toBe(2160);
  });
});

describe('offerDocument revisions', () => {
  const offer: Offer = {
    id: 1,
    rfqId: 1,
    numer: '2150-05-2026',
    revision: null,
    entityId: 1,
    clientId: 1,
    nrZamowieniaKlienta: null,
    status: 'SZKIC',
    rabatType: null,
    rabatValue: null,
    globalMarginPct: 20,
    salesRepId: 2,
    deliveryTimeId: 1,
    version: 1,
    createdAt: '2026-05-15T10:00:00Z',
    updatedAt: '2026-05-15T10:00:00Z',
  };

  const lines: OfferLine[] = [
    {
      id: 1,
      offerId: 1,
      lp: 1,
      nazwaPrzyrzadu: 'Frame',
      ilosc: 1,
      sourceRfqId: 1,
      sourceBomNodeId: 5,
      kosztWykonania: 1000,
      negocjacje: 0,
      cenaSprzedazy: 1200,
    },
  ];

  it('allocates revision letters A, B, C…', () => {
    expect(nextRevisionLabel([])).toBe('A');
    expect(nextRevisionLabel(['A'])).toBe('B');
    expect(nextRevisionLabel(['A', 'B'])).toBe('C');
  });

  it('detects working copy matching a revision snapshot', () => {
    const snap = captureSnapshot(offer, lines);
    expect(snapshotEquals(snap, captureSnapshot(offer, lines))).toBe(true);
    const dirty = captureSnapshot(offer, [{ ...lines[0], cenaSprzedazy: 1300 }]);
    expect(snapshotEquals(snap, dirty)).toBe(false);
  });
});

describe('offerDocument PDF', () => {
  it('renders PL document with stamp and clauses', () => {
    const html = buildOfferPdfHtml({
      language: 'PL',
      numer: '2150-05-2026',
      revisionLabel: 'B',
      generatedAt: '2026-07-24 16:00',
      entityName: 'Aero Sp. z o.o.',
      entityAddress: 'ul. Lotnicza 1',
      entityNip: '5250000000',
      clientName: 'Klient SA',
      clientAddress: 'ul. Klienta 2',
      salesRepName: 'Jan Kowalski',
      lines: [{ lp: 1, nazwa: 'Frame', ilosc: 1, cena: 1200, wartosc: 1200 }],
      summary: { suma: 1200, marzaKwota: 200, rabatKwota: 0, razem: 1200 },
      legalClauses: ['Oferta ważna 30 dni.'],
    });
    expect(html).toContain('Oferta handlowa');
    expect(html).toContain('Rewizja B');
    expect(html).toContain('Aero Sp. z o.o.');
    expect(html).toContain('Oferta ważna 30 dni.');
    expect(html).toContain('2150-05-2026 / Rewizja B');
  });

  it('renders EN structural labels', () => {
    const html = buildOfferPdfHtml({
      language: 'EN',
      numer: '2150-05-2026',
      revisionLabel: null,
      generatedAt: '2026-07-24 16:00',
      entityName: 'Aero',
      entityAddress: 'x',
      entityNip: '1',
      clientName: 'Client',
      clientAddress: 'y',
      salesRepName: 'Rep',
      lines: [],
      summary: { suma: 0, marzaKwota: 0, rabatKwota: 0, razem: 0 },
      legalClauses: [],
    });
    expect(html).toContain('Commercial offer');
    expect(html).toContain('working copy');
  });
});
