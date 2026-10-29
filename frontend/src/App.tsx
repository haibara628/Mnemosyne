import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Sidebar from './components/layout/Sidebar';
import SearchBar from './components/layout/SearchBar';
import HomePage from './pages/HomePage';
import NotePage from './pages/NotePage';
import NotesListPage from './pages/NotesListPage';
import SearchPage from './pages/SearchPage';
import GraphPage from './pages/GraphPage';
import SettingsPage from './pages/SettingsPage';
import NewsPage from './pages/NewsPage';
import AssetsPage from './pages/AssetsPage';
import LineagePage from './pages/LineagePage';
import TasksPage from './pages/TasksPage';
import AIPanelPage from './pages/AIPanelPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="flex h-screen bg-background text-foreground">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            {/* 顶部搜索栏 */}
            <header className="flex items-center justify-end px-6 py-2 border-b bg-background">
              <SearchBar />
            </header>

            {/* 主内容 */}
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/notes" element={<NotesListPage />} />
              <Route path="/notes/:id" element={<NotePage />} />
              <Route path="/assets" element={<AssetsPage />} />
              <Route path="/lineage" element={<LineagePage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/ai" element={<AIPanelPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/graph" element={<GraphPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
