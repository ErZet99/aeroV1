import { Sidebar } from '@/components/layout/Sidebar';
import { TabBar } from '@/components/layout/TabBar';
import { TabContent } from '@/components/layout/TabContent';

function App() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <TabBar />
        <div className="flex-1 overflow-auto">
          <TabContent />
        </div>
      </main>
    </div>
  );
}

export default App;
