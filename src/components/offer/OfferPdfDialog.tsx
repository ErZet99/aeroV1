import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { OfferRevision } from '@/types/models';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type PdfSource = { type: 'working' } | { type: 'revision'; revisionId: number };

interface OfferPdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revisions: OfferRevision[];
  /** Prefill when opened from a specific revision. */
  initialSource?: PdfSource;
  workingCopyNeedsRevision: boolean;
  onGenerate: (language: 'PL' | 'EN', source: PdfSource) => void;
}

export function OfferPdfDialog({
  open,
  onOpenChange,
  revisions,
  initialSource,
  workingCopyNeedsRevision,
  onGenerate,
}: OfferPdfDialogProps) {
  const { t } = useTranslation();
  const [language, setLanguage] = useState<'PL' | 'EN'>('PL');
  const [sourceKey, setSourceKey] = useState(() =>
    initialSource?.type === 'revision' ? `rev:${initialSource.revisionId}` : 'working'
  );

  const langItems = [
    { value: 'PL', label: t('offer.pdfLangPl') },
    { value: 'EN', label: t('offer.pdfLangEn') },
  ];

  const sourceItems = [
    { value: 'working', label: t('offer.pdfSourceWorking') },
    ...revisions.map(r => ({
      value: `rev:${r.id}`,
      label: `${t('offer.rewizja')} ${r.revision}`,
    })),
  ];

  function resolveSource(): PdfSource {
    if (sourceKey === 'working') return { type: 'working' };
    const id = Number(sourceKey.replace('rev:', ''));
    return { type: 'revision', revisionId: id };
  }

  function handleGenerate() {
    const source = resolveSource();
    if (source.type === 'working' && workingCopyNeedsRevision) {
      window.alert(t('offer.saveRevisionFirst'));
      return;
    }
    onGenerate(language, source);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next && initialSource) {
          setSourceKey(
            initialSource.type === 'revision' ? `rev:${initialSource.revisionId}` : 'working'
          );
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('offer.generatePdf')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">{t('offer.pdfLanguage')}</span>
            <Select
              items={langItems}
              value={language}
              onValueChange={(v) => setLanguage(v as 'PL' | 'EN')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {langItems.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">{t('offer.pdfSource')}</span>
            <Select items={sourceItems} value={sourceKey} onValueChange={(v) => setSourceKey(String(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sourceItems.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleGenerate}>{t('offer.printPdf')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
