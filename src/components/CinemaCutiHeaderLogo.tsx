/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface CinemaCutiHeaderLogoProps {
  className?: string;
}

/**
 * Official Cinema XXI Group Trio Header Logo
 * PERSIS SESUAI DOKUMEN MASTER ASLI (Gambar 2):
 * 1. KIRI   : Cinema XXI (Script/Cursive gold "Cinema" + gold Roman serif "XXI")
 * 2. TENGAH : the Premiere (Script "the" + serif gold "Premiere" dengan sayap ornamen)
 * 3. KANAN  : Cinema 21 (Script silver "Cinema" + emblem film strip kotak biru/merah 21)
 */
export default function CinemaCutiHeaderLogo({ className = 'w-full h-auto block' }: CinemaCutiHeaderLogoProps) {
  return (
    <div className={`w-full select-none ${className}`} aria-label="Cinema XXI Group Logo">
      <svg
        viewBox="0 0 760 52"
        className="w-full h-auto block"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gold gradient for Cinema XXI and Premiere */}
          <linearGradient id="goldGradReal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#DFB75A" />
            <stop offset="30%" stopColor="#C49A38" />
            <stop offset="70%" stopColor="#9C7215" />
            <stop offset="100%" stopColor="#6E4D06" />
          </linearGradient>

          {/* Premiere gold gradient */}
          <linearGradient id="premiereGradReal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E2BE66" />
            <stop offset="35%" stopColor="#C69E3B" />
            <stop offset="70%" stopColor="#A87E20" />
            <stop offset="100%" stopColor="#7E590D" />
          </linearGradient>

          {/* Red gradient for 21 film badge */}
          <linearGradient id="redBadgeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="60%" stopColor="#DC2626" />
            <stop offset="100%" stopColor="#991B1B" />
          </linearGradient>

          {/* Blue gradient for film strip header */}
          <linearGradient id="blueFilmGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>
        </defs>

        {/* ============================================================== */}
        {/* 1. LOGO KIRI: Cinema XXI (Sesuai Gambar 2 Asli)                */}
        {/* ============================================================== */}
        <g id="logo-left-cinema-xxi" transform="translate(10, 4)">
          {/* "Cinema" cursive script in gold */}
          <text
            x="0"
            y="32"
            fontFamily="'Brush Script MT', 'Monotype Corsiva', 'Dancing Script', 'Snell Roundhand', 'Georgia', cursive, serif"
            fontSize="30"
            fontStyle="italic"
            fontWeight="bold"
            letterSpacing="0.5"
            fill="url(#goldGradReal)"
          >
            Cinema
          </text>

          {/* "XXI" bold Roman numerals with serif in gold */}
          <text
            x="92"
            y="34"
            fontFamily="'Times New Roman', 'Cinzel', Times, Georgia, serif"
            fontSize="36"
            fontWeight="900"
            letterSpacing="2.5"
            fill="url(#goldGradReal)"
          >
            XXI
          </text>
        </g>

        {/* ============================================================== */}
        {/* 2. LOGO TENGAH: the Premiere (Sesuai Gambar 2 Asli)           */}
        {/* ============================================================== */}
        <g id="logo-center-the-premiere" transform="translate(380, 4)">
          {/* Sayap garis dekoratif di sebelah kiri */}
          <line x1="-130" y1="20" x2="-48" y2="20" stroke="#C49A38" strokeWidth="1" strokeLinecap="round" />
          <polygon points="-46,20 -50,17.5 -54,20 -50,22.5" fill="#C49A38" />
          <circle cx="-130" cy="20" r="1.5" fill="#C49A38" />

          {/* Sayap garis dekoratif di sebelah kanan */}
          <polygon points="46,20 50,17.5 54,20 50,22.5" fill="#C49A38" />
          <line x1="48" y1="20" x2="130" y2="20" stroke="#C49A38" strokeWidth="1" strokeLinecap="round" />
          <circle cx="130" cy="20" r="1.5" fill="#C49A38" />

          {/* "the" script font di atas */}
          <text
            x="0"
            y="17"
            textAnchor="middle"
            fontFamily="'Brush Script MT', 'Monotype Corsiva', 'Dancing Script', 'Snell Roundhand', cursive, serif"
            fontSize="18"
            fontStyle="italic"
            fontWeight="600"
            fill="#8C6D23"
          >
            the
          </text>

          {/* "Premiere" serif elegan di bawah */}
          <text
            x="0"
            y="41"
            textAnchor="middle"
            fontFamily="'Times New Roman', Times, 'Georgia', serif"
            fontSize="30"
            fontWeight="bold"
            letterSpacing="2.5"
            fill="url(#premiereGradReal)"
          >
            Premiere
          </text>
        </g>

        {/* ============================================================== */}
        {/* 3. LOGO KANAN: Cinema 21 (Sesuai Gambar 2 Asli)               */}
        {/* ============================================================== */}
        <g id="logo-right-cinema-21" transform="translate(620, 4)">
          {/* "Cinema" cursive script in dark charcoal / silver */}
          <text
            x="0"
            y="32"
            fontFamily="'Brush Script MT', 'Monotype Corsiva', 'Dancing Script', 'Snell Roundhand', 'Georgia', cursive, serif"
            fontSize="30"
            fontStyle="italic"
            fontWeight="bold"
            letterSpacing="0.5"
            fill="#374151"
          >
            Cinema
          </text>

          {/* Iconic Film Strip 21 Emblem Badge */}
          <g transform="translate(94, 6)">
            {/* Film Sprocket Header (Blue) */}
            <rect x="0" y="0" width="36" height="9" rx="2" fill="url(#blueFilmGrad)" />
            {/* White film sprocket perforations */}
            <circle cx="6" cy="4.5" r="1.5" fill="#FFFFFF" />
            <circle cx="14" cy="4.5" r="1.5" fill="#FFFFFF" />
            <circle cx="22" cy="4.5" r="1.5" fill="#FFFFFF" />
            <circle cx="30" cy="4.5" r="1.5" fill="#FFFFFF" />

            {/* Red Badge Body */}
            <rect x="0" y="9" width="36" height="25" rx="2" fill="url(#redBadgeGrad)" />
            
            {/* "21" numeral in bold white italic */}
            <text
              x="18"
              y="29"
              textAnchor="middle"
              fontFamily="'Impact', 'Arial Black', -apple-system, sans-serif"
              fontSize="21"
              fontWeight="900"
              fontStyle="italic"
              letterSpacing="-1"
              fill="#FFFFFF"
            >
              21
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}
