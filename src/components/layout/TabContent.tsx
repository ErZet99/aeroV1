import { useTranslation } from 'react-i18next';
import { useTabsStore, type Tab } from '@/stores/tabsStore';
import type { DictEntity } from '@/api/dictionaryService';
import { DictionaryManager } from '@/components/dictionary/DictionaryManager';
import { RfqGrid } from '@/components/rfq/RfqGrid';
import { RfqDetail } from '@/components/rfq/RfqDetail';
import { BomTree } from '@/components/bom/BomTree';
import { TemplateList } from '@/components/template/TemplateList';
import { OfferGrid } from '@/components/offer/OfferGrid';
import { OfferDetail } from '@/components/offer/OfferDetail';

function renderTabContentInner(tab: Tab, t: (key: string) => string) {
  switch (tab.type) {
    case 'dictionary':
      return <DictionaryManager dictKey={tab.dictKey as DictEntity} />;
    case 'rfq-list':
      return <RfqGrid />;
    case 'rfq':
      return <RfqDetail rfqId={tab.entityId!} />;
    case 'bom':
      return (
        <BomTree
          ownerType={tab.ownerType ?? 'rfq'}
          ownerId={tab.entityId!}
        />
      );
    case 'template-list':
      return <TemplateList />;
    case 'offer-list':
      return <OfferGrid />;
    case 'offer':
      return <OfferDetail offerId={tab.entityId!} />;
    default:
      return (
        <div className="p-8 text-muted-foreground">
          {tab.title} — {t('common.underConstruction')}
        </div>
      );
  }
}

export function TabContent() {
  const { t } = useTranslation();
  const tabs = useTabsStore(s => s.tabs);
  const activeTabId = useTabsStore(s => s.activeTabId);

  if (tabs.length === 0) {
    return (
      <div className="p-8 text-muted-foreground">{t('common.welcome')}</div>
    );
  }

  return (
    <div className="flex flex-col">
      {tabs.map(tab => (
        <div
          key={tab.id}
          hidden={tab.id !== activeTabId}
          className="flex-1 overflow-auto"
        >
          {renderTabContentInner(tab, t)}
        </div>
      ))}
    </div>
  );
}
