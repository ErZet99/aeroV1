import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DocumentActionBarProps {
  title: ReactNode;
  dirty: boolean;
  saving: boolean;
  savedAt: string | null;
  onSave: () => void;
  /** Actions immediately left of Save (never displace Save from the far right). */
  secondaryActions?: ReactNode;
  className?: string;
}

/**
 * Sticky top chrome for document tabs (§1.2a): title + dirty • left, Save far right.
 */
export function DocumentActionBar({
  title,
  dirty,
  saving,
  savedAt,
  onSave,
  secondaryActions,
  className,
}: DocumentActionBarProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'sticky top-0 z-20 flex min-w-0 items-center gap-3 border-b bg-background/95 px-4 py-2.5 backdrop-blur',
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {dirty && (
          <span className="text-base leading-none text-foreground" aria-hidden>
            •
          </span>
        )}
        <div className="min-w-0 truncate text-lg font-semibold">{title}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {secondaryActions}
        <Button disabled={!dirty || saving} onClick={onSave}>
          {t('common.save')}
        </Button>
        {savedAt && (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {t('common.savedAt', { time: savedAt })}
          </span>
        )}
      </div>
    </div>
  );
}
