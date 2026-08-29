import React from 'react';
import warinLogoImg from './assets/images/warin_logo_1787963816036.png';

export const WARIN_LOGO_URL = warinLogoImg;

export const WarinEmblem: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => {
  return (
    <img
      src={WARIN_LOGO_URL}
      alt="ตราสัญลักษณ์เทศบาลเมืองวารินชำราบ"
      className={`${className} object-contain rounded-full shadow-xs bg-white p-0.5 border border-sky-200/60`}
      loading="lazy"
    />
  );
};
