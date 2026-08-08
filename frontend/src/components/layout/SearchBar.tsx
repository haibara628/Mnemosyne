import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSuggest } from '../../hooks/useSearch';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { data: suggestions } = useSuggest(query);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => query && setShowSuggestions(true)}
          placeholder="Search notes... (Ctrl+K)"
          className="w-64 px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 outline-none focus:bg-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200 transition-all"
        />
      </form>

      {showSuggestions && suggestions && suggestions.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {suggestions.map((item) => (
            <button
              key={item.id}
              className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 transition-colors"
              onClick={() => {
                navigate(`/notes/${item.id}`);
                setQuery('');
                setShowSuggestions(false);
              }}
            >
              {item.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
