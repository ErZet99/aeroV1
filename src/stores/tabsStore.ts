import { create } from 'zustand';

export type TabType =
  | 'rfq-list'
  | 'offer-list'
  | 'order-list'
  | 'template-list'
  | 'dictionary'
  | 'rfq'
  | 'bom'
  | 'offer'
  | 'order';

export interface Tab {
  id: string;
  type: TabType;
  entityId?: number;
  dictKey?: string;
  /** For 'bom' tabs: whose tree it is. Defaults to 'rfq' when absent. */
  ownerType?: 'rfq' | 'template' | 'order';
  title: string;
  dirty?: boolean;
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
  openTab: (tab: Omit<Tab, 'id'>) => void;
  closeTab: (id: string) => void;
  activateTab: (id: string) => void;
  setTabDirty: (id: string, dirty: boolean) => void;
}

function makeTabId(tab: Omit<Tab, 'id'>): string {
  return [tab.type, tab.entityId ?? '', tab.dictKey ?? '', tab.ownerType ?? ''].join(':');
}

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  openTab: (tab) => {
    const id = makeTabId(tab);
    const existing = get().tabs.find(t => t.id === id);
    if (existing) {
      set({ activeTabId: id });
      return;
    }
    set(state => ({
      tabs: [...state.tabs, { ...tab, id, dirty: false }],
      activeTabId: id,
    }));
  },

  closeTab: (id) => {
    set(state => {
      const idx = state.tabs.findIndex(t => t.id === id);
      const tabs = state.tabs.filter(t => t.id !== id);
      let activeTabId = state.activeTabId;
      if (activeTabId === id) {
        const prev = tabs[Math.max(0, idx - 1)];
        activeTabId = prev ? prev.id : null;
      }
      return { tabs, activeTabId };
    });
  },

  activateTab: (id) => set({ activeTabId: id }),

  setTabDirty: (id, dirty) =>
    set(state => {
      const tab = state.tabs.find(t => t.id === id);
      if (!tab || tab.dirty === dirty) return state;
      return {
        tabs: state.tabs.map(t => (t.id === id ? { ...t, dirty } : t)),
      };
    }),
}));
