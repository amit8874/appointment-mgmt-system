import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, User, Eye, Edit2, Trash2,
  FileText, IndianRupee, CheckCircle2, Clock, Filter,
  ArrowUpDown, Layers, Search, X, Building, Grid, Plus, Sparkles
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  eachDayOfInterval,
  isToday
} from 'date-fns';

/**
 * Enhanced Expense Calendar & Month Group View.
 * 
 * Features:
 * 1. Calendar View (Full Month Grid) with expense totals and preview tags on dates.
 * 2. On Date Click: "Date goes upside" into a horizontal circular date strip (1 to 28/30/31).
 * 3. Search option on Date View: Search electricity, rent, vendor, or doctor name for that day.
 * 4. "Kisko kitna dia gya" recipient/vendor payout breakdown.
 * 5. Clean, simple, non-bold typography ("content bold nhi hoga simple hoga").
 */
const ExpenseMonthGroupView = ({
  expenses = [],
  loading = false,
  itemTitle = (item) => item.expenseName || item.equipmentName || item.productName || 'Item',
  itemSubtitle = (item) => item.category || item.brand || '',
  itemRecipient = (item) => item.vendor || item.supplier || 'Not Specified',
  itemDate = (item) => item.purchaseDate || item.sentDate || item.createdAt,
  itemAmount = (item) => Number(item.totalAmount || 0),
  itemStatus = (item) => item.paymentStatus || 'Paid',
  itemQuantity = (item) => item.quantityPurchased ?? item.quantity ?? 1,
  itemUnit = () => '',
  itemNotes = (item) => item.notes || '',
  itemInvoiceUrl = (item) => item.invoiceUrl || '',
  typeLabel = 'Expenses',
  onView,
  onEdit,
  onDelete
}) => {
  // Main view inside this component: 'calendar' (default) or 'group' (monthly accordion)
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' | 'group'

  // Calendar navigation state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Calendar sub-view: 'month' (full grid) or 'day' (date goes upside with day details)
  const [calendarSubView, setCalendarSubView] = useState('month'); // 'month' | 'day'

  // Search within day view (specifically requested: search electricity, rent, etc.)
  const [daySearchQuery, setDaySearchQuery] = useState('');

  // Active recipient filter in day view
  const [selectedDayRecipient, setSelectedDayRecipient] = useState(null);

  // Group view states
  const [selectedMonthKey, setSelectedMonthKey] = useState('all');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [expandedMonths, setExpandedMonths] = useState({});
  const [activeRecipientFilter, setActiveRecipientFilter] = useState({});

  // Ref for the horizontal date strip to scroll selected date into view
  const dateStripRef = useRef(null);

  // Auto-scroll selected date circle into view in the top date strip
  useEffect(() => {
    if (calendarSubView === 'day' && dateStripRef.current) {
      const activeEl = dateStripRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [selectedDate, calendarSubView]);

  // Calendar month navigation
  const prevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  // When a user clicks a date cell in Month Grid -> Date goes upside into Day View
  const handleDateClick = (day) => {
    setSelectedDate(day);
    setCurrentMonth(day);
    setCalendarSubView('day');
    setDaySearchQuery('');
    setSelectedDayRecipient(null);
  };

  // Days array for the circular date strip of current month
  const daysInCurrentMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(start);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Helper to parse date
  const parseItemDate = (item) => {
    const raw = itemDate(item);
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  // Group all expenses by 'YYYY-MM-DD' for fast calendar lookup
  const expensesByDayMap = useMemo(() => {
    const map = {};
    if (!expenses) return map;

    expenses.forEach((item) => {
      const d = parseItemDate(item);
      if (!d) return;
      const key = format(d, 'yyyy-MM-dd');
      if (!map[key]) {
        map[key] = {
          items: [],
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          recipientsMap: {}
        };
      }
      const entry = map[key];
      const amt = itemAmount(item);
      const status = itemStatus(item);
      const rec = (itemRecipient(item) || '').trim() || 'General';

      entry.items.push(item);
      entry.totalAmount += amt;
      if (status === 'Paid') {
        entry.paidAmount += amt;
      } else {
        entry.pendingAmount += amt;
      }

      if (!entry.recipientsMap[rec]) {
        entry.recipientsMap[rec] = { name: rec, total: 0, count: 0 };
      }
      entry.recipientsMap[rec].total += amt;
      entry.recipientsMap[rec].count += 1;
    });

    return map;
  }, [expenses]);

  // Month-wise group aggregation for the 'group' tab
  const monthGroups = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];

    const groupsMap = {};

    expenses.forEach((item) => {
      const validDate = parseItemDate(item) || new Date();
      const year = validDate.getFullYear();
      const monthNum = validDate.getMonth() + 1;
      const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
      const monthLabel = validDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!groupsMap[monthKey]) {
        groupsMap[monthKey] = {
          monthKey,
          monthLabel,
          year,
          monthNum,
          timestamp: new Date(year, monthNum - 1, 1).getTime(),
          items: [],
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          recipientsMap: {}
        };
      }

      const grp = groupsMap[monthKey];
      const amt = itemAmount(item);
      const status = itemStatus(item);
      const recipientName = (itemRecipient(item) || '').trim() || 'General / Not Specified';

      grp.items.push(item);
      grp.totalAmount += amt;
      if (status === 'Paid') {
        grp.paidAmount += amt;
      } else {
        grp.pendingAmount += amt;
      }

      if (!grp.recipientsMap[recipientName]) {
        grp.recipientsMap[recipientName] = { name: recipientName, total: 0, count: 0, paid: 0, pending: 0 };
      }
      grp.recipientsMap[recipientName].total += amt;
      grp.recipientsMap[recipientName].count += 1;
      if (status === 'Paid') {
        grp.recipientsMap[recipientName].paid += amt;
      } else {
        grp.recipientsMap[recipientName].pending += amt;
      }
    });

    const sortedGroups = Object.values(groupsMap).sort((a, b) => b.timestamp - a.timestamp);

    sortedGroups.forEach((grp) => {
      grp.items.sort((a, b) => {
        const da = new Date(itemDate(a) || 0).getTime();
        const db = new Date(itemDate(b) || 0).getTime();
        return db - da;
      });
      grp.recipients = Object.values(grp.recipientsMap).sort((a, b) => b.total - a.total);
    });

    return sortedGroups;
  }, [expenses]);

  // Set default expanded state for group view
  useEffect(() => {
    if (monthGroups.length > 0 && Object.keys(expandedMonths).length === 0) {
      const initial = {};
      monthGroups.forEach((g, idx) => { initial[g.monthKey] = idx === 0; });
      setExpandedMonths(initial);
    }
  }, [monthGroups]);

  // Total for the currently displayed calendar month
  const currentMonthTotals = useMemo(() => {
    const curYear = currentMonth.getFullYear();
    const curMonth = currentMonth.getMonth();
    let total = 0;
    let count = 0;
    let paid = 0;
    let pending = 0;

    expenses.forEach((item) => {
      const d = parseItemDate(item);
      if (d && d.getFullYear() === curYear && d.getMonth() === curMonth) {
        const amt = itemAmount(item);
        total += amt;
        count += 1;
        if (itemStatus(item) === 'Paid') paid += amt;
        else pending += amt;
      }
    });

    return { total, count, paid, pending };
  }, [expenses, currentMonth]);

  // Expenses for the currently selected date
  const selectedDayData = useMemo(() => {
    const key = format(selectedDate, 'yyyy-MM-dd');
    const data = expensesByDayMap[key] || {
      items: [],
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      recipientsMap: {}
    };

    const recipientsList = Object.values(data.recipientsMap).sort((a, b) => b.total - a.total);

    // Apply search filter on the day view (e.g. search electricity bill, rent, doctor name)
    let filteredItems = data.items;
    if (daySearchQuery.trim()) {
      const q = daySearchQuery.toLowerCase().trim();
      filteredItems = filteredItems.filter((item) => {
        const title = (itemTitle(item) || '').toLowerCase();
        const sub = (itemSubtitle(item) || '').toLowerCase();
        const rec = (itemRecipient(item) || '').toLowerCase();
        return title.includes(q) || sub.includes(q) || rec.includes(q);
      });
    }

    if (selectedDayRecipient) {
      filteredItems = filteredItems.filter((item) => {
        const rec = (itemRecipient(item) || '').trim() || 'General';
        return rec === selectedDayRecipient;
      });
    }

    return {
      allItems: data.items,
      filteredItems,
      totalAmount: data.totalAmount,
      paidAmount: data.paidAmount,
      pendingAmount: data.pendingAmount,
      recipients: recipientsList
    };
  }, [selectedDate, expensesByDayMap, daySearchQuery, selectedDayRecipient]);

  // Filtered group view list
  const visibleGroups = useMemo(() => {
    let list = monthGroups;
    if (selectedMonthKey !== 'all') {
      list = list.filter(g => g.monthKey === selectedMonthKey);
    }
    if (groupSearchQuery.trim()) {
      const q = groupSearchQuery.toLowerCase().trim();
      list = list.map(g => {
        const matchingItems = g.items.filter(item => {
          const rec = (itemRecipient(item) || '').toLowerCase();
          const title = (itemTitle(item) || '').toLowerCase();
          const sub = (itemSubtitle(item) || '').toLowerCase();
          return rec.includes(q) || title.includes(q) || sub.includes(q);
        });
        const matchingTotal = matchingItems.reduce((acc, curr) => acc + itemAmount(curr), 0);
        return {
          ...g,
          items: matchingItems,
          totalAmount: matchingTotal,
          recipients: g.recipients.filter(r => r.name.toLowerCase().includes(q))
        };
      }).filter(g => g.items.length > 0);
    }
    return list;
  }, [monthGroups, selectedMonthKey, groupSearchQuery]);

  // --- RENDER 1: FULL MONTH CALENDAR GRID ---
  const renderCalendarMonthGrid = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    }

    return (
      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 bg-slate-50/70 dark:bg-gray-900/40 border-b border-slate-200/80 dark:border-gray-700">
          {weekDays.map((d, i) => (
            <div key={i} className="py-2.5 text-center text-[11px] font-medium text-slate-500 dark:text-gray-400">
              {d}
            </div>
          ))}
        </div>

        {/* Date Cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-gray-700/60 border-b border-slate-100 dark:border-gray-700/60">
          {days.map((cellDate) => {
            const dateKey = format(cellDate, 'yyyy-MM-dd');
            const dayData = expensesByDayMap[dateKey];
            const isCurrentMonth = isSameMonth(cellDate, currentMonth);
            const isTodayCell = isToday(cellDate);
            const isSelectedCell = isSameDay(cellDate, selectedDate);
            const hasExpenses = dayData && dayData.items.length > 0;

            return (
              <div
                key={dateKey}
                onClick={() => handleDateClick(cellDate)}
                className={`min-h-[85px] sm:min-h-[115px] p-2 sm:p-2.5 transition-all cursor-pointer group flex flex-col justify-between ${
                  !isCurrentMonth ? 'bg-slate-50/40 dark:bg-gray-900/30 opacity-40' : 'bg-white dark:bg-gray-800'
                } ${
                  isSelectedCell
                    ? 'ring-2 ring-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
                    : 'hover:bg-slate-50/80 dark:hover:bg-gray-700/20'
                }`}
              >
                {/* Date header in cell */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-normal transition-all ${
                      isTodayCell
                        ? 'w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-medium shadow-xs'
                        : isCurrentMonth
                        ? 'text-slate-700 dark:text-gray-200'
                        : 'text-slate-400 dark:text-gray-500'
                    }`}
                  >
                    {format(cellDate, 'd')}
                  </span>

                  {hasExpenses && (
                    <span className="text-[10px] font-normal text-slate-400 dark:text-gray-400">
                      {dayData.items.length} {dayData.items.length === 1 ? 'entry' : 'entries'}
                    </span>
                  )}
                </div>

                {/* Day Expense Preview Pills */}
                {hasExpenses ? (
                  <div className="mt-1 space-y-1">
                    {/* Amount Badge */}
                    <div className="text-[11px] font-medium text-slate-800 dark:text-slate-100 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded-md truncate">
                      ₹{dayData.totalAmount.toLocaleString('en-IN')}
                    </div>

                    {/* Preview first 2 items */}
                    <div className="hidden sm:block space-y-0.5">
                      {dayData.items.slice(0, 2).map((item, idx) => (
                        <div
                          key={idx}
                          className="text-[10px] font-normal text-slate-500 dark:text-gray-400 truncate pl-0.5 flex items-center gap-1"
                          title={`${itemTitle(item)}: ₹${itemAmount(item)}`}
                        >
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-gray-600 flex-shrink-0" />
                          <span className="truncate">{itemTitle(item)}</span>
                        </div>
                      ))}
                      {dayData.items.length > 2 && (
                        <span className="text-[9px] text-slate-400 pl-1 block">
                          +{dayData.items.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-transparent select-none">-</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- RENDER 2: DAY DETAIL VIEW (DATE GOES UPSIDE INTO CIRCULAR STRIP + SEARCH OPTION) ---
  const renderCalendarDayView = () => {
    return (
      <div className="space-y-4">
        {/* Top Header: Full Month Grid button & Month Name */}
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-3 sm:p-3.5 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCalendarSubView('month')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-normal transition-all"
              title="Return to full month calendar grid"
            >
              <Grid size={14} className="text-slate-500" />
              <span>Full Month Grid</span>
            </button>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg text-slate-600 dark:text-gray-300 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 px-1">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg text-slate-600 dark:text-gray-300 transition-colors"
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <button
              type="button"
              onClick={goToToday}
              className="px-2.5 py-1 text-[11px] font-normal text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-lg transition-colors ml-1"
            >
              Today
            </button>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-normal text-slate-400 block">Month Total Outflow</span>
            <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100">
              ₹{currentMonthTotals.total.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* CIRCULAR DATE STRIP: 1 to 28/30/31 SIDE BY SIDE ("Date goes upside") */}
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-2 sm:p-2.5 rounded-2xl shadow-sm">
          <div
            ref={dateStripRef}
            className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-1"
          >
            {daysInCurrentMonth.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayData = expensesByDayMap[dateStr];
              const isCurrentSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              const hasEntries = dayData && dayData.items.length > 0;

              return (
                <button
                  key={dateStr}
                  type="button"
                  data-selected={isCurrentSelected}
                  onClick={() => {
                    setSelectedDate(day);
                    setDaySearchQuery('');
                    setSelectedDayRecipient(null);
                  }}
                  className={`flex flex-col items-center justify-center min-w-[42px] py-1 px-1.5 rounded-xl transition-all flex-shrink-0 cursor-pointer ${
                    isCurrentSelected
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/50 ring-2 ring-indigo-500 shadow-xs'
                      : 'hover:bg-slate-50 dark:hover:bg-gray-700/40'
                  }`}
                >
                  {/* Day of Week */}
                  <span
                    className={`text-[10px] font-normal ${
                      isCurrentSelected
                        ? 'text-indigo-600 dark:text-indigo-300 font-medium'
                        : isTodayDate
                        ? 'text-indigo-500'
                        : 'text-slate-400 dark:text-gray-400'
                    }`}
                  >
                    {format(day, 'EEE')}
                  </span>

                  {/* Circular Date Bubble */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-normal transition-all relative mt-0.5 ${
                      isCurrentSelected
                        ? 'bg-indigo-600 text-white shadow-xs font-medium'
                        : isTodayDate
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {format(day, 'd')}

                    {/* Indicator Dot if expenses exist on this date */}
                    {hasEntries && (
                      <span
                        className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-gray-800 ${
                          isCurrentSelected ? 'bg-amber-400' : 'bg-indigo-600'
                        }`}
                      />
                    )}
                  </div>

                  {/* Day Total Amount or Entry Count */}
                  {hasEntries ? (
                    <span
                      className={`text-[9px] font-normal mt-0.5 truncate max-w-[40px] text-center ${
                        isCurrentSelected ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400 dark:text-gray-400'
                      }`}
                    >
                      ₹{dayData.totalAmount >= 1000 ? `${Math.round(dayData.totalAmount / 1000)}k` : dayData.totalAmount}
                    </span>
                  ) : (
                    <span className="text-[9px] text-transparent mt-0.5 select-none">•</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* SELECTED DATE HEADER & SEARCH INPUT (Specific User Requirement: Search Electricity, Rent, etc.) */}
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-4 rounded-2xl shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-indigo-500" />
                <h3 className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-100">
                  {format(selectedDate, 'EEEE, MMMM do, yyyy')}
                </h3>
                <span className="text-[11px] font-normal text-slate-400 dark:text-gray-400 bg-slate-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {selectedDayData.allItems.length} {selectedDayData.allItems.length === 1 ? 'record' : 'records'}
                </span>
              </div>
              <p className="text-[11px] font-normal text-slate-400 dark:text-gray-400 mt-0.5">
                Total Outflow: ₹{selectedDayData.totalAmount.toLocaleString('en-IN')} (
                Settled: ₹{selectedDayData.paidAmount.toLocaleString('en-IN')}
                {selectedDayData.pendingAmount > 0 && ` • Due: ₹${selectedDayData.pendingAmount.toLocaleString('en-IN')}`}
                )
              </p>
            </div>

            {/* SEARCH INPUT ON DATE VIEW (Search electricity bill, rent, vendor, etc.) */}
            <div className="relative w-full md:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={daySearchQuery}
                onChange={(e) => setDaySearchQuery(e.target.value)}
                placeholder="Search Electricity, Rent, Vendor, Doctor..."
                className="w-full pl-9 pr-7 py-2 text-xs font-normal border border-slate-200 dark:border-gray-700 rounded-xl outline-none bg-slate-50/50 dark:bg-gray-900/50 text-slate-700 dark:text-gray-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20"
              />
              {daySearchQuery && (
                <button
                  type="button"
                  onClick={() => setDaySearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Recipient / Vendor Quick Pills for this day */}
          {selectedDayData.recipients.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-gray-700/60 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-normal text-slate-400 flex items-center gap-1">
                <User size={12} className="text-indigo-400" />
                Paid To:
              </span>
              <button
                type="button"
                onClick={() => setSelectedDayRecipient(null)}
                className={`text-[11px] px-2 py-0.5 rounded-lg border transition-all ${
                  !selectedDayRecipient
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                All ({selectedDayData.allItems.length})
              </button>
              {selectedDayData.recipients.map((rec) => {
                const isSelected = selectedDayRecipient === rec.name;
                return (
                  <button
                    key={rec.name}
                    type="button"
                    onClick={() => setSelectedDayRecipient(isSelected ? null : rec.name)}
                    className={`text-[11px] px-2 py-0.5 rounded-lg border transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{rec.name}</span>
                    <span className="text-[10px] text-slate-400">₹{rec.total.toLocaleString('en-IN')}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Date Expense Records (In Individual Boxes / Cards - Like Today's Appointments) */}
        <div className="space-y-2.5">
          {selectedDayData.filteredItems.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-slate-200 dark:border-gray-700 p-8 text-center flex flex-col items-center justify-center">
              <Clock size={24} className="text-slate-300 dark:text-gray-600 mb-2" />
              <h4 className="text-xs font-medium text-slate-700 dark:text-gray-300">
                {daySearchQuery ? `No expense matched "${daySearchQuery}"` : 'No expenses recorded for this date'}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {daySearchQuery ? 'Try searching with a different term' : `No clinic expense recorded on ${format(selectedDate, 'MMMM d, yyyy')}.`}
              </p>
            </div>
          ) : (
            selectedDayData.filteredItems.map((item) => {
              const title = itemTitle(item);
              const sub = itemSubtitle(item);
              const rec = itemRecipient(item) || '-';
              const amt = itemAmount(item);
              const qty = itemQuantity(item);
              const unit = itemUnit(item);
              const status = itemStatus(item);
              const invoiceUrl = itemInvoiceUrl(item);
              const notes = itemNotes(item);

              return (
                <div
                  key={item._id}
                  className="w-full bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-xs transition-all p-3 sm:p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
                >
                  {/* LEFT: Item Details (Avatar Icon, Expense Title, Category, Status, Recipient, Qty) */}
                  <div className="flex items-start sm:items-center gap-3 shrink-0 md:w-[45%] lg:w-[42%]">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-medium text-xs shrink-0 shadow-2xs">
                      <IndianRupee size={15} />
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Line 1: Title, Category pill, Status pill */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate">
                          {title}
                        </span>
                        {sub && (
                          <span className="text-[10px] font-normal text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-md">
                            {sub}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-normal ${
                          status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : status === 'Partially Paid'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                        }`}>
                          {status}
                        </span>
                      </div>

                      {/* Line 2: Recipient, Quantity, Payment Method, Invoice # */}
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-normal">
                          <User size={11} className="text-indigo-500" />
                          <span>Paid To: {rec}</span>
                        </span>
                        <span>•</span>
                        <span>Qty: {qty} {unit}</span>
                        {item.paymentMethod && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600 dark:text-gray-300">{item.paymentMethod}</span>
                          </>
                        )}
                        {item.invoiceNumber && (
                          <>
                            <span>•</span>
                            <span>Inv #{item.invoiceNumber}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* MIDDLE: Notes / Observation / Description (Side by side inside same box) */}
                  <div className="flex-1 min-w-0 md:border-l md:border-slate-200 dark:md:border-gray-700 md:pl-3.5 w-full">
                    {notes ? (
                      <div className="flex items-start gap-1.5 text-slate-700 dark:text-gray-300">
                        <FileText size={13} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] text-amber-800 dark:text-amber-300 font-medium block">
                            Note / Observation:
                          </span>
                          <span className="text-[11px] font-normal text-slate-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                            {notes}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 dark:text-gray-500 font-normal italic flex items-center gap-1.5">
                        <FileText size={12} className="opacity-40" />
                        <span>No notes recorded</span>
                      </div>
                    )}
                  </div>

                  {/* RIGHT: Amount & Action Buttons (View, Edit, Delete, Invoice) */}
                  <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto shrink-0 md:border-l md:border-slate-200 dark:md:border-gray-700 md:pl-3.5 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-gray-700/60">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] font-normal text-slate-400 block">Amount</span>
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap">
                        ₹{amt.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {invoiceUrl && (
                        <a
                          href={invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                          title="View Invoice"
                        >
                          <FileText size={14} />
                        </a>
                      )}
                      {onView && (
                        <button
                          type="button"
                          onClick={() => onView(item)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Edit Record"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(item._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // --- RENDER 3: MONTH-BY-MONTH GROUP ACCORDION (Summary View) ---
  const renderMonthGroupAccordion = () => {
    return (
      <div className="space-y-4">
        {/* Month Selector & Filter */}
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-3.5 rounded-2xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-thin">
            <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap flex items-center gap-1.5 pl-1">
              <Calendar size={13} className="text-indigo-500" />
              Filter Month:
            </span>
            <button
              type="button"
              onClick={() => setSelectedMonthKey('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedMonthKey === 'all'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-gray-700/50 dark:text-gray-300 border border-transparent'
              }`}
            >
              All Months ({monthGroups.length})
            </button>
            {monthGroups.map((g) => {
              const isSelected = selectedMonthKey === g.monthKey;
              return (
                <button
                  key={g.monthKey}
                  type="button"
                  onClick={() => setSelectedMonthKey(g.monthKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-gray-700/50 dark:text-gray-300 border border-transparent'
                  }`}
                >
                  <span>{g.monthLabel}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                    ₹{g.totalAmount.toLocaleString('en-IN')}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={groupSearchQuery}
                onChange={(e) => setGroupSearchQuery(e.target.value)}
                placeholder="Search vendor / doctor..."
                className="pl-8 pr-7 py-1 text-xs font-normal border border-slate-200 dark:border-gray-700 rounded-lg outline-none bg-slate-50/50 dark:bg-gray-900/50 text-slate-700 dark:text-gray-200 w-48 sm:w-56 focus:border-indigo-400"
              />
              {groupSearchQuery && (
                <button
                  onClick={() => setGroupSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Month Cards */}
        <div className="space-y-4">
          {visibleGroups.map((grp) => {
            const isExpanded = !!expandedMonths[grp.monthKey];
            const activeFilter = activeRecipientFilter[grp.monthKey];
            const displayedItems = activeFilter
              ? grp.items.filter(it => (itemRecipient(it) || '').trim() === activeFilter || (!itemRecipient(it) && activeFilter === 'General / Not Specified'))
              : grp.items;

            return (
              <div
                key={grp.monthKey}
                className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden"
              >
                <div
                  onClick={() => setExpandedMonths(prev => ({ ...prev, [grp.monthKey]: !prev[grp.monthKey] }))}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-gray-700/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-100">
                          {grp.monthLabel}
                        </h3>
                        <span className="text-[11px] font-normal text-slate-400 bg-slate-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                          {grp.items.length} {grp.items.length === 1 ? 'entry' : 'entries'}
                        </span>
                      </div>
                      <p className="text-[11px] font-normal text-slate-400 mt-0.5">
                        {grp.recipients.length} recipients/vendors paid this month
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4">
                    <div className="text-right">
                      <span className="text-[10px] font-normal text-slate-400 block uppercase tracking-wider">Total</span>
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        ₹{grp.totalAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="p-1 rounded-lg text-slate-400">
                      {isExpanded ? <ChevronLeft className="-rotate-90 transition-transform" size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 sm:p-5 pt-2 space-y-4 bg-slate-50/30 dark:bg-gray-900/20">
                    {/* Recipient Breakdown */}
                    <div className="bg-white dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700/80 rounded-xl p-4">
                      <h4 className="text-xs font-medium text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                        <User size={14} className="text-indigo-500" />
                        Kisko Kitna Diya Gya (Recipient Payout Breakdown)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                        {grp.recipients.map((rec) => (
                          <div
                            key={rec.name}
                            className="p-2.5 rounded-xl border border-slate-200/70 dark:border-gray-700 bg-slate-50/70 dark:bg-gray-700/30 flex flex-col justify-between"
                          >
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{rec.name}</span>
                            <div className="mt-2 flex items-baseline justify-between">
                              <span className="text-xs font-medium text-slate-800 dark:text-slate-100">₹{rec.total.toLocaleString('en-IN')}</span>
                              <span className="text-[10px] text-slate-400">{rec.count} {rec.count === 1 ? 'bill' : 'bills'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Monthly Transactions in Individual Box Cards (Side-by-side details) */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2 pt-1">
                        <FileText size={14} className="text-indigo-500" />
                        <span>Monthly Transactions ({displayedItems.length})</span>
                      </h4>
                      {displayedItems.map((item) => {
                        const title = itemTitle(item);
                        const sub = itemSubtitle(item);
                        const rec = itemRecipient(item) || '-';
                        const amt = itemAmount(item);
                        const qty = itemQuantity(item);
                        const unit = itemUnit(item);
                        const status = itemStatus(item);
                        const invoiceUrl = itemInvoiceUrl(item);
                        const notes = itemNotes(item);
                        const rawDate = itemDate(item);
                        const dateFormatted = rawDate ? format(new Date(rawDate), 'dd MMM yyyy') : '-';

                        return (
                          <div
                            key={item._id}
                            className="w-full bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-xs transition-all p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
                          >
                            {/* LEFT: Item Details */}
                            <div className="flex items-start sm:items-center gap-3 shrink-0 md:w-[45%] lg:w-[42%]">
                              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-medium text-xs shrink-0 shadow-2xs">
                                <IndianRupee size={15} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate">
                                    {title}
                                  </span>
                                  {sub && (
                                    <span className="text-[10px] font-normal text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-md">
                                      {sub}
                                    </span>
                                  )}
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-normal ${
                                    status === 'Paid'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                                  }`}>
                                    {status}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-gray-400 flex-wrap">
                                  <span className="text-slate-500 font-mono">{dateFormatted}</span>
                                  <span>•</span>
                                  <span>Paid To: {rec}</span>
                                  <span>•</span>
                                  <span>Qty: {qty} {unit}</span>
                                </div>
                              </div>
                            </div>

                            {/* MIDDLE: Notes */}
                            <div className="flex-1 min-w-0 md:border-l md:border-slate-200 dark:md:border-gray-700 md:pl-3.5 w-full">
                              {notes ? (
                                <div className="flex items-start gap-1.5 text-slate-700 dark:text-gray-300">
                                  <FileText size={13} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[10px] text-amber-800 dark:text-amber-300 font-medium block">Note:</span>
                                    <span className="text-[11px] font-normal text-slate-600 dark:text-gray-300 line-clamp-2">{notes}</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">No notes recorded</span>
                              )}
                            </div>

                            {/* RIGHT: Amount & Action Buttons */}
                            <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto shrink-0 md:border-l md:border-slate-200 dark:md:border-gray-700 md:pl-3.5 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-gray-700/60">
                              <div className="text-left md:text-right">
                                <span className="text-[10px] font-normal text-slate-400 block">Amount</span>
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                  ₹{amt.toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                {invoiceUrl && (
                                  <a href={invoiceUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-indigo-600 hover:text-indigo-800 rounded-lg" title="View Invoice">
                                    <FileText size={14} />
                                  </a>
                                )}
                                {onView && (
                                  <button type="button" onClick={() => onView(item)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg" title="View Details">
                                    <Eye size={14} />
                                  </button>
                                )}
                                {onEdit && (
                                  <button type="button" onClick={() => onEdit(item)} className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg" title="Edit Record">
                                    <Edit2 size={14} />
                                  </button>
                                )}
                                {onDelete && (
                                  <button type="button" onClick={() => onDelete(item._id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg" title="Delete Record">
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl p-8 text-center text-slate-400">
        <Clock className="w-8 h-8 mx-auto animate-spin text-indigo-500 mb-2" />
        <p className="text-xs font-normal">Loading expense calendar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Switcher Top Bar: Calendar View vs Monthly Summary View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 p-3 rounded-2xl shadow-sm">
        {/* Sub-Tabs: Calendar View vs Monthly Group Summary */}
        <div className="flex items-center bg-slate-100 dark:bg-gray-700/60 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setActiveTab('calendar');
              setCalendarSubView('month');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-normal transition-all ${
              activeTab === 'calendar'
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-medium'
                : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar size={13} />
            <span>Interactive Calendar</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('group')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-normal transition-all ${
              activeTab === 'group'
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-medium'
                : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers size={13} />
            <span>Month-by-Month Summary</span>
          </button>
        </div>

        {/* Current Month Navigation (Visible when in Calendar Grid Mode) */}
        {activeTab === 'calendar' && calendarSubView === 'month' && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-gray-700/50 border border-slate-200 dark:border-gray-700 px-2 py-1 rounded-xl">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 hover:bg-slate-200 dark:hover:bg-gray-600 rounded-lg text-slate-600 dark:text-gray-300 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-xs font-medium text-slate-800 dark:text-slate-100 px-2 min-w-[120px] text-center">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 hover:bg-slate-200 dark:hover:bg-gray-600 rounded-lg text-slate-600 dark:text-gray-300 transition-colors"
                title="Next Month"
              >
                <ChevronRight size={15} />
              </button>
            </div>
            <button
              type="button"
              onClick={goToToday}
              className="px-2.5 py-1.5 text-xs font-normal text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-xl transition-colors"
            >
              Today
            </button>
          </div>
        )}
      </div>

      {/* Main Body: Either Calendar (Grid or Day) OR Group Accordion */}
      {activeTab === 'calendar' ? (
        calendarSubView === 'month' ? (
          renderCalendarMonthGrid()
        ) : (
          renderCalendarDayView()
        )
      ) : (
        renderMonthGroupAccordion()
      )}
    </div>
  );
};

export default ExpenseMonthGroupView;
