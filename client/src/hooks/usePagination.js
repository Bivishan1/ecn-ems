import { useMemo, useState } from "react";

const usePagination = (items = [], itemsPerPage = 10) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalItems = items.length;
  const totalPages = Math.max(Math.ceil(totalItems / itemsPerPage), 1);

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    return items.slice(startIndex, endIndex);
  }, [items, safeCurrentPage, itemsPerPage]);

  const goToPage = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
  };

  const nextPage = () => {
    goToPage(safeCurrentPage + 1);
  };

  const previousPage = () => {
    goToPage(safeCurrentPage - 1);
  };

  return {
    currentPage: safeCurrentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    paginatedItems,
    goToPage,
    nextPage,
    previousPage,
  };
};

export default usePagination;