// ============================================================================
// TOOTH SVG SHAPE COMPONENTS — must be in a .jsx file for Vite JSX parsing
// Crown faces DOWN for upper arch teeth, UP for lower arch teeth (scaleY flip).
// fillOpacity increased for darker appearance; strokeWidth increased for visibility.
// ============================================================================
import { getToothById } from './dentalUtils';

// ── INCISOR ── flat chisel-shaped crown, single root
export const IncisorSVG = ({ arch = 'Upper', color = 'currentColor', size = 28 }) => {
  const flip = arch === 'Lower';
  return (
    <svg width={size} height={size} viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={flip ? { transform: 'scaleY(-1)' } : {}}>
      <rect x="8" y="2" width="16" height="18" rx="3" fill={color} fillOpacity="0.55" stroke={color} strokeWidth="2.2" />
      <path d="M13 20 Q12 32 16 38 Q20 32 19 20Z" fill={color} fillOpacity="0.65" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
};

// ── LATERAL INCISOR ── slightly narrower than central incisor
export const LateralIncisorSVG = ({ arch = 'Upper', color = 'currentColor', size = 28 }) => {
  const flip = arch === 'Lower';
  return (
    <svg width={size} height={size} viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={flip ? { transform: 'scaleY(-1)' } : {}}>
      <rect x="10" y="2" width="12" height="16" rx="3" fill={color} fillOpacity="0.55" stroke={color} strokeWidth="2.2" />
      <path d="M13 18 Q12 31 16 38 Q20 31 19 18Z" fill={color} fillOpacity="0.65" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
};

// ── CANINE ── pointed crown, long single root
export const CanineSVG = ({ arch = 'Upper', color = 'currentColor', size = 28 }) => {
  const flip = arch === 'Lower';
  return (
    <svg width={size} height={size} viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={flip ? { transform: 'scaleY(-1)' } : {}}>
      {/* Crown with pointed cusp tip */}
      <path d="M9 20 L9 8 Q16 2 23 8 L23 20Z" fill={color} fillOpacity="0.55" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
      {/* Cusp tip accent */}
      <path d="M13 8 Q16 3 19 8" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* Long single root */}
      <path d="M13 20 Q12 34 16 39 Q20 34 19 20Z" fill={color} fillOpacity="0.65" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
};

// ── PREMOLAR ── bicuspid — two cusps, one or two roots
export const PremolarSVG = ({ arch = 'Upper', color = 'currentColor', size = 28 }) => {
  const flip = arch === 'Lower';
  return (
    <svg width={size} height={size} viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={flip ? { transform: 'scaleY(-1)' } : {}}>
      {/* Crown with two cusps */}
      <path d="M7 18 L7 10 Q11 3 16 5 Q21 3 25 10 L25 18Z" fill={color} fillOpacity="0.55" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
      {/* Central groove */}
      <line x1="16" y1="5" x2="16" y2="18" stroke={color} strokeWidth="1.4" strokeDasharray="2 1.5" />
      {/* Two roots */}
      <path d="M11 18 Q10 30 12 37" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M21 18 Q22 30 20 37" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
};

// ── MOLAR ── wide crown with 4 cusps, cross groove, three roots
export const MolarSVG = ({ arch = 'Upper', color = 'currentColor', size = 28 }) => {
  const flip = arch === 'Lower';
  return (
    <svg width={size} height={size} viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={flip ? { transform: 'scaleY(-1)' } : {}}>
      {/* Wide crown */}
      <path d="M4 18 L4 9 Q8 2 16 2 Q24 2 28 9 L28 18Z" fill={color} fillOpacity="0.55" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
      {/* Cross groove pattern */}
      <line x1="16" y1="2" x2="16" y2="18" stroke={color} strokeWidth="1.4" strokeDasharray="2 1.5" />
      <line x1="4" y1="10" x2="28" y2="10" stroke={color} strokeWidth="1.4" strokeDasharray="2 1.5" />
      {/* Three roots */}
      <path d="M9 18 Q8 30 9 37" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M16 18 Q16 30 16 37" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M23 18 Q24 30 23 37" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
};

// ── WISDOM (3rd Molar) ── compressed, irregular 5-cusp crown, fused roots
export const WisdomSVG = ({ arch = 'Upper', color = 'currentColor', size = 28 }) => {
  const flip = arch === 'Lower';
  return (
    <svg width={size} height={size} viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={flip ? { transform: 'scaleY(-1)' } : {}}>
      {/* Irregular crown */}
      <path d="M5 18 L5 10 Q9 3 16 3 Q23 3 27 10 L27 18Z" fill={color} fillOpacity="0.55" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
      {/* 5 cusp bumps */}
      <path d="M5 10 Q8 4 11 7 Q14 3 16 3 Q18 3 21 7 Q24 4 27 10" stroke={color} strokeWidth="1.6" fill="none" strokeLinejoin="round" />
      {/* Cross groove */}
      <line x1="16" y1="3" x2="16" y2="18" stroke={color} strokeWidth="1.2" strokeDasharray="2 1.5" />
      <line x1="5" y1="11" x2="27" y2="11" stroke={color} strokeWidth="1.2" strokeDasharray="2 1.5" />
      {/* Fused/irregular roots */}
      <path d="M10 18 Q9 28 10 35" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M16 18 L16 35" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M22 18 Q23 28 22 35" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
};

/**
 * Returns the correct SVG tooth icon for a given FDI tooth ID.
 * Arch (Upper/Lower) is auto-detected from the tooth definition.
 *
 * @param {string} toothId - FDI tooth ID e.g. '11', '36'
 * @param {string} color   - SVG stroke/fill color
 * @param {number} size    - icon size in px
 */
export const getToothSVG = (toothId, color = 'currentColor', size = 26) => {
  const tooth = getToothById(toothId);
  if (!tooth) return null;

  const props = { arch: tooth.arch, color, size };

  // 3rd molars (wisdom teeth)
  if (['18', '28', '38', '48'].includes(String(toothId))) {
    return <WisdomSVG {...props} />;
  }

  switch (tooth.type) {
    case 'incisor':
      // Central incisors: 11,21,31,41 — Lateral: 12,22,32,42
      if (['11', '21', '31', '41'].includes(String(toothId))) {
        return <IncisorSVG {...props} />;
      }
      return <LateralIncisorSVG {...props} />;
    case 'canine':
      return <CanineSVG {...props} />;
    case 'premolar':
      return <PremolarSVG {...props} />;
    case 'molar':
      return <MolarSVG {...props} />;
    default:
      return <MolarSVG {...props} />;
  }
};
