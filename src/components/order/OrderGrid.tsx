import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as orderService from '@/api/orderService';
import * as offerService from '@/api/offerService';
import * as dictionaryService from '@/api/dictionaryService';
import { useTabsStore } from '@/stores/tabsStore';
import type { OrderStatus } from '@/types/enums';
import type { Client, OfferRevision } from '@/types/models';
import { handleRowClick } from '@/lib/rowClick';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { OrderCreateDialog } from './OrderCreateDialog';

export const ORDER_STATUS_BADGE: Record<
  OrderStatus,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }
> = {
  NOWE: { variant: 'default' },
  W_TOKU: { variant: 'secondary' },
  ZAMKNIETE: {
    variant: 'outline',
    className: 'border-green-600 text-green-700 dark:text-green-400',
  },
  ANULOWANE: { variant: 'destructive' },
};

interface OrderRow {
  id: number;
  numer: string;
  clientName: string;
  offerLabel: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export function OrderGrid() {
  const { t } = useTranslation();
  const openTab = useTabsStore(s => s.openTab);

  const [rows, setRows] = useState<OrderRow[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    const [orders, clientData, offers] = await Promise.all([
      orderService.list(),
      dictionaryService.list('clients'),
      offerService.list(),
    ]);
    const allRevisions = await Promise.all(
      offers.map(o => offerService.listRevisions(o.id))
    );
    const clients = clientData as Client[];
    const revisionById = new Map<number, OfferRevision>();
    allRevisions.flat().forEach(r => revisionById.set(r.id, r));

    setRows(
      orders.map(order => {
        const offer = offers.find(o => o.id === order.offerId);
        const rev = revisionById.get(order.offerRevisionId);
        return {
          id: order.id,
          numer: order.numer,
          clientName: clients.find(c => c.id === order.clientId)?.name ?? '',
          offerLabel: offer
            ? `${offer.numer}${rev ? ` / ${rev.revision}` : ''}`
            : '—',
          status: order.status,
          createdAt: order.createdAt.split('T')[0],
          updatedAt: order.updatedAt.split('T')[0],
        };
      })
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t('sidebar.orders')}</h2>
        <Button onClick={() => setCreateOpen(true)}>{t('order.noweZlecenie')}</Button>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead>{t('order.numer')}</TableHead>
              <TableHead>{t('order.klient')}</TableHead>
              <TableHead>{t('order.oferta')}</TableHead>
              <TableHead>{t('order.status')}</TableHead>
              <TableHead>{t('order.createdAt')}</TableHead>
              <TableHead>{t('order.updatedAt')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(row => {
              const badge = ORDER_STATUS_BADGE[row.status];
              return (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={e =>
                    handleRowClick(e, () =>
                      openTab({ type: 'order', entityId: row.id, title: row.numer })
                    )
                  }
                >
                  <TableCell>
                    <span className="text-primary underline-offset-2 hover:underline">
                      {row.numer}
                    </span>
                  </TableCell>
                  <TableCell>{row.clientName}</TableCell>
                  <TableCell>{row.offerLabel}</TableCell>
                  <TableCell>
                    <Badge variant={badge.variant} className={badge.className}>
                      {t(`orderStatuses.${row.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.createdAt}</TableCell>
                  <TableCell>{row.updatedAt}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <OrderCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={order => {
          setCreateOpen(false);
          void load();
          openTab({ type: 'order', entityId: order.id, title: order.numer });
        }}
      />
    </div>
  );
}
