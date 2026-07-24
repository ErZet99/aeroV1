import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as offerService from '@/api/offerService';
import { discountedTotal } from '@/api/offerService';
import * as dictionaryService from '@/api/dictionaryService';
import { getDb } from '@/api/db';
import { useTabsStore } from '@/stores/tabsStore';
import { useAuthStore } from '@/stores/authStore';
import type { OfferStatus } from '@/types/enums';
import type { Client } from '@/types/models';
import { formatPln } from '@/lib/money';
import { handleRowClick } from '@/lib/rowClick';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const OFFER_STATUS_BADGE: Record<
  OfferStatus,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }
> = {
  SZKIC: { variant: 'secondary' },
  WYSLANA: { variant: 'default' },
  ZAAKCEPTOWANA: { variant: 'outline', className: 'border-green-600 text-green-700 dark:text-green-400' },
  ODRZUCONA: { variant: 'destructive' },
  WSTRZYMANA: { variant: 'outline' },
};

interface OfferRow {
  id: number;
  numer: string;
  revision: string;
  clientName: string;
  status: OfferStatus;
  wartosc: number;
  salesRepName: string;
  data: string;
}

export function OfferGrid() {
  const { t } = useTranslation();
  const openTab = useTabsStore(s => s.openTab);
  const role = useAuthStore(s => s.currentUser.role);

  const [rows, setRows] = useState<OfferRow[]>([]);

  const load = useCallback(async () => {
    const [offers, clientData] = await Promise.all([
      offerService.list(),
      dictionaryService.list('clients'),
    ]);
    const details = await Promise.all(offers.map(o => offerService.get(o.id, role)));
    const clients = clientData as Client[];
    const users = getDb().users;

    setRows(
      offers.map((offer, i) => {
        const lines = details[i]?.lines ?? [];
        const total = lines.reduce((acc, line) => acc + (line.wartosc ?? 0), 0);
        const salesRep = users.find(u => u.id === offer.salesRepId);
        return {
          id: offer.id,
          numer: offer.numer,
          revision: offer.revision,
          clientName: clients.find(c => c.id === offer.clientId)?.name ?? '',
          status: offer.status,
          wartosc: discountedTotal(total, offer.rabatType, offer.rabatValue),
          salesRepName: salesRep ? `${salesRep.firstName} ${salesRep.lastName}` : '',
          data: offer.createdAt.split('T')[0],
        };
      })
    );
  }, [role]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-3 p-4">
      <h2 className="text-lg font-semibold">{t('sidebar.offers')}</h2>
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[1000px]">
        <TableHeader>
          <TableRow>
            <TableHead>{t('offer.numer')}</TableHead>
            <TableHead>{t('offer.rewizja')}</TableHead>
            <TableHead>{t('offer.klient')}</TableHead>
            <TableHead>{t('offer.status')}</TableHead>
            <TableHead>{t('offer.wartosc')}</TableHead>
            <TableHead>{t('offer.handlowiec')}</TableHead>
            <TableHead>{t('offer.data')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => {
            const badge = OFFER_STATUS_BADGE[row.status];
            return (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={(e) =>
                  handleRowClick(e, () =>
                    openTab({ type: 'offer', entityId: row.id, title: row.numer })
                  )
                }
              >
                <TableCell>
                  <span className="text-primary underline-offset-2 hover:underline">
                    {row.numer}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{row.revision}</Badge>
                </TableCell>
                <TableCell>{row.clientName}</TableCell>
                <TableCell>
                  <Badge variant={badge.variant} className={badge.className}>
                    {t(`offerStatuses.${row.status}`)}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{formatPln(row.wartosc)}</TableCell>
                <TableCell>{row.salesRepName}</TableCell>
                <TableCell>{row.data}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
