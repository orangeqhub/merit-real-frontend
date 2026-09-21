import { ArrowDown, ArrowUp, ArrowUpDown, RefreshCw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import EmptyState from './EmptyState';
import SearchBox from './SearchBox';
import TablePagination from './TablePagination';
import { Skeleton } from './Skeleton';
import { useTableState } from '../../hooks/useTableState';

function SortIcon({ active, dir }) {
  if (!active) return <ArrowUpDown size={13} className="opacity-40" />;
  return dir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />;
}

/**
 * Reusable data table for Admin / Customer / Agent list screens.
 *
 * Client mode (default): pass full `rows` — search/sort/pagination are handled internally.
 * Server mode: set `serverSide` and control page/search via props.
 */
export default function DataTable({
  title,
  subtitle,
  columns = [],
  rows = [],
  loading = false,
  error = null,
  emptyTitleKey = 'empty.noData',
  emptyHintKey,
  showSerial = true,
  searchable = true,
  searchPlaceholderKey = 'placeholders.search',
  searchKeys = null,
  getSearchText = null,
  toolbar = null,
  filters = null,
  onRefresh = null,
  onClearFilters = null,
  rowKey = 'id',
  initialPageSize = 10,
  initialSortKey = null,
  initialSortDir = 'desc',
  // Server-side controls
  serverSide = false,
  page: controlledPage,
  pageSize: controlledPageSize,
  total: controlledTotal,
  totalPages: controlledTotalPages,
  onPageChange,
  onPageSizeChange,
  searchValue,
  onSearchChange,
  sortKey: controlledSortKey,
  sortDir: controlledSortDir,
  onSortChange,
}) {
  const { t } = useTranslation(['dashboard', 'common']);

  const client = useTableState(serverSide ? [] : rows, {
    initialPageSize,
    searchKeys,
    getSearchText,
    initialSortKey,
    initialSortDir,
  });

  const page = serverSide ? (controlledPage || 1) : client.page;
  const pageSize = serverSide ? (controlledPageSize || initialPageSize) : client.pageSize;
  const total = serverSide ? (controlledTotal ?? rows.length) : client.total;
  const totalPages = serverSide
    ? (controlledTotalPages || Math.max(1, Math.ceil((controlledTotal || 0) / pageSize)))
    : client.totalPages;
  const pageRows = serverSide ? rows : client.pageRows;
  const search = serverSide ? (searchValue || '') : client.search;
  const sortKey = serverSide ? controlledSortKey : client.sortKey;
  const sortDir = serverSide ? controlledSortDir : client.sortDir;

  function handleSearch(value) {
    if (serverSide) onSearchChange?.(value);
    else client.setSearch(value);
  }

  function handleSort(key) {
    if (!key) return;
    if (serverSide) {
      const nextDir = controlledSortKey === key && controlledSortDir === 'asc' ? 'desc' : 'asc';
      onSortChange?.(key, controlledSortKey === key ? nextDir : 'asc');
    } else {
      client.toggleSort(key);
    }
  }

  function handleClear() {
    if (serverSide) {
      onSearchChange?.('');
      onClearFilters?.();
    } else {
      client.clearFilters();
      onClearFilters?.();
    }
  }

  const hasActiveFilters = Boolean(search?.trim());

  return (
    <div>
      {(title || subtitle || searchable || toolbar || onRefresh) && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title && <h1 className="text-xl font-bold text-brand-800">{title}</h1>}
            {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {toolbar}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw size={14} />
                {t('buttons.refresh', { ns: 'common', defaultValue: 'Refresh' })}
              </button>
            )}
          </div>
        </div>
      )}

      {(searchable || filters) && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          {searchable && (
            <div className="w-full sm:max-w-xs">
              <SearchBox
                value={search}
                onChange={handleSearch}
                placeholderKey={searchPlaceholderKey}
              />
            </div>
          )}
          {filters}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              <X size={14} />
              {t('filters.clear', { defaultValue: 'Clear filters' })}
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2 rounded-xl border border-gray-200 p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      ) : total === 0 ? (
        <EmptyState titleKey={emptyTitleKey} hintKey={emptyHintKey} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  {showSerial && <th className="whitespace-nowrap px-3 py-2.5">S.No.</th>}
                  {columns.map((col) => {
                    const sortable = col.sortable !== false && Boolean(col.key);
                    return (
                      <th key={col.key || col.header} className={`whitespace-nowrap px-3 py-2.5 ${col.headerClassName || ''}`}>
                        {sortable ? (
                          <button
                            type="button"
                            onClick={() => handleSort(col.sortKey || col.key)}
                            className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-gray-800"
                          >
                            {col.header}
                            <SortIcon active={sortKey === (col.sortKey || col.key)} dir={sortDir} />
                          </button>
                        ) : (
                          col.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {pageRows.map((row, index) => {
                  const key = typeof rowKey === 'function' ? rowKey(row) : row?.[rowKey] ?? index;
                  const serial = (page - 1) * pageSize + index + 1;
                  return (
                    <tr key={key} className="hover:bg-gray-50/80">
                      {showSerial && (
                        <td className="px-3 py-2.5 text-xs text-gray-500">{serial}</td>
                      )}
                      {columns.map((col) => (
                        <td key={col.key || col.header} className={`px-3 py-2.5 ${col.className || ''}`}>
                          {col.render
                            ? col.render(row, { index, serial })
                            : (col.key ? row?.[col.key] : null) ?? '—'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            onPageChange={serverSide ? onPageChange : client.setPage}
            onPageSizeChange={serverSide ? onPageSizeChange : client.setPageSize}
          />
        </>
      )}
    </div>
  );
}

export function formatTableDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export function StatusPill({ status, labels = {}, className = '' }) {
  const key = String(status || '').toLowerCase();
  const tone =
    key.includes('pending') || key.includes('new')
      ? 'bg-amber-50 text-amber-800'
      : key.includes('reject') || key.includes('cancel') || key.includes('inactive')
        ? 'bg-red-50 text-red-700'
        : key.includes('approv') || key.includes('active') || key.includes('assign') || key.includes('complete')
          ? 'bg-green-50 text-green-800'
          : 'bg-gray-100 text-gray-700';

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${tone} ${className}`}>
      {labels[key] || labels[status] || status || '—'}
    </span>
  );
}
