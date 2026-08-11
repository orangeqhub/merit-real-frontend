import { useTranslation } from 'react-i18next';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react';

/** Standard page-size choices for all list screens */
export const TABLE_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/**
 * Shared pagination footer for every data table.
 * Shows: "Showing 1–10 of 256 records | Page 1 of 26"
 * Plus rows-per-page, First / Prev / Next / Last.
 */
export default function TablePagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = TABLE_PAGE_SIZE_OPTIONS,
}) {
  const { t } = useTranslation(['dashboard', 'common']);

  if (total == null) return null;

  const safeTotal = Number(total) || 0;
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Number(pageSize) || pageSizeOptions[0] || 10;
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  const from = safeTotal === 0 ? 0 : (safePage - 1) * safePageSize + 1;
  const to = Math.min(safePage * safePageSize, safeTotal);

  const btnClass =
    'inline-flex items-center justify-center rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-50';

  return (
    <div className="mt-4 flex flex-col gap-3 text-sm text-gray-600 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <p className="text-gray-600">
        {t('pagination.showingRecords', {
          ns: 'dashboard',
          defaultValue: 'Showing {{from}}–{{to}} of {{total}} records',
          from,
          to,
          total: safeTotal,
        })}
        <span className="mx-2 text-gray-300">|</span>
        {t('pagination.pageOf', {
          ns: 'dashboard',
          defaultValue: 'Page {{page}} of {{totalPages}}',
          page: safePage,
          totalPages: safeTotalPages,
        })}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="whitespace-nowrap text-gray-500">
            {t('pagination.rowsPerPage', { defaultValue: 'Rows per page' })}
          </span>
          <select
            value={safePageSize}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
            className="rounded-lg border border-gray-300 bg-warm-white px-2.5 py-1.5 text-sm font-medium text-gray-800"
            aria-label={t('pagination.rowsPerPage', { defaultValue: 'Rows per page' })}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => onPageChange?.(1)}
            className={btnClass}
            aria-label={t('pagination.first', { defaultValue: 'First page' })}
            title={t('pagination.first', { defaultValue: 'First' })}
          >
            <ChevronFirst size={16} />
          </button>
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => onPageChange?.(safePage - 1)}
            className={btnClass}
            aria-label={t('buttons.back', { ns: 'common', defaultValue: 'Previous' })}
          >
            <ChevronLeft size={16} />
            <span className="ml-0.5 hidden sm:inline">{t('buttons.back', { ns: 'common', defaultValue: 'Previous' })}</span>
          </button>
          <span className="min-w-[4.5rem] px-1 text-center font-medium text-gray-800">
            {safePage} / {safeTotalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= safeTotalPages}
            onClick={() => onPageChange?.(safePage + 1)}
            className={btnClass}
            aria-label={t('buttons.next', { ns: 'common', defaultValue: 'Next' })}
          >
            <span className="mr-0.5 hidden sm:inline">{t('buttons.next', { ns: 'common', defaultValue: 'Next' })}</span>
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            disabled={safePage >= safeTotalPages}
            onClick={() => onPageChange?.(safeTotalPages)}
            className={btnClass}
            aria-label={t('pagination.last', { defaultValue: 'Last page' })}
            title={t('pagination.last', { defaultValue: 'Last' })}
          >
            <ChevronLast size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
