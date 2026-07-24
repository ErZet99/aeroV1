import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { ColumnDef } from '@tanstack/react-table';
import type { OfferLineDTO } from '@/api/offerService';
import { formatPln, round2 } from '@/lib/money';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface OfferLinesProps {
  lines: OfferLineDTO[];
  readOnly?: boolean;
  onLineChange: (lineId: number, field: 'negocjacje' | 'cenaSprzedazy', value: number) => void;
}

const columnHelper = createColumnHelper<OfferLineDTO>();

export function OfferLines({ lines, readOnly = false, onLineChange }: OfferLinesProps) {
  const { t } = useTranslation();

  // CRITICAL (PRD §3.2): profit columns exist only when the DTO carries the fields.
  const showProfit = lines.length > 0 && lines[0].zysk !== undefined;

  const columns = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cols: ColumnDef<OfferLineDTO, any>[] = [
      columnHelper.accessor('lp', { header: t('offer.lp') }),
      columnHelper.accessor('nazwaPrzyrzadu', { header: t('offer.nazwaPrzyrzadu') }),
      columnHelper.accessor('ilosc', { header: t('offer.ilosc') }),
      columnHelper.accessor('kosztWykonania', {
        header: t('offer.kosztWykonania'),
        cell: info => <span className="whitespace-nowrap">{formatPln(info.getValue())}</span>,
      }),
      columnHelper.accessor('negocjacje', {
        header: t('offer.negocjacje'),
        cell: ({ row }) =>
          readOnly ? (
            formatPln(row.original.negocjacje)
          ) : (
            <Input
              type="number"
              step="0.01"
              className="w-28"
              value={row.original.negocjacje}
              onChange={(e) =>
                onLineChange(row.original.id, 'negocjacje', round2(Number(e.target.value) || 0))
              }
            />
          ),
      }),
      columnHelper.accessor('cenaSprzedazy', {
        header: t('offer.cenaSprzedazy'),
        cell: ({ row }) =>
          readOnly ? (
            formatPln(row.original.cenaSprzedazy)
          ) : (
            <Input
              type="number"
              step="0.01"
              min={0}
              className="w-28"
              value={row.original.cenaSprzedazy}
              onChange={(e) =>
                onLineChange(row.original.id, 'cenaSprzedazy', round2(Number(e.target.value) || 0))
              }
            />
          ),
      }),
      columnHelper.accessor('wartosc', {
        header: t('offer.wartosc'),
        cell: info => <span className="font-medium">{formatPln(info.getValue() ?? 0)}</span>,
      }),
    ];

    if (showProfit) {
      cols.push(
        columnHelper.display({
          id: 'zysk',
          header: t('offer.zysk'),
          cell: ({ row }) => formatPln(row.original.zysk ?? 0),
        }),
        columnHelper.display({
          id: 'marza',
          header: t('offer.marza'),
          cell: ({ row }) => `${row.original.marza ?? 0} %`,
        })
      );
    }

    return cols;
  }, [t, showProfit, readOnly, onLineChange]);

  const table = useReactTable({
    data: lines,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{t('offer.linie')}</h3>
      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-[1200px]">
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map(row => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
