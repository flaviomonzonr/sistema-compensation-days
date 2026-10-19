import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  filteredTotal?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100, 250],
  itemLabel = 'registros'
}) => {
  // If totalItems is 0, don't show pagination controls
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers with ellipses
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (safeCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (safeCurrentPage >= totalPages - 3) {
      return [
        1,
        '...',
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      ];
    }

    return [
      1,
      '...',
      safeCurrentPage - 1,
      safeCurrentPage,
      safeCurrentPage + 1,
      '...',
      totalPages
    ];
  };

  const pages = getPageNumbers();

  const handlePageClick = (page: number) => {
    if (page !== safeCurrentPage && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  return (
    <div className="pagination-container">
      {/* Left: Summary and Page Size Selector */}
      <div className="pagination-info-wrapper">
        <span className="pagination-range-text">
          Mostrando <strong className="pagination-highlight">{startItem}</strong> a{' '}
          <strong className="pagination-highlight">{endItem}</strong> de{' '}
          <strong className="pagination-highlight">{totalItems}</strong> {itemLabel}
        </span>

        {onPageSizeChange && (
          <div className="pagination-size-selector">
            <span className="pagination-size-label">Mostrar:</span>
            <select
              className="pagination-size-select"
              value={pageSize}
              onChange={(e) => {
                const newSize = parseInt(e.target.value, 10);
                onPageSizeChange(newSize);
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} por pág.
                </option>
              ))}
              {totalItems > 100 && (
                <option value={Math.max(1000, totalItems)}>
                  Todos ({totalItems})
                </option>
              )}
            </select>
          </div>
        )}
      </div>

      {/* Right: Navigation Controls */}
      <div className="pagination-controls">
        {/* First Page Button */}
        <button
          type="button"
          className="pagination-btn pagination-btn-nav"
          onClick={() => handlePageClick(1)}
          disabled={safeCurrentPage === 1}
          title="Primera página"
          aria-label="Primera página"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Previous Page Button */}
        <button
          type="button"
          className="pagination-btn pagination-btn-nav"
          onClick={() => handlePageClick(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          title="Página anterior"
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page Number Buttons */}
        <div className="pagination-pages-group">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
                  •••
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === safeCurrentPage;

            return (
              <button
                key={`page-${pageNum}`}
                type="button"
                className={`pagination-btn pagination-btn-page ${
                  isActive ? 'active' : ''
                }`}
                onClick={() => handlePageClick(pageNum)}
                aria-current={isActive ? 'page' : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Page Button */}
        <button
          type="button"
          className="pagination-btn pagination-btn-nav"
          onClick={() => handlePageClick(safeCurrentPage + 1)}
          disabled={safeCurrentPage === totalPages}
          title="Página siguiente"
          aria-label="Página siguiente"
        >
          <ChevronRight size={16} />
        </button>

        {/* Last Page Button */}
        <button
          type="button"
          className="pagination-btn pagination-btn-nav"
          onClick={() => handlePageClick(totalPages)}
          disabled={safeCurrentPage === totalPages}
          title="Última página"
          aria-label="Última página"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
};
