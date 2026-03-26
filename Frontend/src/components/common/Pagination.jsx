import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  totalItems, 
  itemsPerPage 
}) => {
  if (totalPages <= 1) return null;

  const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
  const indexOfLastItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisiblePages - 1);
      
      if (end === totalPages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }
      
      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-center p-4 text-sm text-gray-500 gap-4 bg-white border-t border-gray-100">
      <span className="font-medium">
        Showing <span className="text-gray-900">{totalItems === 0 ? 0 : indexOfFirstItem + 1}</span> to <span className="text-gray-900">{indexOfLastItem}</span> of <span className="text-gray-900">{totalItems}</span> entries
      </span>

      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 border border-gray-200 rounded-lg text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
          aria-label="Previous Page"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map(page => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`min-w-[36px] h-9 flex items-center justify-center rounded-lg border text-sm font-bold transition-all ${
                currentPage === page
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'bg-white border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {page}
            </button>
          ))}
          {totalPages > 5 && getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
            <>
              <span className="px-1 text-gray-300">...</span>
              <button
                onClick={() => onPageChange(totalPages)}
                className="min-w-[36px] h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-bold text-gray-400 hover:border-indigo-300 hover:text-indigo-600 transition-all"
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 border border-gray-200 rounded-lg text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
          aria-label="Next Page"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
