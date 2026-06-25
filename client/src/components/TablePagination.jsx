const TablePagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}) => {
  if (totalItems <= itemsPerPage) {
    return null;
  }

  const startRecord = (currentPage - 1) * itemsPerPage + 1;
  const endRecord = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages = [];

    const startPage = Math.max(currentPage - 2, 1);
    const endPage = Math.min(currentPage + 2, totalPages);

    for (let page = startPage; page <= endPage; page += 1) {
      pages.push(page);
    }

    return pages;
  };

  return (
    <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <p className="text-sm text-slate-500">
        Showing {startRecord} to {endRecord} of {totalItems} records
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          First
        </button>

        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        {getPageNumbers().map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`px-3 py-1.5 rounded-lg border text-sm ${
              currentPage === page
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>

        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Last
        </button>
      </div>
    </div>
  );
};

export default TablePagination;