import { useTranslation } from 'react-i18next';
import { useTabsStore } from '@/stores/tabsStore';
import { cn } from '@/lib/utils';

export function TabBar() {
  const { t } = useTranslation();
  const tabs = useTabsStore(s => s.tabs);
  const activeTabId = useTabsStore(s => s.activeTabId);
  const activateTab = useTabsStore(s => s.activateTab);
  const closeTab = useTabsStore(s => s.closeTab);

  function handleClose(tabId: string, dirty: boolean | undefined) {
    if (dirty) {
      // Prototype: discard-or-stay (document Zapisz first for save).
      if (!window.confirm(t('common.discardUnsaved'))) return;
    }
    closeTab(tabId);
  }

  return (
    <div className="flex h-10 shrink-0 items-end gap-1 overflow-x-auto border-b bg-muted/30 px-2">
      {tabs.map(tab => (
        <div
          key={tab.id}
          role="tab"
          aria-selected={tab.id === activeTabId}
          className={cn(
            'flex cursor-pointer items-center gap-2 rounded-t-md border border-b-0 px-3 py-1.5 text-sm select-none',
            tab.id === activeTabId
              ? 'bg-background font-medium'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          )}
          onClick={() => activateTab(tab.id)}
        >
          <span className="whitespace-nowrap">
            {tab.dirty ? '• ' : ''}
            {tab.title}
          </span>
          <button
            type="button"
            aria-label={t('common.close')}
            className="rounded px-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              handleClose(tab.id, tab.dirty);
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
