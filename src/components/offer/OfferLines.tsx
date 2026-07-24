import { useTranslation } from 'react-i18next';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import type { OfferLineDTO } from '@/api/offerService';
import { formatPln, round2 } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export type EditableLineField =
  | 'nazwaPrzyrzadu'
  | 'ilosc'
  | 'kosztWykonania'
  | 'rabat'
  | 'cenaSprzedazy';

interface OfferLinesProps {
  lines: OfferLineDTO[];
  readOnly?: boolean;
  onFieldChange?: (lineId: number, field: EditableLineField, value: number | string) => void;
  onAddLine?: () => void;
  onRemoveLine?: (lineId: number) => void;
}

/** A line typed in by hand (no quotation source) — its cost/name/qty are editable. */
function isManual(line: OfferLineDTO): boolean {
  return line.sourceRfqId === null && line.sourceBomNodeId === null;
}

export function OfferLines({
  lines,
  readOnly = false,
  onFieldChange,
  onAddLine,
  onRemoveLine,
}: OfferLinesProps) {
  const { t } = useTranslation();

  // CRITICAL (PRD §3.2): profit columns exist only when the DTO carries the fields.
  const showProfit = lines.length > 0 && lines[0].zysk !== undefined;
  const colCount = 7 + (showProfit ? 2 : 0) + (readOnly ? 0 : 1);

  function numberCell(line: OfferLineDTO, field: EditableLineField, editable: boolean) {
    if (readOnly || !editable) {
      const value = line[field] as number;
      return field === 'ilosc' ? value : formatPln(value);
    }
    return (
      <Input
        type="number"
        step={field === 'ilosc' ? '1' : '0.01'}
        min={0}
        className="w-28"
        value={line[field] as number}
        onChange={(e) =>
          onFieldChange?.(line.id, field, round2(Number(e.target.value) || 0))
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{t('offer.linie')}</h3>
      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-[1000px]">
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">{t('offer.lp')}</TableHead>
              <TableHead className="whitespace-nowrap">{t('offer.nazwaPrzyrzadu')}</TableHead>
              <TableHead className="whitespace-nowrap">{t('offer.ilosc')}</TableHead>
              <TableHead className="whitespace-nowrap">{t('offer.kosztWykonania')}</TableHead>
              <TableHead className="whitespace-nowrap">{t('offer.rabatPozycji')}</TableHead>
              <TableHead className="whitespace-nowrap">{t('offer.cenaSprzedazy')}</TableHead>
              <TableHead className="whitespace-nowrap">{t('offer.wartosc')}</TableHead>
              {showProfit && (
                <>
                  <TableHead className="whitespace-nowrap">{t('offer.zysk')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('offer.marza')}</TableHead>
                </>
              )}
              {!readOnly && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map(line => {
              const manual = isManual(line);
              return (
                <TableRow key={line.id}>
                  <TableCell>{line.lp}</TableCell>
                  <TableCell>
                    {readOnly || !manual ? (
                      line.nazwaPrzyrzadu
                    ) : (
                      <Input
                        className="w-56"
                        value={line.nazwaPrzyrzadu}
                        onChange={(e) =>
                          onFieldChange?.(line.id, 'nazwaPrzyrzadu', e.target.value)
                        }
                      />
                    )}
                  </TableCell>
                  <TableCell>{numberCell(line, 'ilosc', manual)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {numberCell(line, 'kosztWykonania', manual)}
                  </TableCell>
                  <TableCell>{numberCell(line, 'rabat', true)}</TableCell>
                  <TableCell>{numberCell(line, 'cenaSprzedazy', true)}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {formatPln(line.wartosc ?? 0)}
                  </TableCell>
                  {showProfit && (
                    <>
                      <TableCell className="whitespace-nowrap">
                        {formatPln(line.zysk ?? 0)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{line.marza ?? 0} %</TableCell>
                    </>
                  )}
                  {!readOnly && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('offer.removeLine')}
                        title={t('offer.removeLine')}
                        onClick={() => onRemoveLine?.(line.id)}
                      >
                        <Trash2Icon className="text-muted-foreground" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {!readOnly && (
              <TableRow
                className="cursor-pointer text-muted-foreground hover:bg-muted/40"
                onClick={() => onAddLine?.()}
              >
                <TableCell colSpan={colCount}>
                  <span className="flex items-center gap-2 text-sm">
                    <PlusIcon className="size-4" />
                    {t('offer.addLine')}
                  </span>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
