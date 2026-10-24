// ============================================================================
// REALISTIC DENTAL ODONTOGRAM COMPONENT
// Anatomically accurate adult 32-tooth dental chart matching clinical EHR
// Top Quadrant/Arch toggles | Upper arch teeth (roots UP) | Surface circles |
// FDI checkboxes | Lower arch teeth (crown UP, roots DOWN)
// ============================================================================
import React from 'react';
import { RealisticToothSVG, ToothSurfaceCircle } from './ToothIcons';
import { getToothDisplayName } from './dentalUtils';

// Standard 16-tooth sequences
const UPPER_RIGHT = ['18', '17', '16', '15', '14', '13', '12', '11'];
const UPPER_LEFT  = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_RIGHT = ['48', '47', '46', '45', '44', '43', '42', '41'];
const LOWER_LEFT  = ['31', '32', '33', '34', '35', '36', '37', '38'];

const UPPER_TEETH = [...UPPER_RIGHT, ...UPPER_LEFT];
const LOWER_TEETH = [...LOWER_RIGHT, ...LOWER_LEFT];
const ALL_TEETH = [...UPPER_TEETH, ...LOWER_TEETH];

export const RealisticDentalOdontogram = ({
  selectedTeeth = [],
  onToothClick,
  onBatchSelect,
  chartData = {},
  theme = 'light', // 'light' or 'dark'
  readOnly = false
}) => {
  // Normalize selected IDs into a set of strings
  const selectedSet = new Set(
    selectedTeeth.map(t => (typeof t === 'object' && t !== null ? String(t.toothId || t.id || '') : String(t)))
  );

  const isSelected = (id) => selectedSet.has(String(id));

  // Batch toggle helpers
  const handleToggleGroup = (groupTeeth) => {
    if (readOnly || !onBatchSelect) return;
    const allSelected = groupTeeth.every(id => selectedSet.has(id));
    if (allSelected) {
      // Deselect all in group
      onBatchSelect(Array.from(selectedSet).filter(id => !groupTeeth.includes(id)));
    } else {
      // Select all in group
      const newSet = new Set([...selectedSet, ...groupTeeth]);
      onBatchSelect(Array.from(newSet));
    }
  };

  const isGroupFullySelected = (groupTeeth) => groupTeeth.length > 0 && groupTeeth.every(id => selectedSet.has(id));

  // Theme styling tokens
  const isDark = theme === 'dark';
  const textClass = isDark ? 'text-slate-200' : 'text-slate-700';
  const subTextClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const borderClass = isDark ? 'border-slate-800' : 'border-slate-200';
  const bgCardClass = isDark ? 'bg-[#0E131F]/90' : 'bg-white';
  const checkboxBorder = isDark ? 'border-slate-600' : 'border-slate-400';

  // Status badges for treatments (DentalChart)
  const getStatusBadge = (toothId) => {
    const list = chartData[toothId] || [];
    if (!list || list.length === 0) return null;
    const hasInProgress = list.some(t => t.status === 'In Progress');
    if (hasInProgress) return <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" title="In Progress" />;
    const hasPlanned = list.some(t => t.status === 'Planned');
    if (hasPlanned) return <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-500 ring-2 ring-white" title="Planned" />;
    const hasCompleted = list.some(t => t.status === 'Completed');
    if (hasCompleted) return <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" title="Completed" />;
    return null;
  };

  return (
    <div className={`w-full ${bgCardClass} p-3 sm:p-5 rounded-2xl border ${borderClass} select-none transition-colors`}>
      {/* ── Top Bar: Quadrant & Arch Quick Selectors ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 pb-4 mb-4 border-b border-dashed border-slate-700/40 text-xs font-bold">
        {[
          { label: '1st Quadrant', teeth: UPPER_RIGHT },
          { label: '2nd Quadrant', teeth: UPPER_LEFT },
          { label: '3rd Quadrant', teeth: LOWER_LEFT },
          { label: '4th Quadrant', teeth: LOWER_RIGHT },
          { label: 'Upper Arch', teeth: UPPER_TEETH },
          { label: 'Lower Arch', teeth: LOWER_TEETH },
          { label: 'Full Mouth', teeth: ALL_TEETH },
        ].map((item) => {
          const checked = isGroupFullySelected(item.teeth);
          return (
            <label
              key={item.label}
              className={`inline-flex items-center gap-2 cursor-pointer transition-all py-1 px-1.5 rounded-lg hover:bg-slate-500/10 ${
                checked ? 'text-teal-400 font-black' : textClass
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => handleToggleGroup(item.teeth)}
                disabled={readOnly}
                className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
              <span className="text-[11px] sm:text-xs select-none">{item.label}</span>
            </label>
          );
        })}
      </div>

      {/* ── Odontogram Grid (Responsive Container with horizontal scroll on small devices) ── */}
      <div className="overflow-x-auto pb-2 custom-scrollbar">
        <div className="min-w-[760px] sm:min-w-[860px] space-y-4">

          {/* ══════════════════════════════════════════════════ */}
          {/* UPPER ARCH (Maxillary): 18-11 | 21-28             */}
          {/* ══════════════════════════════════════════════════ */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 px-2 mb-2 tracking-wider">
              <span>Upper Right (18 - 11)</span>
              <span className="text-teal-500 dark:text-teal-400">Maxillary Arch</span>
              <span>Upper Left (21 - 28)</span>
            </div>

            {/* Row 1: Upper Tooth Illustrations (Roots UP, Crown DOWN) */}
            <div className="grid grid-cols-[repeat(8,minmax(0,1fr))_12px_repeat(8,minmax(0,1fr))] items-end gap-1.5">
              {UPPER_RIGHT.map((toothId) => {
                const sel = isSelected(toothId);
                return (
                  <div
                    key={`upper_img_${toothId}`}
                    onClick={() => onToothClick && onToothClick(toothId)}
                    className={`relative flex flex-col items-center justify-end h-20 sm:h-24 p-0.5 rounded-xl transition-all cursor-pointer group ${
                      sel
                        ? 'bg-teal-500/15 ring-2 ring-teal-500 scale-105 z-10 shadow-lg shadow-teal-500/10'
                        : 'hover:bg-slate-500/10 hover:scale-105'
                    }`}
                    title={`${getToothDisplayName(toothId)} — Click to select`}
                  >
                    {getStatusBadge(toothId)}
                    <div className="w-full h-full max-w-[42px] flex items-center justify-center">
                      <RealisticToothSVG toothId={toothId} isSelected={sel} />
                    </div>
                  </div>
                );
              })}

              {/* Midline Divider */}
              <div className="w-[2px] h-16 bg-slate-300 dark:bg-slate-700 mx-auto self-center rounded-full" />

              {UPPER_LEFT.map((toothId) => {
                const sel = isSelected(toothId);
                return (
                  <div
                    key={`upper_img_${toothId}`}
                    onClick={() => onToothClick && onToothClick(toothId)}
                    className={`relative flex flex-col items-center justify-end h-20 sm:h-24 p-0.5 rounded-xl transition-all cursor-pointer group ${
                      sel
                        ? 'bg-teal-500/15 ring-2 ring-teal-500 scale-105 z-10 shadow-lg shadow-teal-500/10'
                        : 'hover:bg-slate-500/10 hover:scale-105'
                    }`}
                    title={`${getToothDisplayName(toothId)} — Click to select`}
                  >
                    {getStatusBadge(toothId)}
                    <div className="w-full h-full max-w-[42px] flex items-center justify-center">
                      <RealisticToothSVG toothId={toothId} isSelected={sel} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Row 2: Upper Surface Circles */}
            <div className="grid grid-cols-[repeat(8,minmax(0,1fr))_12px_repeat(8,minmax(0,1fr))] items-center gap-1.5 my-2">
              {UPPER_RIGHT.map((toothId) => (
                <div key={`upper_circ_${toothId}`} className="flex justify-center">
                  <div onClick={() => onToothClick && onToothClick(toothId)}>
                    <ToothSurfaceCircle toothId={toothId} size={28} />
                  </div>
                </div>
              ))}
              <div className="w-[2px] h-6 bg-slate-300 dark:bg-slate-700 mx-auto self-center rounded-full" />
              {UPPER_LEFT.map((toothId) => (
                <div key={`upper_circ_${toothId}`} className="flex justify-center">
                  <div onClick={() => onToothClick && onToothClick(toothId)}>
                    <ToothSurfaceCircle toothId={toothId} size={28} />
                  </div>
                </div>
              ))}
            </div>

            {/* Row 3: Upper Checkboxes with FDI Numbers */}
            <div className="grid grid-cols-[repeat(8,minmax(0,1fr))_12px_repeat(8,minmax(0,1fr))] items-center gap-1.5">
              {UPPER_RIGHT.map((toothId) => {
                const sel = isSelected(toothId);
                return (
                  <button
                    key={`upper_chk_${toothId}`}
                    type="button"
                    onClick={() => onToothClick && onToothClick(toothId)}
                    className={`flex items-center justify-center gap-1.5 py-1 px-1 rounded-lg transition-all cursor-pointer ${
                      sel ? 'bg-teal-500/20 text-teal-400 font-black' : `${subTextClass} hover:bg-slate-500/10`
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => {}} // handled by button
                      className="w-3.5 h-3.5 rounded text-teal-600 pointer-events-none"
                    />
                    <span className="text-[11px] font-bold">{toothId}</span>
                  </button>
                );
              })}

              <div className="w-[2px] h-6 bg-slate-300 dark:bg-slate-700 mx-auto self-center rounded-full" />

              {UPPER_LEFT.map((toothId) => {
                const sel = isSelected(toothId);
                return (
                  <button
                    key={`upper_chk_${toothId}`}
                    type="button"
                    onClick={() => onToothClick && onToothClick(toothId)}
                    className={`flex items-center justify-center gap-1.5 py-1 px-1 rounded-lg transition-all cursor-pointer ${
                      sel ? 'bg-teal-500/20 text-teal-400 font-black' : `${subTextClass} hover:bg-slate-500/10`
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => {}} // handled by button
                      className="w-3.5 h-3.5 rounded text-teal-600 pointer-events-none"
                    />
                    <span className="text-[11px] font-bold">{toothId}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-700/30 my-4" />

          {/* ══════════════════════════════════════════════════ */}
          {/* LOWER ARCH (Mandibular): 48-41 | 31-38             */}
          {/* ══════════════════════════════════════════════════ */}
          <div>
            {/* Row 4: Lower Checkboxes with FDI Numbers */}
            <div className="grid grid-cols-[repeat(8,minmax(0,1fr))_12px_repeat(8,minmax(0,1fr))] items-center gap-1.5 mb-2">
              {LOWER_RIGHT.map((toothId) => {
                const sel = isSelected(toothId);
                return (
                  <button
                    key={`lower_chk_${toothId}`}
                    type="button"
                    onClick={() => onToothClick && onToothClick(toothId)}
                    className={`flex items-center justify-center gap-1.5 py-1 px-1 rounded-lg transition-all cursor-pointer ${
                      sel ? 'bg-teal-500/20 text-teal-400 font-black' : `${subTextClass} hover:bg-slate-500/10`
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => {}}
                      className="w-3.5 h-3.5 rounded text-teal-600 pointer-events-none"
                    />
                    <span className="text-[11px] font-bold">{toothId}</span>
                  </button>
                );
              })}

              <div className="w-[2px] h-6 bg-slate-300 dark:bg-slate-700 mx-auto self-center rounded-full" />

              {LOWER_LEFT.map((toothId) => {
                const sel = isSelected(toothId);
                return (
                  <button
                    key={`lower_chk_${toothId}`}
                    type="button"
                    onClick={() => onToothClick && onToothClick(toothId)}
                    className={`flex items-center justify-center gap-1.5 py-1 px-1 rounded-lg transition-all cursor-pointer ${
                      sel ? 'bg-teal-500/20 text-teal-400 font-black' : `${subTextClass} hover:bg-slate-500/10`
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => {}}
                      className="w-3.5 h-3.5 rounded text-teal-600 pointer-events-none"
                    />
                    <span className="text-[11px] font-bold">{toothId}</span>
                  </button>
                );
              })}
            </div>

            {/* Row 5: Lower Surface Circles */}
            <div className="grid grid-cols-[repeat(8,minmax(0,1fr))_12px_repeat(8,minmax(0,1fr))] items-center gap-1.5 my-2">
              {LOWER_RIGHT.map((toothId) => (
                <div key={`lower_circ_${toothId}`} className="flex justify-center">
                  <div onClick={() => onToothClick && onToothClick(toothId)}>
                    <ToothSurfaceCircle toothId={toothId} size={28} />
                  </div>
                </div>
              ))}
              <div className="w-[2px] h-6 bg-slate-300 dark:bg-slate-700 mx-auto self-center rounded-full" />
              {LOWER_LEFT.map((toothId) => (
                <div key={`lower_circ_${toothId}`} className="flex justify-center">
                  <div onClick={() => onToothClick && onToothClick(toothId)}>
                    <ToothSurfaceCircle toothId={toothId} size={28} />
                  </div>
                </div>
              ))}
            </div>

            {/* Row 6: Lower Tooth Illustrations (Crown UP, Roots DOWN) */}
            <div className="grid grid-cols-[repeat(8,minmax(0,1fr))_12px_repeat(8,minmax(0,1fr))] items-start gap-1.5 mt-2">
              {LOWER_RIGHT.map((toothId) => {
                const sel = isSelected(toothId);
                return (
                  <div
                    key={`lower_img_${toothId}`}
                    onClick={() => onToothClick && onToothClick(toothId)}
                    className={`relative flex flex-col items-center justify-start h-20 sm:h-24 p-0.5 rounded-xl transition-all cursor-pointer group ${
                      sel
                        ? 'bg-teal-500/15 ring-2 ring-teal-500 scale-105 z-10 shadow-lg shadow-teal-500/10'
                        : 'hover:bg-slate-500/10 hover:scale-105'
                    }`}
                    title={`${getToothDisplayName(toothId)} — Click to select`}
                  >
                    {getStatusBadge(toothId)}
                    <div className="w-full h-full max-w-[42px] flex items-center justify-center">
                      <RealisticToothSVG toothId={toothId} isSelected={sel} />
                    </div>
                  </div>
                );
              })}

              <div className="w-[2px] h-16 bg-slate-300 dark:bg-slate-700 mx-auto self-center rounded-full" />

              {LOWER_LEFT.map((toothId) => {
                const sel = isSelected(toothId);
                return (
                  <div
                    key={`lower_img_${toothId}`}
                    onClick={() => onToothClick && onToothClick(toothId)}
                    className={`relative flex flex-col items-center justify-start h-20 sm:h-24 p-0.5 rounded-xl transition-all cursor-pointer group ${
                      sel
                        ? 'bg-teal-500/15 ring-2 ring-teal-500 scale-105 z-10 shadow-lg shadow-teal-500/10'
                        : 'hover:bg-slate-500/10 hover:scale-105'
                    }`}
                    title={`${getToothDisplayName(toothId)} — Click to select`}
                  >
                    {getStatusBadge(toothId)}
                    <div className="w-full h-full max-w-[42px] flex items-center justify-center">
                      <RealisticToothSVG toothId={toothId} isSelected={sel} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 px-2 mt-2 tracking-wider">
              <span>Lower Right (48 - 41)</span>
              <span className="text-teal-500 dark:text-teal-400">Mandibular Arch</span>
              <span>Lower Left (31 - 38)</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RealisticDentalOdontogram;
