import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { SortingState } from '@tanstack/react-table';
import * as rfqService from '@/api/rfqService';
import type { RfqWithComputed } from '@/api/rfqService';
import * as dictionaryService from '@/api/dictionaryService';
import { useTabsStore } from '@/stores/tabsStore';
import { RFQ_STATUSES } from '@/types/enums';
import type { RfqStatus } from '@/types/enums';
import type { DictItem } from '@/types/models';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { handleRowClick } from '@/lib/rowClick';
import { RfqForm } from './RfqForm';

type RfqRow = RfqWithComputed & { inquiryTypeLabel: string };

const STATUS_BADGE: Record<RfqStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  NOWE: { variant: 'default' },
  WYSLANE: { variant: 'secondary' },
  ZAAKCEPTOWANE: { variant: 'outline', className: 'border-green-600 text-green-700 dark:text-green-400' },
  WSTRZYMANE: { variant: 'destructive' },
};

const columnHelper = createColumnHelper<RfqRow>();

export function RfqGrid() {
  const { t } = useTranslation();
  const openTab = useTabsStore(s => s.openTab);

  const [rfqs, setRfqs] = useState<RfqWithComputed[]>([]);
  const [inquiryTypes, setInquiryTypes] = useState<DictItem[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RfqStatus>('ALL');
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    const [rfqData, inquiryTypeData] = await Promise.all([
      rfqService.list(),
      dictionaryService.list('inquiryTypes'),
    ]);
    setRfqs(rfqData);
    setInquiryTypes(inquiryTypeData as DictItem[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const data: RfqRow[] = useMemo(() => {
    const inquiryTypeMap = new Map(inquiryTypes.map(it => [it.id, it.labelPL]));
    return rfqs
      .filter(rfq => statusFilter === 'ALL' || rfq.status === statusFilter)
      .map(rfq => ({
        ...rfq,
        inquiryTypeLabel: inquiryTypeMap.get(rfq.inquiryTypeId) ?? '',
      }));
  }, [rfqs, inquiryTypes, statusFilter]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('numer', {
        header: t('rfq.numer'),
        cell: info => (
          <span className="text-primary underline-offset-2 hover:underline">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('clientName', { header: t('rfq.klient') }),
      columnHelper.accessor('nazwa', { header: t('rfq.nazwa') }),
      columnHelper.accessor('inquiryTypeLabel', { header: t('rfq.typZapytania') }),
      columnHelper.accessor('status', {
        header: t('rfq.status'),
        cell: info => {
          const status = info.getValue();
          const badge = STATUS_BADGE[status];
          return (
            <Badge variant={badge.variant} className={badge.className}>
              {t(`statuses.${status}`)}
            </Badge>
          );
        },
      }),
      columnHelper.accessor('coordinatorName', { header: t('rfq.koordynator') }),
      columnHelper.accessor('dataZapytania', { header: t('rfq.dataZapytania') }),
      columnHelper.accessor('deadline', { header: t('rfq.deadline') }),
      columnHelper.accessor('dniDoWyslania', {
        header: t('rfq.dniDoWyslania'),
        cell: ({ row }) => {
          // Only show urgency for NOWE status
          if (row.original.status !== 'NOWE') return <span>—</span>;
          const d = row.original.dniDoWyslania;
          if (d === undefined) return <span>—</span>;
          if (d < 0) {
            return (
              <Badge className="bg-red-600 text-white">
                {Math.abs(d)} {t('rfq.dniPo')}
              </Badge>
            );
          }
          if (d <= 3) {
            return (
              <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                {d} {t('rfq.dni')}
              </Badge>
            );
          }
          if (d <= 7) {
            return (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                {d} {t('rfq.dni')}
              </Badge>
            );
          }
          return <span className="text-muted-foreground">{d} {t('rfq.dni')}</span>;
        },
      }),
      columnHelper.accessor('dniPoWyslaniu', {
        header: t('rfq.dniPoWyslaniu'),
        cell: ({ row }) => {
          const d = row.original.dniPoWyslaniu;
          if (d === undefined) return <span>—</span>;
          return <span className="text-muted-foreground">{d} {t('rfq.dni')}</span>;
        },
      }),
      columnHelper.accessor('wymaganaDokumentacja', {
        header: t('rfq.dokumentacja'),
        cell: info => (info.getValue() ? t('common.yes') : t('common.no')),
      }),
    ],
    [t]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const statusItems = useMemo(
    () => [
      { value: 'ALL', label: t('rfq.wszystkieStatusy') },
      ...RFQ_STATUSES.map(status => ({ value: status, label: t(`statuses.${status}`) })),
    ],
    [t]
  );

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <Input
          className="max-w-xs"
          placeholder={t('rfq.szukaj')}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
        <Select
          items={statusItems}
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as 'ALL' | RfqStatus)}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusItems.map(item => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button onClick={() => setFormOpen(true)}>{t('rfq.noweZapytanie')}</Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[1400px]">
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className="cursor-pointer select-none whitespace-nowrap"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === 'asc' && ' ▲'}
                    {header.column.getIsSorted() === 'desc' && ' ▼'}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map(row => (
              <TableRow
                key={row.id}
                className={cn(
                  'cursor-pointer',
                  row.original.status === 'NOWE' &&
                    row.original.dniDoWyslania !== undefined &&
                    row.original.dniDoWyslania < 0 &&
                    'border-l-[3px] border-l-red-600'
                )}
                onClick={(e) =>
                  handleRowClick(e, () =>
                    openTab({ type: 'rfq', entityId: row.original.id, title: row.original.numer })
                  )
                }
              >
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id} className="whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <RfqForm open={formOpen} onOpenChange={setFormOpen} onCreated={() => void load()} />
    </div>
  );
}
