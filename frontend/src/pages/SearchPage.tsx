import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useSearch } from '../hooks/useSearch';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const [input, setInput] = useState(queryParam);
  const { data, isLoading } = useSearch(queryParam);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      setSearchParams({ q: input.trim() });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Search</h1>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search by title, content, or tags..."
            className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            autoFocus
          />
          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {queryParam && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            {isLoading
              ? 'Searching...'
              : `${data?.total ?? 0} results for "${queryParam}"`}
          </p>

          {data?.results.map((result) => (
            <Link
              key={result.id}
              to={`/notes/${result.id}`}
              className="block p-4 rounded-lg border border-gray-100 hover:border-emerald-200 hover:bg-gray-50 mb-2 transition-colors"
            >
              <h3 className="text-sm font-medium text-gray-800">{result.title}</h3>
              <p
                className="text-sm text-gray-500 mt-1 line-clamp-2"
                dangerouslySetInnerHTML={{ __html: result.snippet }}
              />
            </Link>
          ))}

          {!isLoading && data?.results.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-2">🔍</p>
              <p>No results found</p>
            </div>
          )}
        </div>
      )}

      {!queryParam && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">🔍</p>
          <p>Enter a search term to find notes</p>
        </div>
      )}
    </div>
  );
}
