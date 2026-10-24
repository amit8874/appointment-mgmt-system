// ============================================================================
// REALISTIC ANATOMICAL DENTAL TOOTH SVGS & 5-SURFACE ODONTOGRAM CHARTS
// Anatomically accurate dental illustrations matching professional clinical EHR
// Upper Arch: Roots point UP, Enamel crown at BOTTOM
// Lower Arch: Enamel crown at TOP, Roots point DOWN (bifurcated molars)
// Warm ivory enamel, golden dentin roots, crisp organic contours
// ============================================================================
import React from 'react';
import { getToothById } from './dentalUtils';

// ── Shared SVG Gradients & Definitions ──
export const ToothDefs = ({ prefix = 't' }) => (
  <defs>
    <linearGradient id={`${prefix}_rootGrad`} x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#fae392" />
      <stop offset="35%" stopColor="#e3ab39" />
      <stop offset="70%" stopColor="#d69b27" />
      <stop offset="100%" stopColor="#bf8214" />
    </linearGradient>
    <linearGradient id={`${prefix}_rootGradV`} x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#fae392" />
      <stop offset="35%" stopColor="#e3ab39" />
      <stop offset="70%" stopColor="#d69b27" />
      <stop offset="100%" stopColor="#bf8214" />
    </linearGradient>
    <linearGradient id={`${prefix}_crownGrad`} x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="30%" stopColor="#fdfcf5" />
      <stop offset="75%" stopColor="#f7f1dd" />
      <stop offset="100%" stopColor="#eae0be" />
    </linearGradient>
    <linearGradient id={`${prefix}_crownGradInv`} x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stopColor="#ffffff" />
      <stop offset="30%" stopColor="#fdfcf5" />
      <stop offset="75%" stopColor="#f7f1dd" />
      <stop offset="100%" stopColor="#eae0be" />
    </linearGradient>
    <filter id={`${prefix}_glow`} x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#06b6d4" floodOpacity="0.75" />
    </filter>
  </defs>
);

const STROKE = "#261e14";
const STROKE_W = "1.5";
const GROOVE_STROKE = "#3d2f1d";
const GROOVE_W = "1.1";

