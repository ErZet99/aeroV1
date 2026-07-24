import { useTranslation } from 'react-i18next';
import { useTabsStore } from '@/stores/tabsStore';
import { resetDb } from '@/api/db';
import { DICT_KEYS } from '@/components/dictionary/dictionaryConfig';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { RoleSwitcher } from './RoleSwitcher';

export function Sidebar() {
  const { t } = useTranslation();
  const openTab = useTabsStore(s => s.openTab);

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r bg-muted/20">
      <div className="px-4 py-3">
        <span className="text-base font-bold">{t('app.title')}</span>
      </div>
      <Separator />

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        <Button
          variant="ghost"
          className="justify-start"
          onClick={() => openTab({ type: 'rfq-list', title: t('sidebar.rfqs') })}
        >
          {t('sidebar.rfqs')}
        </Button>
        <Button
          variant="ghost"
          className="justify-start"
          onClick={() => openTab({ type: 'offer-list', title: t('sidebar.offers') })}
        >
          {t('sidebar.offers')}
        </Button>
        <Button
          variant="ghost"
          className="justify-start"
          onClick={() => openTab({ type: 'template-list', title: t('sidebar.templates') })}
        >
          {t('sidebar.templates')}
        </Button>

        <div className="mt-3 px-3 text-xs font-semibold text-muted-foreground uppercase">
          {t('sidebar.dictionaries')}
        </div>
        {DICT_KEYS.map(dictKey => (
          <Button
            key={dictKey}
            variant="ghost"
            size="sm"
            className="justify-start pl-5 font-normal"
            onClick={() =>
              openTab({ type: 'dictionary', dictKey, title: t(`dict.${dictKey}`) })
            }
          >
            {t(`dict.${dictKey}`)}
          </Button>
        ))}
      </nav>

      <Separator />
      <div className="flex flex-col gap-3 p-3">
        <RoleSwitcher />
        <Button variant="outline" size="sm" onClick={() => resetDb(true)}>
          {t('sidebar.resetData')}
        </Button>
      </div>
    </aside>
  );
}
