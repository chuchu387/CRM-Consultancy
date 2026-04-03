import { useCallback, useEffect, useMemo, useState } from "react";

const usePagination = (items, options = {}) => {
  const { initialRowsPerPage = 10 } = options;
  const safeItems = Array.isArray(items) ? items : [];
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPageState] = useState(initialRowsPerPage);

  const totalItems = safeItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return safeItems.slice(startIndex, startIndex + rowsPerPage);
  }, [currentPage, rowsPerPage, safeItems]);

  const setRowsPerPage = useCallback((value) => {
    const parsedValue = Number(value);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      return;
    }

    setRowsPerPageState(parsedValue);
    setCurrentPage(1);
  }, []);

  const resetPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    currentPage,
    endItem: totalItems ? Math.min(currentPage * rowsPerPage, totalItems) : 0,
    paginatedItems,
    resetPage,
    rowsPerPage,
    setCurrentPage,
    setRowsPerPage,
    startItem: totalItems ? (currentPage - 1) * rowsPerPage + 1 : 0,
    totalItems,
    totalPages,
  };
};

export default usePagination;
