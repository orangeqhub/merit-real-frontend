import { useEffect, useMemo, useState } from 'react';
import { TABLE_PAGE_SIZE_OPTIONS } from '../components/common/TablePagination';

function getByPath(row, key) {
  if (!key || !row) return undefined;
  if (!String(key).includes('.')) return row[key];
  return String(key).split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), row);
}

function defaultSearchText(row, searchKeys) {
  if (!searchKeys?.length) {
    return Object.values(row || {})
      .filter((v) => v != null && typeof v !== 'object')
      .join(' ')
      .toLowerCase();
  }
  return searchKeys
    .map((key) => {
      const val = getByPath(row, key);
      if (val == null) return '';
      if (typeof val === 'object') return JSON.stringify(val);
      return String(val);
    })
    .join(' ')
    .toLowerCase();
}

function compareValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const da = Date.parse(a);
  const db = Date.parse(b);
  if (!Number.isNaN(da) && !Number.isNaN(db) && String(a).length > 8 && String(b).length > 8) {
    return da - db;
  }
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
}

/**
 * Client-side search + sort + pagination for list screens.
 */
export function useTableState(items = [], {
  initialPageSize = 10,
  searchKeys = null,
  getSearchText = null,
  initialSortKey = null,
  initialSortDir = 'desc',
} = {}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(initialSortKey);
  const [sortDir, setSortDir] = useState(initialSortDir);

  const filtered = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((row) => {
      const hay = getSearchText
        ? String(getSearchText(row) || '').toLowerCase()
        : defaultSearchText(row, searchKeys);
      return hay.includes(q);
    });
  }, [items, search, searchKeys, getSearchText]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const next = [...filtered];
    next.sort((a, b) => {
      const cmp = compareValues(getByPath(a, sortKey), getByPath(b, sortKey));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return next;
  }, [filtered, sortKey, sortDir]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [pageSize, search, sortKey, sortDir, Array.isArray(items) ? items.length : 0]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize]);

  function toggleSort(key) {
    if (!key) return;
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function clearFilters() {
    setSearch('');
    setSortKey(initialSortKey);
    setSortDir(initialSortDir);
    setPage(1);
  }

  function handlePageSizeChange(nextSize) {
    setPageSize(nextSize);
    setPage(1);
  }

  return {
    page: safePage,
    setPage,
    pageSize,
    setPageSize: handlePageSizeChange,
    total,
    totalPages,
    pageRows,
    filteredRows: sorted,
    search,
    setSearch,
    sortKey,
    sortDir,
    toggleSort,
    clearFilters,
    pageSizeOptions: TABLE_PAGE_SIZE_OPTIONS,
  };
}

/** Back-compat wrapper used by existing screens */
export function useClientPagination(items = [], initialPageSize = 10) {
  const state = useTableState(items, { initialPageSize });
  return {
    page: state.page,
    setPage: state.setPage,
    pageSize: state.pageSize,
    setPageSize: state.setPageSize,
    total: state.total,
    totalPages: state.totalPages,
    pageRows: state.pageRows,
    pageSizeOptions: state.pageSizeOptions,
  };
}
