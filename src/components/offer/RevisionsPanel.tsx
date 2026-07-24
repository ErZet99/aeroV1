import { useTranslation } from 'react-i18next';
import type { OfferRevision } from '@/types/models';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface RevisionsPanelProps {
  revisions: OfferRevision[];
  userName: (userId: number) => string;
  onView: (revision: OfferRevision) => void;
  onPdf: (revision: OfferRevision) => void;
}

export function RevisionsPanel({ revisions, userName, onView, onPdf }: RevisionsPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{t('offer.revisions')}</h3>
      {revisions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('offer.noRevisions')}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('offer.rewizja')}</TableHead>
                <TableHead>{t('offer.data')}</TableHead>
                <TableHead>{t('offer.autor')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {revisions.map(rev => (
                <TableRow key={rev.id}>
                  <TableCell className="font-medium">{rev.revision}</TableCell>
                  <TableCell>{rev.createdAt.replace('T', ' ').slice(0, 16)}</TableCell>
                  <TableCell>{userName(rev.createdBy)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onView(rev)}>
                        {t('offer.viewRevision')}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onPdf(rev)}>
                        {t('offer.generatePdf')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled
                        title={t('common.underConstruction')}
                      >
                        {t('offer.createOrderFromRevision')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
