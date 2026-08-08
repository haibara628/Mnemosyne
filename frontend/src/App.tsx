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
        <div className="flex h-screen bg-white">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top bar with search */}
            <header className="flex items-center justify-end px-6 py-2 border-b border-gray-100 bg-white">
              <SearchBar />
            </header>

            {/* Main content */}
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/notes" element={<NotesListPage />} />
              <Route path="/notes/:id" element={<NotePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/graph" element={<GraphPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
