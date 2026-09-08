import React from 'react';

export interface PossdLogoProps {
  className?: string;
  variant?: 'black' | 'white' | 'badge';
  size?: number | string;
  alt?: string;
}

export const PossdLogo: React.FC<PossdLogoProps> = ({
  className = 'w-10 h-10',
  variant = 'black',
  alt = 'POSSD Official Logo',
}) => {
  const fillColor = variant === 'white' ? '#ffffff' : '#000000';
  const strokeColor = variant === 'white' ? '#ffffff' : '#000000';
  const gapColor = variant === 'white' ? '#0c2340' : '#ffffff';

  const logoSvg = (
    <svg
      viewBox="0 0 1000 820"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={alt}
    >
      {/* Top Roof Eaves Outer Chevron */}
      <polygon
        points="500,20 930,325 895,335 500,55 105,335 70,325"
        fill={fillColor}
      />

      {/* Secondary Parallel Roof Stripe */}
      <polygon
        points="500,75 870,335 848,342 500,95 152,342 130,335"
        fill={fillColor}
      />

      {/* Main Hexagon / Shield Outer Boundary */}
      <polygon
        points="500,118 820,318 820,578 500,782 180,578 180,318"
        fill="none"
        stroke={strokeColor}
        strokeWidth="24"
        strokeLinejoin="miter"
      />

      {/* Inner White Buffer Line */}
      <polygon
        points="500,140 800,326 800,568 500,760 200,568 200,326"
        fill="none"
        stroke={gapColor}
        strokeWidth="14"
        strokeLinejoin="miter"
      />

      {/* LETTERS: P - O - S - S - D in Bold Block Typography matching POSSD emblem */}
      <g fill={fillColor}>
        {/* P (Column 1) */}
        <path
          d="M 215,338 L 310,278 L 310,432 L 255,432 L 255,564 L 215,564 Z 
             M 252,330 L 278,314 L 278,394 L 252,394 Z"
          fillRule="evenodd"
        />

        {/* O (Column 2) */}
        <path
          d="M 326,268 L 420,206 L 420,674 L 326,612 Z 
             M 360,268 L 386,250 L 386,628 L 360,610 Z"
          fillRule="evenodd"
        />

        {/* Center S (Column 3 - Reaches apex at top and bottom sharp point) */}
        <path
          d="M 500,152 L 564,196 L 564,284 L 528,284 L 528,228 L 500,206 L 472,228 L 472,318 L 564,368 L 564,520 L 500,566 L 500,598 L 564,642 L 564,678 L 500,746 L 436,700 L 436,614 L 472,614 L 472,670 L 500,692 L 528,670 L 528,580 L 436,530 L 436,378 L 500,332 L 500,300 L 436,256 L 436,220 Z 
             M 472,390 L 500,410 L 528,390 L 528,352 L 500,332 L 472,352 Z"
          fillRule="evenodd"
        />

        {/* S (Column 4) */}
        <path
          d="M 580,206 L 674,268 L 674,346 L 640,346 L 640,298 L 608,278 L 608,344 L 674,380 L 674,494 L 608,534 L 674,576 L 674,612 L 580,674 L 580,596 L 614,596 L 614,644 L 646,624 L 646,558 L 580,522 L 580,408 L 646,368 L 580,326 Z"
          fillRule="evenodd"
        />

        {/* D (Column 5) */}
        <path
          d="M 690,278 L 784,338 L 784,554 L 746,580 L 690,544 Z 
             M 726,330 L 752,346 L 752,538 L 726,554 Z"
          fillRule="evenodd"
        />
      </g>
    </svg>
  );

  if (variant === 'badge') {
    return (
      <div className="bg-white p-1 rounded-xl shadow-xs border border-slate-200/90 flex items-center justify-center shrink-0">
        {logoSvg}
      </div>
    );
  }

  return logoSvg;
};
