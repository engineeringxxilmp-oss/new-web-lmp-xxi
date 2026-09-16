/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import cinemaXxiLogos from '../../assets/images/cinema_xxi_logos_1783626471720.jpg';

/**
 * DocumentHeader - FIXED PERMANENT TEMPLATE
 * Header ini TIDAK BOLEH dihapus, diedit, atau dipindahkan oleh user.
 * Merupakan template baku Berita Acara Permintaan Barang Cinema XXI Lippo Mall Puri.
 */
export default function DocumentHeader() {
  return (
    <div className="w-full text-center border-b-2 border-black pb-0.5 mb-1.5 select-none pointer-events-none -mt-7 md:-mt-8" id="permanent-document-header">
      {/* Logos Image Banner */}
      <div className="w-full flex justify-center mb-0 overflow-hidden">
        <img 
          src={cinemaXxiLogos} 
          alt="Cinema XXI Logos Banner" 
          className="w-full h-auto object-contain block mx-auto -mt-2 md:-mt-3"
        />
      </div>

      {/* Main Cinema Branch Title */}
      <h1 className="text-xl md:text-2xl lg:text-3xl font-serif font-black text-[#b8860b] tracking-wide uppercase my-0 -mt-14 md:-mt-[85px] lg:-mt-[100px] drop-shadow-2xs">
        LIPPO MALL PURI XXI
      </h1>

      {/* Address */}
      <p className="text-[11px] md:text-xs text-slate-800 font-sans leading-tight max-w-2xl mx-auto px-4 font-medium my-0.5">
        Jl. Puri Indah Raya No.3 08, RT.3/RW.6, Kembangan Sel., Kec. Kembangan, Kota Jakarta Barat, Daerah Khusus Ibukota Jakarta 11610
      </p>
    </div>
  );
}
