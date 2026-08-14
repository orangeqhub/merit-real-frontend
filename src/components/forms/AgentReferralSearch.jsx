import { useEffect, useId, useRef, useState } from 'react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { searchReferralAgents } from '../../services/agentReferralService';

function normalizeAgent(agent) {
  if (!agent) return null;
  return {
    id: agent.id || agent.agentId,
    name: agent.name || agent.agentName,
    memberId: agent.memberId || agent.agentReferralCode,
  };
}

export default function AgentReferralSearch({
  value = null,
  onChange,
  label = 'Referral Agent',
  optional = true,
  className = '',
}) {
  const listId = useId();
  const inputRef = useRef(null);
  const rootRef = useRef(null);

  const selected = normalizeAgent(value);
  const [changing, setChanging] = useState(!selected);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    if (selected && !changing) {
      setQuery('');
      setResults([]);
      setOpen(false);
    }
  }, [selected, changing]);

  useEffect(() => {
    if (!changing || debouncedQuery.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);

    searchReferralAgents(debouncedQuery, { limit: 8, signal: controller.signal })
      .then((rows) => {
        setResults(rows.map(normalizeAgent).filter((a) => a?.id));
        setHighlight(0);
        setOpen(true);
      })
      .catch((err) => {
        if (err?.name === 'AbortError' || controller.signal.aborted) return;
        setResults([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery, changing]);

  useEffect(() => {
    function onDocClick(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function pickAgent(agent) {
    const next = normalizeAgent(agent);
    onChange?.(next);
    setChanging(false);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  function clearSelection() {
    onChange?.(null);
    setChanging(true);
    setQuery('');
    setResults([]);
    setOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function onKeyDown(e) {
    if (!open || !results.length) {
      if (e.key === 'Escape') setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pickAgent(results[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showDropdown = changing && open && (loading || results.length > 0 || debouncedQuery.trim().length >= 2);

  return (
    <div ref={rootRef} className={`rounded-lg border border-dashed border-gray-300 p-4 ${className}`}>
      <p className="mb-3 text-sm font-medium text-gray-700">
        {label}
        {optional && <span className="font-normal text-gray-400"> (optional)</span>}
      </p>

      {selected && !changing ? (
        <div className="rounded-lg border border-brand-200 bg-brand-50/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Selected Referral Agent</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{selected.name}</p>
          <p className="text-xs text-gray-600">
            Agent Code: <span className="font-mono font-medium">{selected.memberId}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setChanging(true)}
              className="rounded-lg border border-brand-300 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
            >
              Change
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <label htmlFor={`${listId}-input`} className="sr-only">Search Agent by name or code</label>
          <input
            ref={inputRef}
            id={`${listId}-input`}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => query.trim().length >= 2 && setOpen(true)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            placeholder="Search Agent by name or code…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={`${listId}-listbox`}
            aria-autocomplete="list"
          />

          {showDropdown && (
            <ul
              id={`${listId}-listbox`}
              role="listbox"
              className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
            >
              {loading && (
                <li className="px-3 py-2 text-xs text-gray-500">Searching agents…</li>
              )}
              {!loading && results.length === 0 && debouncedQuery.trim().length >= 2 && (
                <li className="px-3 py-2 text-xs text-gray-500">No agents found</li>
              )}
              {!loading && results.map((agent, index) => (
                <li key={agent.id} role="option" aria-selected={index === highlight}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => pickAgent(agent)}
                    className={`flex w-full flex-col items-start px-3 py-2.5 text-left text-sm ${
                      index === highlight ? 'bg-brand-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium text-gray-900">{agent.name}</span>
                    <span className="text-xs text-gray-500">
                      Agent Code: <span className="font-mono">{agent.memberId}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-2 text-xs text-gray-500">
            Search by agent name or referral code. Leave empty if no agent referred you.
          </p>
        </div>
      )}
    </div>
  );
}
