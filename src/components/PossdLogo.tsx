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
  // Always use the authoritative supplied official image asset (/possd black.png)
  // To preserve logo integrity without redrawing, distortion, or CSS filters, use object-contain.
  const logoImg = (
    <img
      src="/possd%20black.png"
      alt={alt}
      className={`${className} object-contain select-none`}
      draggable={false}
    />
  );

  if (variant === 'badge') {
    return (
      <div className="bg-white p-1 rounded-xl shadow-xs border border-slate-200/90 flex items-center justify-center shrink-0">
        {logoImg}
      </div>
    );
  }

  return logoImg;
};
