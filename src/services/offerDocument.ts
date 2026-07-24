import { round2 } from '@/lib/money';
import type { RabatType } from '@/types/enums';
import type {
  BomNode,
  Offer,
  OfferDocumentSnapshot,
  OfferLine,
  OfferRevisionSnapshot,
} from '@/types/models';
import { nodeSubtree } from './bomEditor';

export type { OfferDocumentSnapshot, OfferRevisionSnapshot };

export interface OfferSummary {
  suma: number;
  marzaKwota: number;
  rabatKwota: number;
  razem: number;
}

/** Offer total after whole-offer discount (PROCENT / KWOTA). v1 UI uses KWOTA only. */
export function discountedTotal(
  total: number,
  rabatType: RabatType | null,
  rabatValue: number | null
): number {
  if (!rabatType || rabatValue === null) return round2(total);
  if (rabatType === 'PROCENT') return round2(total * (1 - rabatValue / 100));
  return round2(total - rabatValue);
}

/** Line value after per-unit discount: (cena_sprzedaży − rabat) × ilość. */
function lineWartosc(line: { cenaSprzedazy: number; rabat: number; ilosc: number }): number {
  return round2((line.cenaSprzedazy - line.rabat) * line.ilosc);
}

function lineZysk(line: {
  cenaSprzedazy: number;
  rabat: number;
  kosztWykonania: number;
  ilosc: number;
}): number {
  return round2((line.cenaSprzedazy - line.rabat - line.kosztWykonania) * line.ilosc);
}

/**
 * Live summary. `marzaKwota` = Σ line profit (read-only "Marża globalna", never added to razem).
 * `rabatKwota` = whole-offer discount amount. `razem` = suma − rabat ogólny.
 */
export function offerSummary(
  lines: Array<{ cenaSprzedazy: number; rabat: number; kosztWykonania: number; ilosc: number }>,
  rabatType: RabatType | null,
  rabatValue: number | null
): OfferSummary {
  const suma = round2(lines.reduce((acc, line) => acc + lineWartosc(line), 0));
  const marzaKwota = round2(lines.reduce((acc, line) => acc + lineZysk(line), 0));
  const razem = discountedTotal(suma, rabatType, rabatValue);
  return {
    suma,
    marzaKwota,
    rabatKwota: round2(suma - razem),
    razem,
  };
}

export function captureSnapshot(offer: Offer, lines: OfferLine[]): OfferDocumentSnapshot {
  return {
    numer: offer.numer,
    entityId: offer.entityId,
    clientId: offer.clientId,
    nrZamowieniaKlienta: offer.nrZamowieniaKlienta,
    rabatType: offer.rabatType,
    rabatValue: offer.rabatValue,
    salesRepId: offer.salesRepId,
    deliveryTimeId: offer.deliveryTimeId,
    lines: lines
      .slice()
      .sort((a, b) => a.lp - b.lp)
      .map(line => ({
        lp: line.lp,
        nazwaPrzyrzadu: line.nazwaPrzyrzadu,
        ilosc: line.ilosc,
        sourceRfqId: line.sourceRfqId,
        sourceBomNodeId: line.sourceBomNodeId,
        kosztWykonania: line.kosztWykonania,
        rabat: line.rabat,
        cenaSprzedazy: line.cenaSprzedazy,
      })),
  };
}

/**
 * Freeze a revision: commercial content plus a copy of each line's BOM tree, taken
 * from `bomNodes` via `sourceBomNodeId`. Manual lines freeze an empty tree.
 */
export function captureRevisionSnapshot(
  offer: Offer,
  lines: OfferLine[],
  bomNodes: BomNode[]
): OfferRevisionSnapshot {
  const base = captureSnapshot(offer, lines);
  return {
    ...base,
    lines: base.lines.map(line => ({
      ...line,
      bomSnapshot:
        line.sourceBomNodeId === null
          ? []
          : JSON.parse(JSON.stringify(nodeSubtree(bomNodes, line.sourceBomNodeId))),
    })),
  };
}

/** True when working copy equals the given revision snapshot (commercial content). */
export function snapshotEquals(a: OfferDocumentSnapshot, b: OfferDocumentSnapshot): boolean {
  return JSON.stringify(commercialOnly(a)) === JSON.stringify(commercialOnly(b));
}

function commercialOnly(snapshot: OfferDocumentSnapshot): OfferDocumentSnapshot {
  return {
    ...snapshot,
    lines: snapshot.lines.map(line => ({
      lp: line.lp,
      nazwaPrzyrzadu: line.nazwaPrzyrzadu,
      ilosc: line.ilosc,
      sourceRfqId: line.sourceRfqId,
      sourceBomNodeId: line.sourceBomNodeId,
      kosztWykonania: line.kosztWykonania,
      rabat: line.rabat,
      cenaSprzedazy: line.cenaSprzedazy,
    })),
  };
}

/** Next revision letter given existing labels (empty → A). */
export function nextRevisionLabel(existing: string[]): string {
  if (existing.length === 0) return 'A';
  const sorted = existing.slice().sort();
  const last = sorted[sorted.length - 1];
  if (last.length !== 1) return 'A';
  return String.fromCharCode(last.charCodeAt(0) + 1);
}