// ── TOOTH SVG PATH BUILDER ──
export const RealisticToothSVG = ({
  toothId,
  isSelected = false,
  status = null,
  className = '',
  style = {}
}) => {
  const tooth = getToothById(toothId);
  const idStr = String(toothId);
  const prefix = `tooth_${idStr}`;

  // Determine mirror state across vertical midline
  const isUpperLeft = ['21', '22', '23', '24', '25', '26', '27', '28'].includes(idStr);
  const isLowerLeft = ['31', '32', '33', '34', '35', '36', '37', '38'].includes(idStr);
  const mirror = isUpperLeft || isLowerLeft;

  // Map to base anatomical shape
  let baseId = idStr;
  if (baseId === '21') baseId = '11';
  else if (baseId === '22') baseId = '12';
  else if (baseId === '23') baseId = '13';
  else if (baseId === '24') baseId = '14';
  else if (baseId === '25') baseId = '15';
  else if (baseId === '26') baseId = '16';
  else if (baseId === '27') baseId = '17';
  else if (baseId === '28') baseId = '18';
  else if (baseId === '31') baseId = '41';
  else if (baseId === '32') baseId = '42';
  else if (baseId === '33') baseId = '43';
  else if (baseId === '34') baseId = '44';
  else if (baseId === '35') baseId = '45';
  else if (baseId === '36') baseId = '46';
  else if (baseId === '37') baseId = '47';
  else if (baseId === '38') baseId = '48';

  // Primary teeth fallback to corresponding adult shape
  if (['51', '61'].includes(baseId)) baseId = '11';
  else if (['52', '62'].includes(baseId)) baseId = '12';
  else if (['53', '63'].includes(baseId)) baseId = '13';
  else if (['54', '55', '64', '65'].includes(baseId)) baseId = '16';
  else if (['71', '81'].includes(baseId)) baseId = '41';
  else if (['72', '82'].includes(baseId)) baseId = '42';
  else if (['73', '83'].includes(baseId)) baseId = '43';
  else if (['74', '75', '84', '85'].includes(baseId)) baseId = '46';

  let toothElements = null;

  switch (baseId) {
    // ── 11: UPPER CENTRAL INCISOR (Broad shovel crown, straight conical root) ──
    case '11':
      toothElements = (
        <>
          <path
            d="M 11 52 C 12 36, 14 18, 19.5 5 C 20.5 4, 21.5 4, 22.5 5 C 26 18, 28 36, 29 52 Z"
            fill={`url(#${prefix}_rootGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path
            d="M 21 14 C 21 24, 20.5 35, 20 45"
            stroke={GROOVE_STROKE}
            strokeWidth={GROOVE_W}
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />
          <path
            d="M 11 52 C 9 63, 8 75, 8.5 82 C 9 84, 11 84.5, 14 84.5 L 27 84.5 C 30 84.5, 31.5 84, 31.5 82 C 31.5 75, 30.5 63, 29 52 C 24 50, 16 50, 11 52 Z"
            fill={`url(#${prefix}_crownGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 11 52 C 16 49, 24 49, 29 52" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} fill="none" />
          <path d="M 15 84.5 L 15 75" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" opacity="0.5" />
          <path d="M 24 84.5 L 24 75" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" opacity="0.5" />
        </>
      );
      break;

    // ── 12: UPPER LATERAL INCISOR (Narrower, rounded distal incisal angle) ──
    case '12':
      toothElements = (
        <>
          <path
            d="M 12 53 C 14 38, 16 20, 21.5 5.5 C 22.5 4.5, 24 5, 24 7 C 24.5 20, 26 38, 27 53 Z"
            fill={`url(#${prefix}_rootGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 21 16 L 20 45" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" fill="none" opacity="0.5" />
          <path
            d="M 12 53 C 10 63, 10 74, 10.5 81 C 11 83, 13 83.5, 16 83.5 L 24 83.5 C 27.5 83.5, 28.5 82, 28.5 78 C 28.5 72, 28 62, 27 53 C 23 51, 16 51, 12 53 Z"
            fill={`url(#${prefix}_crownGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 12 53 C 16 50, 23 50, 27 53" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} fill="none" />
          <path d="M 16 83.5 L 16 76" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" opacity="0.5" />
        </>
      );
      break;

    // ── 13: UPPER CANINE (Sharp pointed cusp pointing down, long sturdy root) ──
    case '13':
      toothElements = (
        <>
          <path
            d="M 12 52 C 13.5 35, 15.5 16, 20 3.5 C 21 2.5, 22 2.5, 23 3.5 C 26.5 16, 27.5 35, 28 52 Z"
            fill={`url(#${prefix}_rootGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 20.5 10 L 20.5 46" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" fill="none" opacity="0.6" />
          <path
            d="M 12 52 C 9 63, 10 73, 20.5 86 C 29.5 74, 30.5 63, 28 52 C 24 50, 16 50, 12 52 Z"
            fill={`url(#${prefix}_crownGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 12 52 C 16 49, 24 49, 28 52" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} fill="none" />
          <path d="M 20.5 86 C 20.5 78, 20.5 65, 20.5 56" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" opacity="0.6" />
        </>
      );
      break;

    // ── 14: UPPER 1st PREMOLAR (Bifurcated root tip at apex, bicuspid crown) ──
    case '14':
      toothElements = (
        <>
          <path
            d="M 11.5 52 C 12.5 36, 12.5 22, 14.5 6 C 15.5 5, 16.5 6, 17 8 C 18 16, 19 22, 20.5 22 C 22 22, 23 16, 24 9 C 24.5 6, 25.5 5, 26.5 6 C 28 22, 28 36, 28.5 52 Z"
            fill={`url(#${prefix}_rootGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 20.5 22 L 20.5 46" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" fill="none" opacity="0.7" />
          <path
            d="M 11.5 52 C 8.5 62, 9.5 73, 15 82 C 17.5 82, 19 79, 20.5 79 C 22 79, 23.5 80.5, 25.5 80.5 C 29.5 74, 30.5 62, 28.5 52 C 24 50, 16 50, 11.5 52 Z"
            fill={`url(#${prefix}_crownGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 11.5 52 C 16 50, 24 50, 28.5 52" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} fill="none" />
          <path d="M 20.5 79 L 20.5 60" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" opacity="0.6" />
        </>
      );
      break;

    // ── 15: UPPER 2nd PREMOLAR (Single tapering root, rounded bicuspid) ──
    case '15':
      toothElements = (
        <>
          <path
            d="M 12 52 C 13.5 36, 15.5 18, 19.5 5.5 C 20.5 4.5, 21.5 4.5, 22.5 5.5 C 25.5 18, 27 36, 28 52 Z"
            fill={`url(#${prefix}_rootGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 20.5 14 L 20.5 46" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" fill="none" opacity="0.5" />
          <path
            d="M 12 52 C 8.5 62, 10 73, 15.5 81 C 18 81, 19 78.5, 20.5 78.5 C 22 78.5, 23.5 80, 25.5 80 C 29.5 74, 30.5 62, 28 52 C 24 50, 16 50, 12 52 Z"
            fill={`url(#${prefix}_crownGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 12 52 C 16 50, 24 50, 28 52" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} fill="none" />
          <path d="M 20.5 78.5 L 20.5 62" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" opacity="0.5" />
        </>
      );
      break;

    // ── 16: UPPER 1st MOLAR (3 spread roots, large 4-cusp crown) ──
    case '16':
      toothElements = (
        <>
          {/* Palatal Root (central) */}
          <path
            d="M 16 30 C 17 18, 18.5 8, 20 3 C 21 3, 22 4, 23 9 C 24 18, 24.5 30, 25 32 Z"
            fill={`url(#${prefix}_rootGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          {/* Buccal roots (mesiobuccal & distobuccal) */}
          <path
            d="M 8 50 C 8.5 38, 7.5 22, 8.5 7 C 9 5.5, 10.5 5.5, 11.5 7 C 13.5 18, 14.5 28, 16 32 C 17.5 28, 22.5 28, 24 32 C 25.5 26, 27.5 18, 30.5 8.5 C 31.5 7.5, 33 8, 33 9.5 C 32.5 24, 32 38, 32 50 Z"
            fill={`url(#${prefix}_rootGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 20 32 L 20 46" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" fill="none" opacity="0.7" />
          {/* Crown */}
          <path
            d="M 8 50 C 5.5 60, 5.5 72, 10.5 82 C 13.5 82.5, 15 80, 18 82.5 C 22.5 82.5, 24 79.5, 27.5 82 C 32 82, 34.5 74, 34.5 68 C 34.5 59, 34 50, 32 50 C 24 48, 15 48, 8 50 Z"
            fill={`url(#${prefix}_crownGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 8 50 C 16 48, 24 48, 32 50" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} fill="none" />
          <path d="M 18 82.5 L 18.5 62" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" opacity="0.6" />
        </>
      );
      break;

    // ── 17: UPPER 2nd MOLAR (3 roots, less divergent) ──
    case '17':
      toothElements = (
        <>
          <path
            d="M 17 28 C 18 16, 19 8, 20.5 4 C 21.5 4, 22 5, 23 10 C 23.5 18, 24 28, 24.5 30 Z"
            fill={`url(#${prefix}_rootGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path
            d="M 9 50 C 9.5 38, 9 24, 10.5 8.5 C 11.5 7, 12.5 7.5, 13 9 C 14.5 18, 15.5 26, 17 30 C 18.5 26, 22.5 26, 24 30 C 25.5 24, 27 18, 29.5 10 C 30.5 9, 31.5 9.5, 31.5 11 C 31 24, 31 38, 31 50 Z"
            fill={`url(#${prefix}_rootGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 20.5 30 L 20.5 46" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" fill="none" opacity="0.7" />
          <path
            d="M 9 50 C 6.5 60, 6.5 72, 11 81.5 C 14 82, 15.5 79.5, 18.5 82 C 22.5 82, 24 79.5, 27 81.5 C 31 81.5, 33 74, 33 68 C 33 59, 32.5 50, 31 50 C 24 48, 16 48, 9 50 Z"
            fill={`url(#${prefix}_crownGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 9 50 C 16 48, 24 48, 31 50" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} fill="none" />
          <path d="M 18.5 82 L 18.5 64" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" opacity="0.6" />
        </>
      );
      break;

    // ── 18: UPPER 3rd MOLAR (Wisdom - compact roots) ──
    case '18':
      toothElements = (
        <>
          <path
            d="M 10 50 C 10.5 38, 11 26, 12.5 12 C 13.5 10.5, 14.5 11, 15 13 C 16 20, 17 26, 18.5 28 C 19.5 20, 20.5 11, 21.5 7 C 22.5 7, 23 8, 23.5 12 C 24.5 20, 25 26, 26 28 C 27 22, 28 17, 29 14 C 29.5 13, 30.5 13.5, 30.5 15 C 30 26, 30 38, 30 50 Z"
            fill={`url(#${prefix}_rootGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path
            d="M 10 50 C 7.5 60, 7.5 71, 12 80 C 15 80.5, 16.5 78.5, 19.5 80.5 C 23 80.5, 24.5 78.5, 27 80 C 31 79.5, 32 73, 32 67 C 32 59, 31.5 50, 30 50 C 24 48, 16 48, 10 50 Z"
            fill={`url(#${prefix}_crownGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 10 50 C 16 48, 24 48, 30 50" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} fill="none" />
          <path d="M 19.5 80.5 L 19.5 64" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" opacity="0.6" />
        </>
      );
      break;

    // ── 41: LOWER CENTRAL INCISOR (Crown UP, thin slender root DOWN) ──
    case '41':
      toothElements = (
        <>
          <path
            d="M 14 36 C 14 26, 13.5 16, 13.5 8 C 13.5 6.5, 15 6, 17 6 L 23 6 C 25 6, 26.5 6.5, 26.5 8 C 26.5 16, 26 26, 26 36 C 22 38, 18 38, 14 36 Z"
            fill={`url(#${prefix}_crownGradInv)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 14 36 C 18 38, 22 38, 26 36" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} fill="none" />
          <path
            d="M 14 36 C 14 50, 16.5 68, 19.5 84.5 C 20 85.5, 21 85.5, 21.5 84.5 C 23.5 68, 26 50, 26 36 Z"
            fill={`url(#${prefix}_rootGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 20.5 44 L 20.5 74" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" fill="none" opacity="0.5" />
        </>
      );
      break;

    // ── 42: LOWER LATERAL INCISOR ──
    case '42':
      toothElements = (
        <>
          <path
            d="M 13 36 C 13 26, 12.5 16, 12.5 8 C 12.5 6.5, 14 6, 16.5 6 L 23.5 6 C 26 6, 27.5 6.5, 27.5 8.5 C 27.5 16, 27 26, 27 36 C 22 38, 18 38, 13 36 Z"
            fill={`url(#${prefix}_crownGradInv)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 13 36 C 18 38, 22 38, 27 36" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} fill="none" />
          <path
            d="M 13 36 C 13.5 50, 16 68, 20.5 85 C 21 86, 22 86, 22.5 84.5 C 24 68, 27 50, 27 36 Z"
            fill={`url(#${prefix}_rootGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 20.5 44 L 21 74" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" fill="none" opacity="0.5" />
        </>
      );
      break;

    // ── 43: LOWER CANINE (Sharp cusp pointing UP at top, long root DOWN) ──
    case '43':
      toothElements = (
        <>
          <path
            d="M 13 36 C 10.5 25, 11 16, 20 4 C 29 16, 29.5 25, 27 36 C 23 38, 17 38, 13 36 Z"
            fill={`url(#${prefix}_crownGradInv)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 13 36 C 17 38, 23 38, 27 36" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} fill="none" />
          <path d="M 20 4 L 20 30" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" opacity="0.6" />
          <path
            d="M 13 36 C 14 52, 16.5 70, 19.5 86 C 20 87, 21 87, 21.5 86 C 23.5 70, 26 52, 27 36 Z"
            fill={`url(#${prefix}_rootGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 20.5 44 L 20.5 76" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" opacity="0.6" />
        </>
      );
      break;

    // ── 44: LOWER 1st PREMOLAR ──
    case '44':
      toothElements = (
        <>
          <path
            d="M 12 36 C 9.5 26, 10.5 15, 16.5 7 C 18.5 6, 20.5 8, 22.5 9.5 C 26.5 16, 27.5 26, 27.5 36 C 23 38, 16 38, 12 36 Z"
            fill={`url(#${prefix}_crownGradInv)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 12 36 C 17 38, 23 38, 27.5 36" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} fill="none" />
          <path d="M 19.5 8 L 19.5 28" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" opacity="0.5" />
          <path
            d="M 12 36 C 13 52, 15.5 70, 19.5 85 C 20 86, 21 86, 21.5 85 C 24.5 70, 26.5 52, 27.5 36 Z"
            fill={`url(#${prefix}_rootGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 20.5 44 L 20.5 74" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" fill="none" opacity="0.5" />
        </>
      );
      break;

    // ── 45: LOWER 2nd PREMOLAR ──
    case '45':
      toothElements = (
        <>
          <path
            d="M 12 36 C 9.5 26, 10.5 15, 16 8 C 18 8, 19 10, 20.5 10 C 22 10, 23.5 8.5, 25.5 9 C 29.5 16, 29.5 26, 27.5 36 C 23 38, 16 38, 12 36 Z"
            fill={`url(#${prefix}_crownGradInv)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 12 36 C 17 38, 23 38, 27.5 36" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} fill="none" />
          <path d="M 20.5 10 L 20.5 28" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" opacity="0.5" />
          <path
            d="M 12 36 C 13.5 52, 15.5 70, 19.5 85 C 20 86, 21 86, 21.5 85 C 24.5 70, 26.5 52, 27.5 36 Z"
            fill={`url(#${prefix}_rootGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 20.5 44 L 20.5 74" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" fill="none" opacity="0.5" />
        </>
      );
      break;

    // ── 46: LOWER 1st MOLAR (Wide 5-cusp crown, 2 distinct roots with OPEN bifurcation gap) ──
    case '46':
      toothElements = (
        <>
          <path
            d="M 7.5 36 C 5.5 26, 5.5 15, 10.5 7.5 C 13.5 7, 15 9.5, 18.5 7 C 22 7, 24 9.5, 27 7.5 C 31 7.5, 34 14, 34 22 C 34 29, 33 36, 31.5 36 C 24 38, 15 38, 7.5 36 Z"
            fill={`url(#${prefix}_crownGradInv)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 7.5 36 C 15 38, 24 38, 31.5 36" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} fill="none" />
          <path d="M 18.5 7.5 L 18.5 26" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" opacity="0.6" />
          {/* TWO DISTINCT ROOTS WITH WIDE OPEN BIFURCATION POINTING DOWN */}
          <path
            d="M 7.5 36 C 8 50, 9 68, 11 85 C 11.5 86.5, 13 86.5, 14 84.5 C 16.5 70, 17.5 56, 19.5 47 C 21.5 56, 22.5 70, 27.5 83 C 28.5 84.5, 30 84.5, 30.5 83 C 31.5 68, 31.5 50, 31.5 36 Z"
            fill={`url(#${prefix}_rootGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 19.5 38 L 19.5 47" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" fill="none" opacity="0.7" />
          <path d="M 12.5 54 L 12.5 74" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" fill="none" opacity="0.5" />
          <path d="M 27 54 L 27 74" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" fill="none" opacity="0.5" />
        </>
      );
      break;

    // ── 47: LOWER 2nd MOLAR (4-cusp crown, 2 distinct roots) ──
    case '47':
      toothElements = (
        <>
          <path
            d="M 8.5 36 C 6.5 26, 6.5 15, 11 8 C 14 7.5, 15.5 10, 19 7.5 C 22.5 7.5, 24 10, 27 8 C 31 8, 33 15, 33 24 C 33 30, 32 36, 30.5 36 C 23 38, 16 38, 8.5 36 Z"
            fill={`url(#${prefix}_crownGradInv)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 8.5 36 C 16 38, 23 38, 30.5 36" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} fill="none" />
          <path d="M 19 8 L 19 26" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" opacity="0.6" />
          <path
            d="M 8.5 36 C 9 50, 10 68, 12 84 C 12.5 85.5, 14 85.5, 14.5 83.5 C 16.5 70, 17.5 58, 19.5 50 C 21.5 58, 22.5 70, 26.5 82 C 27.5 83.5, 28.5 83.5, 29 82 C 30 68, 30.5 50, 30.5 36 Z"
            fill={`url(#${prefix}_rootGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 19.5 38 L 19.5 50" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" fill="none" opacity="0.7" />
        </>
      );
      break;

    // ── 48: LOWER 3rd MOLAR (Wisdom - 2 curved roots) ──
    case '48':
    default:
      toothElements = (
        <>
          <path
            d="M 9.5 36 C 7.5 26, 7.5 16, 12 8.5 C 15 8, 16.5 10, 19.5 8 C 23 8, 24.5 10, 27 8.5 C 31 8.5, 32 16, 32 24 C 32 30, 31 36, 29.5 36 C 23 38, 16 38, 9.5 36 Z"
            fill={`url(#${prefix}_crownGradInv)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
          <path d="M 9.5 36 C 16 38, 23 38, 29.5 36" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} fill="none" />
          <path d="M 19.5 8.5 L 19.5 26" stroke={GROOVE_STROKE} strokeWidth={GROOVE_W} strokeLinecap="round" opacity="0.6" />
          <path
            d="M 9.5 36 C 10 48, 11 64, 13.5 80 C 14 81.5, 15 81.5, 15.5 80 C 17 68, 18 58, 19.5 52 C 21 58, 22 68, 25.5 79 C 26 80.5, 27 80.5, 27.5 79 C 28.5 64, 29 48, 29.5 36 Z"
            fill={`url(#${prefix}_rootGrad)`}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            strokeLinejoin="round"
          />
        </>
      );
      break;
  }

  return (
    <svg
      viewBox="0 0 40 90"
      className={`w-full h-full select-none ${className}`}
      style={{
        display: 'block',
        overflow: 'visible',
        filter: isSelected ? 'drop-shadow(0 0 6px rgba(14, 165, 233, 0.8))' : undefined,
        ...style
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <ToothDefs prefix={prefix} />
      <g transform={mirror ? 'translate(40, 0) scale(-1, 1)' : undefined}>
        {toothElements}
      </g>
    </svg>
  );
};

// ── 5-SURFACE CIRCULAR ODONTOGRAM CHART ──
// Renders the 5 anatomical surfaces per tooth matching the screenshot
export const ToothSurfaceCircle = ({
  toothId,
  selectedSurfaces = [],
  onSurfaceClick = null,
  size = 28,
  className = ''
}) => {
  const tooth = getToothById(toothId);
  const isAnterior = tooth?.type === 'incisor' || tooth?.type === 'canine';

  // Standard surfaces: Buccal (top), Lingual (bottom), Mesial (left/right based on quadrant), Distal, Occlusal/Incisal (center)
  const isSelected = (surface) => selectedSurfaces.includes(surface);

  const getSurfaceFill = (surface) => {
    if (isSelected(surface)) return '#06b6d4'; // Cyan active highlight
    return '#ffffff';
  };

  const handleSegmentClick = (e, surface) => {
    e.stopPropagation();
    if (onSurfaceClick) onSurfaceClick(toothId, surface);
  };

  const STROKE_COLOR = "#64748b";
  const STROKE_WIDTH = "1.2";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={`select-none cursor-pointer hover:opacity-90 transition-transform ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {isAnterior ? (
        // Anterior teeth (Incisal horizontal band across center)
        <g>
          {/* Outer circle boundary */}
          <circle cx="16" cy="16" r="14" fill="#ffffff" stroke={STROKE_COLOR} strokeWidth={STROKE_WIDTH} />
          {/* Top segment (Labial) */}
          <path
            d="M 6.1 12 A 14 14 0 0 1 25.9 12 L 23 12 L 9 12 Z"
            fill={getSurfaceFill('buccal')}
            stroke={STROKE_COLOR}
            strokeWidth={STROKE_WIDTH}
            onClick={(e) => handleSegmentClick(e, 'buccal')}
          />
          {/* Bottom segment (Lingual) */}
          <path
            d="M 6.1 20 A 14 14 0 0 0 25.9 20 L 23 20 L 9 20 Z"
            fill={getSurfaceFill('lingual')}
            stroke={STROKE_COLOR}
            strokeWidth={STROKE_WIDTH}
            onClick={(e) => handleSegmentClick(e, 'lingual')}
          />
          {/* Left segment (Mesial/Distal) */}
          <path
            d="M 6.1 12 A 14 14 0 0 0 6.1 20 L 9 20 L 9 12 Z"
            fill={getSurfaceFill('mesial')}
            stroke={STROKE_COLOR}
            strokeWidth={STROKE_WIDTH}
            onClick={(e) => handleSegmentClick(e, 'mesial')}
          />
          {/* Right segment (Distal/Mesial) */}
          <path
            d="M 25.9 12 A 14 14 0 0 1 25.9 20 L 23 20 L 23 12 Z"
            fill={getSurfaceFill('distal')}
            stroke={STROKE_COLOR}
            strokeWidth={STROKE_WIDTH}
            onClick={(e) => handleSegmentClick(e, 'distal')}
          />
          {/* Center horizontal bar (Incisal edge) */}
          <rect
            x="9"
            y="12"
            width="14"
            height="8"
            rx="1.5"
            fill={getSurfaceFill('occlusal')}
            stroke={STROKE_COLOR}
            strokeWidth={STROKE_WIDTH}
            onClick={(e) => handleSegmentClick(e, 'occlusal')}
          />
        </g>
      ) : (
        // Posterior teeth (Molars & Premolars: concentric circles with 4 radial lines)
        <g>
          {/* Outer circle */}
          <circle cx="16" cy="16" r="14" fill="#ffffff" stroke={STROKE_COLOR} strokeWidth={STROKE_WIDTH} />
          {/* Top segment (Buccal) */}
          <path
            d="M 6.1 6.1 A 14 14 0 0 1 25.9 6.1 L 20.6 11.4 A 6.5 6.5 0 0 0 11.4 11.4 Z"
            fill={getSurfaceFill('buccal')}
            stroke={STROKE_COLOR}
            strokeWidth={STROKE_WIDTH}
            onClick={(e) => handleSegmentClick(e, 'buccal')}
          />
          {/* Bottom segment (Lingual) */}
          <path
            d="M 6.1 25.9 A 14 14 0 0 0 25.9 25.9 L 20.6 20.6 A 6.5 6.5 0 0 1 11.4 20.6 Z"
            fill={getSurfaceFill('lingual')}
            stroke={STROKE_COLOR}
            strokeWidth={STROKE_WIDTH}
            onClick={(e) => handleSegmentClick(e, 'lingual')}
          />
          {/* Left segment (Mesial/Distal) */}
          <path
            d="M 6.1 6.1 A 14 14 0 0 0 6.1 25.9 L 11.4 20.6 A 6.5 6.5 0 0 1 11.4 11.4 Z"
            fill={getSurfaceFill('mesial')}
            stroke={STROKE_COLOR}
            strokeWidth={STROKE_WIDTH}
            onClick={(e) => handleSegmentClick(e, 'mesial')}
          />
          {/* Right segment (Distal/Mesial) */}
          <path
            d="M 25.9 6.1 A 14 14 0 0 1 25.9 25.9 L 20.6 20.6 A 6.5 6.5 0 0 0 20.6 11.4 Z"
            fill={getSurfaceFill('distal')}
            stroke={STROKE_COLOR}
            strokeWidth={STROKE_WIDTH}
            onClick={(e) => handleSegmentClick(e, 'distal')}
          />
          {/* Center concentric circle (Occlusal) */}
          <circle
            cx="16"
            cy="16"
            r="6.5"
            fill={getSurfaceFill('occlusal')}
            stroke={STROKE_COLOR}
            strokeWidth={STROKE_WIDTH}
            onClick={(e) => handleSegmentClick(e, 'occlusal')}
          />
        </g>
      )}
    </svg>
  );
};

// ── Backward-compatible helper ──
export const getToothSVG = (toothId, color = 'currentColor', size = 26) => {
  return (
    <div style={{ width: size, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <RealisticToothSVG toothId={toothId} />
    </div>
  );
};
