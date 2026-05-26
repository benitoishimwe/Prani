import React from 'react';

/**
 * Plani brand logo SVG component.
 * Props:
 *   size     – 'sm' | 'md' | 'lg' | 'xl'  (default 'md')
 *   light    – true → white text (for dark backgrounds)
 *   iconOnly – true → render only the icon square, no wordmark
 */
export default function PlaniLogo({ size = 'md', light = false, iconOnly = false }) {
  const px = { sm: 24, md: 32, lg: 40, xl: 56 }[size] ?? 32;
  const rx = Math.round(px * 0.22);
  const pFontSize = Math.round(px * 0.64);
  const textFontSize = Math.round(px * 0.48);
  const gap = Math.round(px * 0.28);
  const textX = px + gap;
  const baselineY = Math.round(px * 0.72);
  const dotR = Math.round(px * 0.1);
  const dotCY = Math.round(px * 0.16);
  const textColor = light ? '#FFFFFF' : '#0F4C5C';
  const totalW = iconOnly ? px : px + gap + Math.round(px * 2.4);

  return (
    <svg
      width={totalW}
      height={px}
      viewBox={`0 0 ${totalW} ${px}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Plani"
      role="img"
    >
      {/* Icon box */}
      <rect width={px} height={px} rx={rx} fill="#0F4C5C" />

      {/* Orange accent mark — downward triangle inside icon */}
      <polygon
        points={`${px * 0.375},${px * 0.375} ${px * 0.625},${px * 0.375} ${px * 0.5},${px * 0.65}`}
        fill="#E67E22"
      />

      {/* White P letter */}
      <text
        x={px / 2}
        y={baselineY}
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontWeight="800"
        fontSize={pFontSize}
        fill="white"
      >
        P
      </text>

      {/* Wordmark */}
      {!iconOnly && (
        <>
          {/* "Plan" */}
          <text
            x={textX}
            y={baselineY}
            fontFamily="Poppins, Inter, sans-serif"
            fontWeight="700"
            fontSize={textFontSize}
            fill={textColor}
          >
            Plan
          </text>

          {/* "i" with orange dot */}
          <text
            x={textX + Math.round(textFontSize * 2.35)}
            y={baselineY}
            fontFamily="Poppins, Inter, sans-serif"
            fontWeight="700"
            fontSize={textFontSize}
            fill={textColor}
          >
            i
          </text>
          <circle
            cx={textX + Math.round(textFontSize * 2.48)}
            cy={dotCY}
            r={dotR + 1}
            fill="#E67E22"
          />
        </>
      )}
    </svg>
  );
}