export interface PdfDocumentInput {
  language: 'PL' | 'EN';
  numer: string;
  revisionLabel: string | null;
  generatedAt: string;
  entityName: string;
  entityAddress: string;
  entityNip: string;
  clientName: string;
  clientAddress: string;
  salesRepName: string;
  lines: Array<{ lp: number; nazwa: string; ilosc: number; cena: number; wartosc: number }>;
  summary: OfferSummary;
  legalClauses: string[];
}

const PDF_I18N = {
  PL: {
    title: 'Oferta handlowa',
    revision: 'Rewizja',
    workingCopy: 'kopia robocza',
    entity: 'Wystawca',
    client: 'Klient',
    salesRep: 'Handlowiec',
    nip: 'NIP',
    lp: 'Lp.',
    name: 'Nazwa',
    qty: 'Ilość',
    price: 'Cena',
    value: 'Wartość',
    suma: 'Suma',
    marza: 'Marża',
    rabat: 'Rabat',
    razem: 'Razem',
    generated: 'Wygenerowano',
    legal: 'Klauzule prawne',
  },
  EN: {
    title: 'Commercial offer',
    revision: 'Revision',
    workingCopy: 'working copy',
    entity: 'Issuer',
    client: 'Client',
    salesRep: 'Sales rep',
    nip: 'Tax ID',
    lp: 'No.',
    name: 'Name',
    qty: 'Qty',
    price: 'Price',
    value: 'Amount',
    suma: 'Subtotal',
    marza: 'Margin',
    rabat: 'Discount',
    razem: 'Total',
    generated: 'Generated',
    legal: 'Legal clauses',
  },
} as const;

function money(n: number, language: 'PL' | 'EN'): string {
  return new Intl.NumberFormat(language === 'PL' ? 'pl-PL' : 'en-GB', {
    style: 'currency',
    currency: 'PLN',
  }).format(n);
}

/** Styled printable HTML — no npm deps; caller opens via window.print(). */
export function buildOfferPdfHtml(input: PdfDocumentInput): string {
  const i = PDF_I18N[input.language];
  const rev =
    input.revisionLabel != null ? `${i.revision} ${input.revisionLabel}` : i.workingCopy;

  const rows = input.lines
    .map(
      line =>
        `<tr>
          <td>${line.lp}</td>
          <td>${escapeHtml(line.nazwa)}</td>
          <td>${line.ilosc}</td>
          <td>${money(line.cena, input.language)}</td>
          <td>${money(line.wartosc, input.language)}</td>
        </tr>`
    )
    .join('');

  const clauses = input.legalClauses
    .map(c => `<li>${escapeHtml(c)}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="${input.language === 'PL' ? 'pl' : 'en'}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.numer)} — ${i.title}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #1a1a1a; margin: 32px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    .meta { color: #555; margin-bottom: 24px; font-size: 13px; }
    .parties { display: flex; gap: 48px; margin-bottom: 28px; font-size: 13px; }
    .parties h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #666; margin: 0 0 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border-bottom: 1px solid #ddd; padding: 8px 6px; text-align: left; }
    th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #555; }
    td:nth-child(3), td:nth-child(4), td:nth-child(5),
    th:nth-child(3), th:nth-child(4), th:nth-child(5) { text-align: right; }
    .summary { margin-top: 20px; width: 280px; margin-left: auto; font-size: 13px; }
    .summary div { display: flex; justify-content: space-between; padding: 3px 0; }
    .summary .total { font-weight: bold; border-top: 1px solid #333; margin-top: 6px; padding-top: 6px; }
    .legal { margin-top: 36px; font-size: 11px; color: #444; }
    .legal h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
    footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 11px; color: #666; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <h1>${i.title} ${escapeHtml(input.numer)}</h1>
  <div class="meta">${rev}</div>
  <div class="parties">
    <div>
      <h2>${i.entity}</h2>
      <div>${escapeHtml(input.entityName)}</div>
      <div>${escapeHtml(input.entityAddress)}</div>
      <div>${i.nip}: ${escapeHtml(input.entityNip)}</div>
    </div>
    <div>
      <h2>${i.client}</h2>
      <div>${escapeHtml(input.clientName)}</div>
      <div>${escapeHtml(input.clientAddress)}</div>
    </div>
    <div>
      <h2>${i.salesRep}</h2>
      <div>${escapeHtml(input.salesRepName)}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>${i.lp}</th>
        <th>${i.name}</th>
        <th>${i.qty}</th>
        <th>${i.price}</th>
        <th>${i.value}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="summary">
    <div><span>${i.suma}</span><span>${money(input.summary.suma, input.language)}</span></div>
    <div><span>${i.marza}</span><span>${money(input.summary.marzaKwota, input.language)}</span></div>
    <div><span>${i.rabat}</span><span>−${money(input.summary.rabatKwota, input.language)}</span></div>
    <div class="total"><span>${i.razem}</span><span>${money(input.summary.razem, input.language)}</span></div>
  </div>
  <div class="legal">
    <h2>${i.legal}</h2>
    <ul>${clauses}</ul>
  </div>
  <footer>${i.generated}: ${escapeHtml(input.generatedAt)} · ${escapeHtml(input.numer)} / ${escapeHtml(rev)}</footer>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
