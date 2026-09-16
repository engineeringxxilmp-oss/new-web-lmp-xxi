/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { SystemBranding, FontStyle, HeaderBgType, IllustrationType } from '../types';
import { Film, Wrench, HardHat, Cpu, Zap, Wind, MapPin, Phone, Search, Command, FileText, ClipboardList, Users, Package, History, ArrowRight, X, Sparkles, Database, Clock, Calendar, LogOut, Edit3, Check, Flame, Sliders, RotateCcw } from 'lucide-react';

import animeAcUrl from '../assets/images/anime_ac_1783625656439.jpg';
import animeProjUrl from '../assets/images/anime_proj_1783625670956.jpg';
import animeElecUrl from '../assets/images/anime_elec_1783625685173.jpg';
import animeCivilUrl from '../assets/images/anime_civil_1783625698103.jpg';
import defaultLogoUrl from '../assets/images/cinema_xxi_logos_1783626471720.jpg';

// Import newly generated real technician photo assets
import realAcChillerUrl from '../assets/images/real_ac_chiller_1784053140861.jpg';
import realAcIndoorUrl from '../assets/images/real_ac_indoor_1784053159142.jpg';
import realElecUrl from '../assets/images/real_elec_1784053175355.jpg';
import realProjUrl from '../assets/images/real_proj_1784053193447.jpg';
import realRestUrl from '../assets/images/real_rest_1784053211633.jpg';
import realCivilUrl from '../assets/images/real_civil_1784053228829.jpg';

import { UserSession } from '../views/Login';

interface HeaderProps {
  branding: SystemBranding;
  saveStatus?: 'saved' | 'saving' | 'idle';
  onChangeTab?: (tab: string) => void;
  currentUser?: UserSession | null;
  onLogout?: () => void;
}

export default function Header({ branding, saveStatus = 'saved', onChangeTab, currentUser, onLogout }: HeaderProps) {
  const { title, subtitle, headerBg, illustration, logoUrl } = branding;

  // Real-time Live Clock State (Jam, Hari, Bulan, Tahun)
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const daysIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthsIndo = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayName = daysIndo[currentTime.getDay()];
  const dateNum = String(currentTime.getDate()).padStart(2, '0');
  const monthName = monthsIndo[currentTime.getMonth()];
  const yearNum = currentTime.getFullYear();

  const hours = String(currentTime.getHours()).padStart(2, '0');
  const minutes = String(currentTime.getMinutes()).padStart(2, '0');
  const seconds = String(currentTime.getSeconds()).padStart(2, '0');

  // --- COMMAND CENTER / GLOBAL SPOTLIGHT SEARCH ENGINE ---
  const [headerModel, setHeaderModel] = useState<'CYBER_HUD' | 'GOLD_LUXURY' | 'MATRIX_TECH' | 'NEON_SYNTH'>(() => {
    return (localStorage.getItem('xxi_header_model') as any) || 'CYBER_HUD';
  });

  const [isAutoNeonRunning, setIsAutoNeonRunning] = useState<boolean>(() => {
    const saved = localStorage.getItem('xxi_auto_neon_running');
    return saved !== null ? saved === 'true' : true; // Default to TRUE for auto-running neon!
  });

  useEffect(() => {
    if (!isAutoNeonRunning) return;
    const models: ('CYBER_HUD' | 'GOLD_LUXURY' | 'MATRIX_TECH' | 'NEON_SYNTH')[] = [
      'CYBER_HUD', 'GOLD_LUXURY', 'MATRIX_TECH', 'NEON_SYNTH'
    ];
    const timer = setInterval(() => {
      setHeaderModel((prev) => {
        const nextIdx = (models.indexOf(prev) + 1) % models.length;
        const nextModel = models[nextIdx];
        localStorage.setItem('xxi_header_model', nextModel);
        return nextModel;
      });
    }, 2500);
    return () => clearInterval(timer);
  }, [isAutoNeonRunning]);

  const toggleAutoNeonRunning = () => {
    const nextVal = !isAutoNeonRunning;
    setIsAutoNeonRunning(nextVal);
    localStorage.setItem('xxi_auto_neon_running', String(nextVal));
  };

  const changeHeaderModel = (newModel: 'CYBER_HUD' | 'GOLD_LUXURY' | 'MATRIX_TECH' | 'NEON_SYNTH') => {
    setHeaderModel(newModel);
    localStorage.setItem('xxi_header_model', newModel);
  };

  // --- FOKUS KERJA BRE RUNNING TEXT STATE ---
  const DEFAULT_TICKER_TITLE = 'FOKUS KERJA BRE';
  const DEFAULT_TICKER_TEXT = '🔥 FOKUS KERJA BRE • UTAMAKAN KESELAMATAN & KUALITAS OPERASIONAL CINEMA XXI LIPPO MALL PURI NSR014 • TELITI, CEPAT, TEPAT & PROFESIONAL! 🎬⚡';

  const [runningTitle, setRunningTitle] = useState<string>(() => {
    return localStorage.getItem('xxi_running_title') || DEFAULT_TICKER_TITLE;
  });

  const [runningText, setRunningText] = useState<string>(() => {
    return localStorage.getItem('xxi_running_text') || DEFAULT_TICKER_TEXT;
  });

  const [runningSpeed, setRunningSpeed] = useState<number>(() => {
    const saved = localStorage.getItem('xxi_running_speed');
    return saved ? parseInt(saved, 10) : 26;
  });

  const [isEditingTicker, setIsEditingTicker] = useState(false);
  const [tempTitle, setTempTitle] = useState(runningTitle);
  const [tempText, setTempText] = useState(runningText);
  const [tempSpeed, setTempSpeed] = useState(runningSpeed);
  const [savedSuccessToast, setSavedSuccessToast] = useState(false);

  const handleOpenEditTicker = () => {
    setTempTitle(runningTitle);
    setTempText(runningText);
    setTempSpeed(runningSpeed);
    setIsEditingTicker(true);
  };

  const handleSaveTicker = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = tempTitle.trim() || DEFAULT_TICKER_TITLE;
    const finalText = tempText.trim() || DEFAULT_TICKER_TEXT;
    setRunningTitle(finalTitle);
    setRunningText(finalText);
    setRunningSpeed(tempSpeed);

    localStorage.setItem('xxi_running_title', finalTitle);
    localStorage.setItem('xxi_running_text', finalText);
    localStorage.setItem('xxi_running_speed', String(tempSpeed));

    setSavedSuccessToast(true);
    setTimeout(() => setSavedSuccessToast(false), 2500);
    setIsEditingTicker(false);
  };

  const handleResetTicker = () => {
    setTempTitle(DEFAULT_TICKER_TITLE);
    setTempText(DEFAULT_TICKER_TEXT);
    setTempSpeed(26);
  };

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<'ALL' | 'EQUIPMENT' | 'PR' | 'VENDOR' | 'FILM' | 'AREA'>('ALL');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [areasList, setAreasList] = useState<any[]>([]);
  const [equipmentsList, setEquipmentsList] = useState<any[]>([]);
  const [prsList, setPrsList] = useState<any[]>([]);
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  const [filmsList, setFilmsList] = useState<any[]>([]);

  // Toggle or open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Autofocus the search bar on open
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 80);
      
      // Load current fresh database values
      try {
        const rawAreas = localStorage.getItem('xxi_areas');
        const rawEq = localStorage.getItem('xxi_equipment');
        const rawPr = localStorage.getItem('xxi_pr_engineering');
        const rawVendors = localStorage.getItem('xxi_vendors');
        const rawFilms = localStorage.getItem('xxi_film_upload');

        setAreasList(rawAreas ? JSON.parse(rawAreas) : []);
        setEquipmentsList(rawEq ? JSON.parse(rawEq) : []);
        setPrsList(rawPr ? JSON.parse(rawPr) : []);
        setVendorsList(rawVendors ? JSON.parse(rawVendors) : []);
        setFilmsList(rawFilms ? JSON.parse(rawFilms) : []);
      } catch (e) {
        console.error("Failed to load search index values", e);
      }
    } else {
      setSearchQuery('');
    }
  }, [isSearchOpen]);

  // State to support dynamic slideshow cycling
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const animeSlides: IllustrationType[] = ['Anime-AC', 'Anime-Projector', 'Anime-Electrical', 'Anime-Civil'];
  const realSlides: IllustrationType[] = ['Real-AC-Chiller', 'Real-AC-Indoor', 'Real-Electrical', 'Real-Projector', 'Real-Resting', 'Real-Civil'];
  const allSlides: IllustrationType[] = [
    'Anime-AC',
    'Anime-Projector',
    'Anime-Electrical',
    'Anime-Civil',
    'Real-AC-Chiller',
    'Real-AC-Indoor',
    'Real-Electrical',
    'Real-Projector',
    'Real-Resting',
    'Real-Civil',
    'AC',
    'Projector',
    'Electrical',
    'Building',
    'All-in-One'
  ];

  useEffect(() => {
    if (illustration === 'Anime-Slideshow') {
      const interval = setInterval(() => {
        setCurrentSlideIndex((prevIndex) => (prevIndex + 1) % animeSlides.length);
      }, 3000);
      return () => clearInterval(interval);
    } else if (illustration === 'Real-Slideshow') {
      const interval = setInterval(() => {
        setCurrentSlideIndex((prevIndex) => (prevIndex + 1) % realSlides.length);
      }, 3000);
      return () => clearInterval(interval);
    } else if (illustration === 'All-Slideshow') {
      const interval = setInterval(() => {
        setCurrentSlideIndex((prevIndex) => (prevIndex + 1) % allSlides.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [illustration]);

  // Determine what actual illustration to render
  const activeIllustration =
    illustration === 'Anime-Slideshow'
      ? animeSlides[currentSlideIndex % animeSlides.length]
      : illustration === 'Real-Slideshow'
      ? realSlides[currentSlideIndex % realSlides.length]
      : illustration === 'All-Slideshow'
      ? allSlides[currentSlideIndex % allSlides.length]
      : illustration;

  // Background configurations
  const bgStyles: Record<HeaderBgType, string> = {
    'gradient-dark': 'bg-gradient-to-r from-neutral-900 via-neutral-850 to-neutral-900 text-white border-neutral-800',
    'gradient-blue': 'bg-gradient-to-r from-[#0a192f] via-[#0d2a4a] to-[#0a192f] text-white border-blue-950',
    'gradient-gold': 'bg-gradient-to-r from-[#1c140a] via-[#33220c] to-[#1c140a] text-yellow-100 border-amber-950',
    'solid-slate': 'bg-slate-800 text-slate-100 border-slate-700',
    'solid-navy': 'bg-[#0b132b] text-white border-slate-800',
    'solid-black': 'bg-black text-white border-neutral-900 shadow-xl',
    'solid-pink': 'bg-pink-600 text-white border-pink-500 shadow-xl',
    'gradient-pink': 'bg-gradient-to-r from-pink-700 via-rose-600 to-pink-800 text-white border-pink-600 shadow-xl'
  };

  // Helper to render customized SVG illustrations in real-time
  const renderIllustration = (type: IllustrationType) => {
    switch (type) {
      case 'AC':
        return (
          <svg className="w-full h-full max-h-[200px] opacity-80" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="20" width="160" height="45" rx="6" stroke="currentColor" strokeWidth="2" strokeDasharray="1 1" className="opacity-40" />
            <rect x="25" y="25" width="150" height="35" rx="4" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="2" />
            {/* Fan Blades */}
            <circle cx="100" cy="42" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path d="M100 32 L100 52 M90 42 L110 42" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="100" cy="42" r="3" fill="currentColor" />
            {/* Air flow lines */}
            <path d="M40 75 Q50 85 60 75 T80 75 T100 75 T120 75 T140 75 T160 75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="animate-pulse text-blue-400" />
            <path d="M50 82 Q60 92 70 82 T90 82 T110 82 T130 82 T150 82" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="animate-pulse text-blue-300 opacity-70" />
            {/* Indicator Lights */}
            <circle cx="160" cy="35" r="2" fill="#22c55e" className="animate-ping" />
            <circle cx="160" cy="35" r="2" fill="#22c55e" />
            <circle cx="166" cy="35" r="2" fill="currentColor" className="opacity-50" />
            <text x="135" y="52" fill="currentColor" fontSize="6" fontFamily="monospace" className="opacity-60">AC TEMP: 18C</text>
          </svg>
        );
      case 'Projector':
        return (
          <svg className="w-full h-full max-h-[200px] opacity-80" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Projector Body */}
            <rect x="30" y="30" width="110" height="50" rx="8" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="2" />
            <rect x="40" y="40" width="35" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" className="opacity-50" />
            {/* Reels */}
            <circle cx="55" cy="46" r="3" fill="currentColor" />
            <circle cx="68" cy="46" r="3" fill="currentColor" />
            {/* Lens structure */}
            <path d="M140 45 L165 30 L165 70 Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" />
            <circle cx="140" cy="50" r="8" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
            {/* Projection Ray */}
            <polygon points="165,35 220,15 220,85 165,65" fill="url(#lensRay)" className="opacity-40" />
            <defs>
              <linearGradient id="lensRay" x1="165" y1="50" x2="220" y2="50" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#eab308" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Dynamic film frame sparks */}
            <line x1="180" y1="35" x2="195" y2="25" stroke="#eab308" strokeWidth="1.5" strokeLinecap="round" className="animate-ping" />
            <line x1="190" y1="65" x2="205" y2="75" stroke="#eab308" strokeWidth="1" strokeLinecap="round" className="animate-ping" />
          </svg>
        );
      case 'Electrical':
        return (
          <svg className="w-full h-full max-h-[200px] opacity-80" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Tech board background */}
            <path d="M20 20 H180 V80 H20 Z" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="opacity-20" />
            {/* Microchip */}
            <rect x="80" y="35" width="40" height="30" rx="4" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="2" />
            {/* Wiring traces */}
            <path d="M40 50 H80" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M120 50 H160" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M100 20 V35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M100 65 V80" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            {/* Waveform */}
            <path d="M40 50 L50 30 L60 70 L70 50" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse" />
            <path d="M130 50 L140 30 L150 70 L160 50" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* Lightning Zap */}
            <path d="M100 42 L95 50 H105 L100 58" stroke="#eab308" strokeWidth="2" strokeLinecap="round" fill="none" className="animate-bounce" />
          </svg>
        );
      case 'Building':
        return (
          <svg className="w-full h-full max-h-[200px] opacity-80" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Architecture grid background */}
            <line x1="10" y1="10" x2="190" y2="10" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" className="opacity-20" />
            <line x1="10" y1="30" x2="190" y2="30" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" className="opacity-20" />
            <line x1="10" y1="50" x2="190" y2="50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" className="opacity-20" />
            <line x1="10" y1="70" x2="190" y2="70" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" className="opacity-20" />
            <line x1="10" y1="90" x2="190" y2="90" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" className="opacity-20" />
            
            {/* Architectural structural framing */}
            <path d="M30 90 L80 30 L130 90 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="currentColor" fillOpacity="0.05" />
            <path d="M80 90 V30" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
            <path d="M30 90 H170" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            {/* Support struts */}
            <line x1="55" y1="60" x2="80" y2="60" stroke="currentColor" strokeWidth="1.5" />
            <line x1="105" y1="60" x2="80" y2="60" stroke="currentColor" strokeWidth="1.5" />
            {/* Blueprint tools */}
            <path d="M140 40 L170 70" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3 1" />
            <path d="M170 40 L140 70" stroke="currentColor" strokeWidth="1.5" />
            <text x="142" y="32" fill="currentColor" fontSize="7" fontFamily="sans-serif" className="opacity-55">SCALE: 1:100</text>
          </svg>
        );
      case 'Anime-AC':
        return (
          <div className="relative w-full h-full overflow-hidden rounded-lg border border-white/10 shadow-md">
            <img
              src={animeAcUrl}
              alt="Anime AC Technician"
              className="w-full h-full object-cover animate-camera-pan animate-hologram-flicker"
              referrerPolicy="no-referrer"
            />
            {/* Moving Laser Line sweep */}
            <div className="absolute left-0 w-full h-0.5 bg-[#00E5FF] shadow-[0_0_8px_#00E5FF,0_0_15px_#00E5FF] opacity-75 pointer-events-none z-10 animate-laser-line" />
            {/* Dynamic radar lock target crosshair overlay */}
            <div className="absolute inset-0 pointer-events-none border border-[#00E5FF]/5 m-4 flex items-center justify-center">
              <div className="w-4 h-4 border border-[#00E5FF]/20 rounded-full animate-ping" />
            </div>
          </div>
        );
      case 'Anime-Projector':
        return (
          <div className="relative w-full h-full overflow-hidden rounded-lg border border-white/10 shadow-md">
            <img
              src={animeProjUrl}
              alt="Anime Projector Technician"
              className="w-full h-full object-cover animate-camera-pan animate-hologram-flicker"
              referrerPolicy="no-referrer"
            />
            {/* Moving Laser Line sweep */}
            <div className="absolute left-0 w-full h-0.5 bg-[#00E5FF] shadow-[0_0_8px_#00E5FF,0_0_15px_#00E5FF] opacity-75 pointer-events-none z-10 animate-laser-line" />
            {/* Dynamic radar lock target crosshair overlay */}
            <div className="absolute inset-0 pointer-events-none border border-[#00E5FF]/5 m-4 flex items-center justify-center">
              <div className="w-4 h-4 border border-[#00E5FF]/20 rounded-full animate-ping" />
            </div>
          </div>
        );
      case 'Anime-Electrical':
        return (
          <div className="relative w-full h-full overflow-hidden rounded-lg border border-white/10 shadow-md">
            <img
              src={animeElecUrl}
              alt="Anime Electrical Technician"
              className="w-full h-full object-cover animate-camera-pan animate-hologram-flicker"
              referrerPolicy="no-referrer"
            />
            {/* Moving Laser Line sweep */}
            <div className="absolute left-0 w-full h-0.5 bg-[#00E5FF] shadow-[0_0_8px_#00E5FF,0_0_15px_#00E5FF] opacity-75 pointer-events-none z-10 animate-laser-line" />
            {/* Dynamic radar lock target crosshair overlay */}
            <div className="absolute inset-0 pointer-events-none border border-[#00E5FF]/5 m-4 flex items-center justify-center">
              <div className="w-4 h-4 border border-[#00E5FF]/20 rounded-full animate-ping" />
            </div>
          </div>
        );
      case 'Anime-Civil':
        return (
          <div className="relative w-full h-full overflow-hidden rounded-lg border border-white/10 shadow-md">
            <img
              src={animeCivilUrl}
              alt="Anime Civil Technician"
              className="w-full h-full object-cover animate-camera-pan animate-hologram-flicker"
              referrerPolicy="no-referrer"
            />
            {/* Moving Laser Line sweep */}
            <div className="absolute left-0 w-full h-0.5 bg-[#00E5FF] shadow-[0_0_8px_#00E5FF,0_0_15px_#00E5FF] opacity-75 pointer-events-none z-10 animate-laser-line" />
            {/* Dynamic radar lock target crosshair overlay */}
            <div className="absolute inset-0 pointer-events-none border border-[#00E5FF]/5 m-4 flex items-center justify-center">
              <div className="w-4 h-4 border border-[#00E5FF]/20 rounded-full animate-ping" />
            </div>
          </div>
        );
      case 'Real-AC-Chiller':
        return (
          <div className="relative w-full h-full overflow-hidden rounded-lg border border-white/10 shadow-md">
            <img
              src={realAcChillerUrl}
              alt="Real AC Chiller Technician"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {/* Moving Laser Line sweep */}
            <div className="absolute left-0 w-full h-0.5 bg-[#00E5FF] shadow-[0_0_8px_#00E5FF,0_0_15px_#00E5FF] opacity-75 pointer-events-none z-10 animate-laser-line" />
            {/* Dynamic radar lock target crosshair overlay */}
            <div className="absolute inset-0 pointer-events-none border border-[#00E5FF]/5 m-4 flex items-center justify-center">
              <div className="w-4 h-4 border border-[#00E5FF]/20 rounded-full animate-ping" />
            </div>
          </div>
        );
      case 'Real-AC-Indoor':
        return (
          <div className="relative w-full h-full overflow-hidden rounded-lg border border-white/10 shadow-md">
            <img
              src={realAcIndoorUrl}
              alt="Real AC Indoor Repair"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute left-0 w-full h-0.5 bg-[#00E5FF] shadow-[0_0_8px_#00E5FF,0_0_15px_#00E5FF] opacity-75 pointer-events-none z-10 animate-laser-line" />
            <div className="absolute inset-0 pointer-events-none border border-[#00E5FF]/5 m-4 flex items-center justify-center">
              <div className="w-4 h-4 border border-[#00E5FF]/20 rounded-full animate-ping" />
            </div>
          </div>
        );
      case 'Real-Electrical':
        return (
          <div className="relative w-full h-full overflow-hidden rounded-lg border border-white/10 shadow-md">
            <img
              src={realElecUrl}
              alt="Real Electrical Panel Check"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute left-0 w-full h-0.5 bg-[#00E5FF] shadow-[0_0_8px_#00E5FF,0_0_15px_#00E5FF] opacity-75 pointer-events-none z-10 animate-laser-line" />
            <div className="absolute inset-0 pointer-events-none border border-[#00E5FF]/5 m-4 flex items-center justify-center">
              <div className="w-4 h-4 border border-[#00E5FF]/20 rounded-full animate-ping" />
            </div>
          </div>
        );
      case 'Real-Projector':
        return (
          <div className="relative w-full h-full overflow-hidden rounded-lg border border-white/10 shadow-md">
            <img
              src={realProjUrl}
              alt="Real Christie Projector Maintenance"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute left-0 w-full h-0.5 bg-[#00E5FF] shadow-[0_0_8px_#00E5FF,0_0_15px_#00E5FF] opacity-75 pointer-events-none z-10 animate-laser-line" />
            <div className="absolute inset-0 pointer-events-none border border-[#00E5FF]/5 m-4 flex items-center justify-center">
              <div className="w-4 h-4 border border-[#00E5FF]/20 rounded-full animate-ping" />
            </div>
          </div>
        );
      case 'Real-Resting':
        return (
          <div className="relative w-full h-full overflow-hidden rounded-lg border border-white/10 shadow-md">
            <img
              src={realRestUrl}
              alt="Real Technician Resting"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute left-0 w-full h-0.5 bg-[#00E5FF] shadow-[0_0_8px_#00E5FF,0_0_15px_#00E5FF] opacity-75 pointer-events-none z-10 animate-laser-line" />
            <div className="absolute inset-0 pointer-events-none border border-[#00E5FF]/5 m-4 flex items-center justify-center">
              <div className="w-4 h-4 border border-[#00E5FF]/20 rounded-full animate-ping" />
            </div>
          </div>
        );
      case 'Real-Civil':
        return (
          <div className="relative w-full h-full overflow-hidden rounded-lg border border-white/10 shadow-md">
            <img
              src={realCivilUrl}
              alt="Real Civil Plastering Work"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute left-0 w-full h-0.5 bg-[#00E5FF] shadow-[0_0_8px_#00E5FF,0_0_15px_#00E5FF] opacity-75 pointer-events-none z-10 animate-laser-line" />
            <div className="absolute inset-0 pointer-events-none border border-[#00E5FF]/5 m-4 flex items-center justify-center">
              <div className="w-4 h-4 border border-[#00E5FF]/20 rounded-full animate-ping" />
            </div>
          </div>
        );
      case 'All-in-One':
      default:
        return (
          <svg className="w-full h-full max-h-[200px] opacity-90" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* AC fan */}
            <circle cx="35" cy="50" r="14" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" className="opacity-40" />
            <circle cx="35" cy="50" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path d="M35 43 V57 M28 50 H42" stroke="currentColor" strokeWidth="1.5" className="animate-spin duration-3000" style={{ transformOrigin: '35px 50px' }} />
            <path d="M15 50 Q22 58 15 66" stroke="currentColor" strokeWidth="1" className="text-blue-300 opacity-60" />

            {/* Projector ray */}
            <path d="M85 30 H115 V60 H85 Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.5" />
            <polygon points="115,45 160,25 160,65" fill="url(#allRay)" className="opacity-45" />
            <defs>
              <linearGradient id="allRay" x1="115" y1="45" x2="160" y2="45" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Circuit Sparks & Grid */}
            <path d="M165 45 H185" stroke="#10b981" strokeWidth="1.5" />
            <circle cx="185" cy="45" r="3" fill="#10b981" className="animate-ping" />
            <path d="M120 75 L130 85 L145 70" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse" />
            
            {/* Gear in bottom corner */}
            <circle cx="170" cy="80" r="8" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="170" cy="80" r="3" fill="currentColor" />
          </svg>
        );
    }
  };

  return (
    <>
      <div
        className={`w-full overflow-hidden rounded-2xl border p-4 md:p-5 relative transition-all duration-500 select-none text-white backdrop-blur-xl ${
          headerModel === 'GOLD_LUXURY'
            ? 'bg-gradient-to-r from-[#181206]/95 via-[#1d1708]/95 to-[#0f0b02]/95 border-amber-500/50 shadow-[0_0_40px_rgba(251,191,36,0.2)]'
            : headerModel === 'MATRIX_TECH'
            ? 'bg-[#04120a]/95 border-emerald-500/40 shadow-[0_0_35px_rgba(16,185,129,0.18)]'
            : headerModel === 'NEON_SYNTH'
            ? 'bg-gradient-to-r from-[#1a0826]/95 via-[#0e0720]/95 to-[#060b24]/95 border-fuchsia-500/40 shadow-[0_0_35px_rgba(217,70,239,0.2)]'
            : 'bg-[#0b1329]/95 border-cyan-500/35 shadow-[0_0_35px_rgba(0,240,255,0.15)]'
        }`}
        id="main-app-header"
      >
      {/* Soft Ambient Radial Background Lighting */}
      <div className={`absolute inset-0 pointer-events-none z-0 ${
        headerModel === 'GOLD_LUXURY'
          ? 'bg-[radial-gradient(ellipse_at_top_left,rgba(251,191,36,0.15)_0%,transparent_60%)]'
          : headerModel === 'MATRIX_TECH'
          ? 'bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.15)_0%,transparent_60%)]'
          : headerModel === 'NEON_SYNTH'
          ? 'bg-[radial-gradient(ellipse_at_top_left,rgba(217,70,239,0.15)_0%,transparent_60%)]'
          : 'bg-[radial-gradient(ellipse_at_top_left,rgba(0,240,255,0.15)_0%,transparent_60%)]'
      }`} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.1)_0%,transparent_60%)] pointer-events-none z-0" />
      <div className={`absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none z-10 ${
        headerModel === 'GOLD_LUXURY' ? 'via-amber-400/70' : headerModel === 'MATRIX_TECH' ? 'via-emerald-400/70' : headerModel === 'NEON_SYNTH' ? 'via-fuchsia-400/70' : 'via-cyan-400/70'
      }`} />

      {/* INTERACTIVE MODEL SWITCHER BAR */}
      <div className="mb-3.5 p-2.5 rounded-xl bg-[#050a18]/90 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono relative z-10 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-2 text-cyan-300 font-bold">
          <Sparkles className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
          <span className="tracking-wider uppercase text-[11px] sm:text-xs">MODEL TAMPILAN HEADER:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* AUTO RUNNING NEON TOGGLE */}
          <button
            onClick={toggleAutoNeonRunning}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              isAutoNeonRunning
                ? 'bg-gradient-to-r from-amber-400 via-rose-500 to-fuchsia-500 text-black shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-pulse border border-white'
                : 'bg-slate-900/80 text-slate-400 border border-slate-700 hover:bg-slate-800'
            }`}
            title="Klik untuk Mengaktifkan/Meneon-kan Perubahan Warna Otomatis"
          >
            <Zap className={`w-3.5 h-3.5 ${isAutoNeonRunning ? 'text-black animate-bounce' : 'text-slate-500'}`} />
            {isAutoNeonRunning ? '⚡ OTOMATIS BERJALAN [ON]' : '⚡ OTOMATIS BERJALAN [OFF]'}
          </button>

          <button
            onClick={() => { changeHeaderModel('CYBER_HUD'); setIsAutoNeonRunning(false); localStorage.setItem('xxi_auto_neon_running', 'false'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              headerModel === 'CYBER_HUD' && !isAutoNeonRunning
                ? 'bg-cyan-500 text-black shadow-[0_0_15px_#00f0ff] border border-cyan-300'
                : 'bg-slate-900/80 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-950/80'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" /> CYBER HUD
          </button>
          <button
            onClick={() => { changeHeaderModel('GOLD_LUXURY'); setIsAutoNeonRunning(false); localStorage.setItem('xxi_auto_neon_running', 'false'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              headerModel === 'GOLD_LUXURY' && !isAutoNeonRunning
                ? 'bg-amber-400 text-black shadow-[0_0_15px_#fbbf24] border border-amber-200'
                : 'bg-slate-900/80 text-amber-300 border border-amber-500/30 hover:bg-amber-950/80'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> GOLD LUXURY
          </button>
          <button
            onClick={() => { changeHeaderModel('MATRIX_TECH'); setIsAutoNeonRunning(false); localStorage.setItem('xxi_auto_neon_running', 'false'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              headerModel === 'MATRIX_TECH' && !isAutoNeonRunning
                ? 'bg-emerald-500 text-black shadow-[0_0_15px_#10b981] border border-emerald-300'
                : 'bg-slate-900/80 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-950/80'
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> MATRIX TECH
          </button>
          <button
            onClick={() => { changeHeaderModel('NEON_SYNTH'); setIsAutoNeonRunning(false); localStorage.setItem('xxi_auto_neon_running', 'false'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
              headerModel === 'NEON_SYNTH' && !isAutoNeonRunning
                ? 'bg-fuchsia-500 text-black shadow-[0_0_15px_#d946ef] border border-fuchsia-300'
                : 'bg-slate-900/80 text-fuchsia-300 border border-fuchsia-500/30 hover:bg-fuchsia-950/80'
            }`}
          >
            <Wind className="w-3.5 h-3.5" /> NEON SYNTH
          </button>

          {currentUser && onLogout && (
            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-rose-950/90 text-rose-300 border border-rose-500/50 hover:bg-rose-900 transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.4)] ml-1"
              id="btn-header-logout"
              title="Keluar dari Akun XXI"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" /> KELUAR
            </button>
          )}
        </div>
      </div>

      {/* Main Header Layout Container */}
      <div className="flex flex-col lg:flex-row items-stretch justify-between gap-4 relative z-10">

        {/* LEFT PANEL: Executive Title & Cinema Info (Framed Command Card) */}
        <div className="flex-1 bg-[#050a18]/80 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-[0_0_30px_rgba(0,0,0,0.7)] backdrop-blur-md relative overflow-hidden">
          {/* Subtle Cyber Grid / Ambient Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-4 flex-1 flex flex-col justify-center relative z-10">
            {/* Title & Branch Header (Two-line Layout with MALL PURI below) */}
            <div className="text-center w-full">
              <h1
                className={`flex flex-col items-center justify-center font-black font-['Orbitron'] uppercase transition-all text-center mx-auto py-1 ${
                  headerModel === 'GOLD_LUXURY'
                    ? 'text-amber-300 drop-shadow-[0_0_40px_rgba(251,191,36,1)] [text-shadow:0_0_15px_#fde047,0_0_30px_#fbbf24,0_0_50px_#d97706]'
                    : headerModel === 'MATRIX_TECH'
                    ? 'text-emerald-300 drop-shadow-[0_0_40px_rgba(52,211,153,1)] [text-shadow:0_0_15px_#6ee7b7,0_0_30px_#10b981,0_0_50px_#047857]'
                    : headerModel === 'NEON_SYNTH'
                    ? 'text-fuchsia-300 drop-shadow-[0_0_40px_rgba(217,70,239,1)] [text-shadow:0_0_15px_#f0abfc,0_0_30px_#d946ef,0_0_50px_#a21caf]'
                    : 'text-amber-300 drop-shadow-[0_0_35px_rgba(251,191,36,1)] [text-shadow:0_0_12px_#fde047,0_0_25px_#f59e0b,0_0_40px_#d97706,0_0_60px_#b45309]'
                }`}
                id="header-branding-title"
              >
                <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-black tracking-wider sm:tracking-widest leading-none block">
                  {title && !title.includes("LIPPO MALL PURI") && !title.includes("MALL PURI") ? title : "CINEMA XXI"}
                </span>
                <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-black tracking-[0.18em] sm:tracking-[0.25em] leading-tight block mt-2 sm:mt-3">
                  {subtitle || "LIPPO MALL PURI"}
                </span>
              </h1>
            </div>

            {/* Status Badges & Tools Row */}
            <div className="w-full flex justify-center text-slate-300 font-sans">
              <div className="w-full flex flex-wrap items-center justify-center text-center gap-2">
                <span className="text-xs font-mono font-bold text-fuchsia-300 bg-fuchsia-950/80 px-3 py-1.5 rounded-lg border border-fuchsia-400 shadow-[0_0_12px_rgba(217,70,239,0.4)] uppercase tracking-wider shrink-0">
                  NSR014 • TECHNICAL SYSTEM
                </span>

                <div className="flex items-center gap-1.5 text-xs font-mono text-amber-300 bg-amber-950/80 px-3 py-1.5 rounded-lg border border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]">
                  <Phone className="w-3.5 h-3.5 text-amber-300 shrink-0 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                  <span>Phone Link: <strong className="text-amber-200 font-extrabold">(021) 1500210</strong></span>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-300 bg-emerald-950/80 px-3 py-1.5 rounded-lg border border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.4)] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,1)]" />
                  <span>STATUS: OPTIMAL</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-mono text-sky-300 bg-sky-950/80 px-3 py-1.5 rounded-lg border border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.4)] font-bold">
                  <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,1)]" />
                  <span>AUTO-SAVE: SYNCED</span>
                </div>

                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="flex items-center gap-2 text-xs font-mono text-pink-200 bg-pink-950/80 hover:bg-pink-900 px-3 py-1.5 rounded-lg border border-pink-400 shadow-[0_0_12px_rgba(244,114,182,0.4)] cursor-pointer transition-all font-bold hover:border-pink-300 hover:shadow-[0_0_15px_rgba(244,114,182,0.8)] active:scale-95"
                  title="Buka Search Spotlight (Shortcut: / atau Ctrl+K)"
                >
                  <Search className="w-3.5 h-3.5 text-pink-300" />
                  <span>CARI DATA / CMD [ / ]</span>
                </button>
              </div>
            </div>

            {/* FOKUS KERJA BRE Running Text Box */}
            <div className="w-full" id="header-running-text-box">
              <div className="w-full flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-[#070d1e] via-[#0d1733] to-[#070d1e] border-2 border-amber-400/80 shadow-[0_0_25px_rgba(251,191,36,0.3)] overflow-hidden relative group">
                
                {/* Left Badge: Title & Action to Edit */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 text-amber-300 border border-amber-400 text-xs font-mono font-black shrink-0 shadow-[0_0_12px_rgba(251,191,36,0.4)] z-10">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                  <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
                  <span className="tracking-wider uppercase font-['Orbitron',sans-serif]">{runningTitle}</span>
                  <button
                    type="button"
                    onClick={handleOpenEditTicker}
                    className="ml-1 px-2 py-0.5 rounded bg-amber-400/20 hover:bg-amber-400 hover:text-black text-[10px] text-amber-200 border border-amber-400/60 flex items-center gap-1 transition-all cursor-pointer font-sans font-bold shadow-xs active:scale-95"
                    title="Ubah pesan running text & judul banner"
                    id="btn-edit-running-text"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>UBAH</span>
                  </button>
                </div>

                {/* Continuous Seamless Running Text Track with CSS Gradient Edge Mask */}
                <div 
                  className="overflow-hidden whitespace-nowrap flex-1 relative flex items-center py-1 cursor-pointer [mask-image:linear-gradient(to_right,transparent_0%,black_16px,black_calc(100%-16px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_16px,black_calc(100%-16px),transparent_100%)]"
                  style={{ '--marquee-speed': `${runningSpeed}s` } as React.CSSProperties}
                  onClick={handleOpenEditTicker}
                  title="Klik untuk mengubah teks berjalan"
                >
                  <div className="animate-marquee flex items-center gap-8 text-xs sm:text-sm font-black text-amber-100 font-mono tracking-wide">
                    <span className="inline-flex items-center gap-2">
                      <strong className="text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]">{runningText}</strong>
                    </span>
                    <span className="text-amber-500 font-black">•</span>
                    <span className="inline-flex items-center gap-2 text-cyan-200">
                      <span>NSR014 CINEMA XXI LIPPO MALL PURI</span>
                    </span>
                    <span className="text-amber-500 font-black mr-6">•</span>

                    {/* Duplicate for seamless infinite loop */}
                    <span className="inline-flex items-center gap-2">
                      <strong className="text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]">{runningText}</strong>
                    </span>
                    <span className="text-amber-500 font-black">•</span>
                    <span className="inline-flex items-center gap-2 text-cyan-200">
                      <span>NSR014 CINEMA XXI LIPPO MALL PURI</span>
                    </span>
                    <span className="text-amber-500 font-black mr-6">•</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick System Indicator Bar */}
          <div className="pt-3 border-t border-cyan-500/20 flex flex-wrap items-center justify-center gap-2.5 text-xs font-mono relative z-10" id="header-system-indicator-bar">
            <div className="flex items-center gap-1.5 bg-[#070c1a] px-2.5 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              <span className="font-extrabold tracking-wider">CORE ONLINE</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#070c1a] px-2.5 py-1.5 rounded-lg border border-amber-500/30 text-amber-400 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="font-extrabold tracking-wider">PROJECTOR LINK</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#070c1a] px-2.5 py-1.5 rounded-lg border border-cyan-500/30 text-cyan-400 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="font-extrabold tracking-wider">SERVER CONNECTED</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#070c1a] px-2.5 py-1.5 rounded-lg border border-blue-500/30 text-blue-400 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="font-extrabold tracking-wider">HVAC OK</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#070c1a] px-2.5 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-extrabold tracking-wider">CCTV ACTIVE</span>
            </div>
          </div>

        </div>

        {/* RIGHT PANEL: Executive Realtime Diagnostics Widget */}
        <div className="w-full lg:w-[380px] bg-[#070c1a]/95 border border-cyan-500/30 rounded-xl p-3 flex flex-col justify-between shadow-[0_0_20px_rgba(0,0,0,0.6)] shrink-0 font-mono space-y-2">
          <div className="flex justify-between items-center pb-1.5 border-b border-cyan-500/20 text-xs">
            <span className="font-extrabold text-cyan-300 tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400 drop-shadow-[0_0_8px_#00f0ff]" /> Executive Diagnostics
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
              SYS VER 2.4.0
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 flex-1">
            <div className="bg-[#0e172a] p-2 rounded-lg border border-cyan-500/20 flex flex-col justify-between">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">SUHU RUANG</span>
              <span className="text-base font-black text-cyan-300 font-orbitron my-0.5 block">22.3°C</span>
              <span className="text-[9px] text-emerald-400 font-bold">NORMAL</span>
            </div>

            <div className="bg-[#0e172a] p-2 rounded-lg border border-cyan-500/20 flex flex-col justify-between">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">KELEMBABAN</span>
              <span className="text-base font-black text-sky-300 font-orbitron my-0.5 block">45.9%</span>
              <span className="text-[9px] text-cyan-400 font-bold">OPTIMAL</span>
            </div>

            <div className="bg-[#0e172a] p-2 rounded-lg border border-cyan-500/20 flex flex-col justify-between">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">TEGANGAN MDB</span>
              <span className="text-base font-black text-amber-300 font-orbitron my-0.5 block">221 V AC</span>
              <span className="text-[9px] text-emerald-400 font-bold">STABIL (50 Hz)</span>
            </div>

            <div className="bg-[#0e172a] p-2 rounded-lg border border-cyan-500/20 flex flex-col justify-between">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">BEBAN ARUS</span>
              <span className="text-base font-black text-emerald-300 font-orbitron my-0.5 block">142.4 A</span>
              <span className="text-[9px] text-emerald-400 font-bold">SECURE LVL 01</span>
            </div>

            <div className="bg-[#0e172a] p-2 rounded-lg border border-cyan-500/20 flex flex-col justify-between">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">KAPASITAS UPS</span>
              <span className="text-base font-black text-purple-300 font-orbitron my-0.5 block">98.5%</span>
              <span className="text-[9px] text-purple-400 font-bold">BACKUP 45 MNT</span>
            </div>

            <div className="bg-[#0e172a] p-2 rounded-lg border border-cyan-500/20 flex flex-col justify-between">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">NAS MOVIE STORAGE</span>
              <span className="text-base font-black text-teal-300 font-orbitron my-0.5 block">12.4 TB</span>
              <span className="text-[9px] text-teal-400 font-bold">77.5% KAPASITAS</span>
            </div>
          </div>

          {/* Live System Telemetry Status Bar */}
          <div className="p-2 rounded-lg bg-[#0e172a] border border-cyan-500/20 space-y-1">
            <div className="flex justify-between items-center text-[9px]">
              <span className="text-slate-300 font-bold">BEBAN LISTRIK KANOPIS:</span>
              <span className="text-cyan-300 font-bold">84.6% (LOAD OK)</span>
            </div>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 rounded-full" style={{ width: '84.6%' }} />
            </div>
            <div className="flex justify-between items-center text-[9px] text-slate-400 pt-0.5">
              <span>LATENCY: <strong className="text-emerald-400">14 ms</strong></span>
              <span>KONEKSI: <strong className="text-cyan-300">SECURE_TCP</strong></span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-cyan-500/20 flex items-center justify-between text-[9px] text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> NETWORK ONLINE
            </span>
            <span className="text-cyan-300 font-bold">FASE 380V • UPS ACTIVE</span>
          </div>
        </div>

      </div>
    </div>

      {/* GLOBAL SPOTLIGHT SEARCH DIALOG */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
          {/* Backdrop blur */}
          <div 
            className="fixed inset-0 bg-black/85 backdrop-blur-md cursor-pointer animate-fade-in"
            onClick={() => setIsSearchOpen(false)}
          />
          
          {/* Command HUD Window */}
          <div className="bg-[#070c14]/95 border-2 border-[#00E5FF]/40 rounded-3xl max-w-2xl w-full max-h-[70vh] flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,229,255,0.3)] relative z-10 font-sans text-white animate-scale-up">
            
            {/* Header / Search Input */}
            <div className="p-4 border-b border-white/10 relative flex items-center bg-black/40">
              <Search className="w-5 h-5 text-[#00E5FF] absolute left-5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik perintah, nama alat, area, atau tiket PR... [ESC]"
                className="w-full bg-transparent pl-12 pr-10 py-3 text-sm font-semibold text-white outline-none placeholder:text-zinc-500 font-mono"
              />
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer absolute right-5 top-1/2 -translate-y-1/2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Category Filters inside spotlight */}
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/5 bg-zinc-950/40 overflow-x-auto scrollbar-none text-[10px] font-mono tracking-wider font-bold">
              <span className="text-zinc-500 uppercase mr-1">Filter:</span>
              {(['ALL', 'EQUIPMENT', 'PR', 'VENDOR', 'FILM', 'AREA'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSearchCategory(cat)}
                  className={`px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                    searchCategory === cat
                      ? 'bg-[#00E5FF]/15 border-[#00E5FF]/50 text-[#00E5FF] shadow-[0_0_8px_rgba(0,229,255,0.1)]'
                      : 'border-white/5 hover:border-white/15 text-zinc-400 hover:text-zinc-200 bg-white/[0.02]'
                  }`}
                >
                  {cat === 'ALL' ? 'SEMUA DATA' : cat}
                </button>
              ))}
            </div>

            {/* Viewport for results */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Quick actions shown when search query is short / empty */}
              {searchQuery.trim() === '' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black tracking-widest text-[#00E5FF] uppercase font-mono flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Quick Command Actions
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        onChangeTab?.('pr-engineering');
                        setIsSearchOpen(false);
                      }}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-[#00E5FF]/5 border border-white/5 hover:border-[#00E5FF]/30 transition-all text-left group cursor-pointer animate-slide-in"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-400">
                          <ClipboardList className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-zinc-200 group-hover:text-white font-mono">Buat Tiket PR Baru</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-[#00E5FF] transition-colors" />
                    </button>

                    <button
                      onClick={() => {
                        onChangeTab?.('equipment');
                        setIsSearchOpen(false);
                      }}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-[#00E5FF]/5 border border-white/5 hover:border-[#00E5FF]/30 transition-all text-left group cursor-pointer animate-slide-in"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
                          <Wrench className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-zinc-200 group-hover:text-white font-mono">Daftarkan Alat Baru</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-[#00E5FF] transition-colors" />
                    </button>

                    <button
                      onClick={() => {
                        // Dynamically download backup data
                        try {
                          const data = {
                            areas: JSON.parse(localStorage.getItem('xxi_areas') || '[]'),
                            equipment: JSON.parse(localStorage.getItem('xxi_equipment') || '[]'),
                            pr_engineering: JSON.parse(localStorage.getItem('xxi_pr_engineering') || '[]'),
                            vendors: JSON.parse(localStorage.getItem('xxi_vendors') || '[]'),
                            orders: JSON.parse(localStorage.getItem('xxi_orders') || '[]'),
                            barang_datang: JSON.parse(localStorage.getItem('xxi_barang_datang') || '[]'),
                            riwayat: JSON.parse(localStorage.getItem('xxi_riwayat') || '[]'),
                            film_upload: JSON.parse(localStorage.getItem('xxi_film_upload') || '[]'),
                            weekly_reports: JSON.parse(localStorage.getItem('xxi_weekly_reports') || '[]'),
                            branding: JSON.parse(localStorage.getItem('xxi_branding') || '{}')
                          };
                          const backupJson = JSON.stringify(data, null, 2);
                          const blob = new Blob([backupJson], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `NSR014_Cinema_XXI_Lippo_Mall_Puri_Backup_${new Date().toISOString().slice(0, 10)}.json`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        } catch (e) {
                          console.error(e);
                        }
                        setIsSearchOpen(false);
                      }}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-[#00E5FF]/5 border border-white/5 hover:border-[#00E5FF]/30 transition-all text-left group cursor-pointer animate-slide-in"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400">
                          <Database className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-zinc-200 group-hover:text-white font-mono">Ekspor Backup Database</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-[#00E5FF] transition-colors" />
                    </button>

                    <button
                      onClick={() => {
                        onChangeTab?.('pengaturan');
                        setIsSearchOpen(false);
                      }}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-[#00E5FF]/5 border border-[#00E5FF]/20 hover:border-[#00E5FF]/40 transition-all text-left group cursor-pointer animate-slide-in"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400">
                          <Command className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-zinc-200 group-hover:text-white font-mono">Config Hub &amp; Branding</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-[#00E5FF] transition-colors" />
                    </button>
                  </div>
                </div>
              )}

              {/* Display search results grouped beautifully */}
              <div className="space-y-4 font-mono text-xs">
                
                {/* 🔌 EQUIPMENT CINEMA */}
                {(searchCategory === 'ALL' || searchCategory === 'EQUIPMENT') && equipmentsList.filter(eq => 
                  eq.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
                  (eq.keterangan && eq.keterangan.toLowerCase().includes(searchQuery.trim().toLowerCase()))
                ).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-1 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-blue-400" /> Cinema Equipments ({equipmentsList.filter(eq => eq.name.toLowerCase().includes(searchQuery.trim().toLowerCase())).length})
                    </p>
                    <div className="space-y-1">
                      {equipmentsList.filter(eq => 
                        eq.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
                        (eq.keterangan && eq.keterangan.toLowerCase().includes(searchQuery.trim().toLowerCase()))
                      ).slice(0, 5).map(eq => (
                        <div
                          key={eq.id}
                          onClick={() => {
                            onChangeTab?.('equipment');
                            setIsSearchOpen(false);
                          }}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-colors cursor-pointer"
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="font-bold text-white truncate">{eq.name}</p>
                            <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                              Area: {areasList.find(a => a.id === eq.areaId)?.name || 'MAIN ZONE'} • Qty: {eq.quantity}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                            eq.status === 'Normal'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : eq.status === 'Maintenance'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {eq.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 🎫 PR ENGINEERING TICKETS */}
                {(searchCategory === 'ALL' || searchCategory === 'PR') && prsList.filter(pr => 
                  pr.keluhan.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
                  pr.category.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
                  pr.status.toLowerCase().includes(searchQuery.trim().toLowerCase())
                ).length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-1 flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-rose-400" /> PR Tickets ({prsList.filter(pr => pr.keluhan.toLowerCase().includes(searchQuery.trim().toLowerCase())).length})
                    </p>
                    <div className="space-y-1">
                      {prsList.filter(pr => 
                        pr.keluhan.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
                        pr.category.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
                        pr.status.toLowerCase().includes(searchQuery.trim().toLowerCase())
                      ).slice(0, 5).map(pr => (
                        <div
                          key={pr.id}
                          onClick={() => {
                            onChangeTab?.('pr-engineering');
                            setIsSearchOpen(false);
                          }}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-colors cursor-pointer"
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="font-bold text-white truncate">{pr.keluhan}</p>
                            <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                              {pr.category} • Area: {areasList.find(a => a.id === pr.areaId)?.name || 'MAIN ZONE'} • {pr.tanggalPenemuan}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                            pr.status === 'Selesai'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : pr.status === 'Sedang Diproses'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {pr.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 👥 VENDOR VISIT SCHEDULE */}
                {(searchCategory === 'ALL' || searchCategory === 'VENDOR') && vendorsList.filter(v => 
                  v.namaVendor.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
                  v.namaTeknisi.toLowerCase().includes(searchQuery.trim().toLowerCase())
                ).length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-1 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-400" /> Vendor Visits ({vendorsList.filter(v => v.namaVendor.toLowerCase().includes(searchQuery.trim().toLowerCase())).length})
                    </p>
                    <div className="space-y-1">
                      {vendorsList.filter(v => 
                        v.namaVendor.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
                        v.namaTeknisi.toLowerCase().includes(searchQuery.trim().toLowerCase())
                      ).slice(0, 5).map(v => (
                        <div
                          key={v.id}
                          onClick={() => {
                            onChangeTab?.('vendor-teknisi');
                            setIsSearchOpen(false);
                          }}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-colors cursor-pointer"
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="font-bold text-white truncate">{v.namaVendor}</p>
                            <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                              Teknisi: {v.namaTeknisi} • Area: {areasList.find(a => a.id === v.areaId)?.name || 'MAIN ZONE'} • {v.tanggal}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                            v.status === 'Selesai'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : v.status === 'On Progress'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                          }`}>
                            {v.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 🎬 FILM INTAKE & KDM */}
                {(searchCategory === 'ALL' || searchCategory === 'FILM') && filmsList.filter(f => 
                  f.judul_film.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
                  f.singkatan_film.toLowerCase().includes(searchQuery.trim().toLowerCase())
                ).length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-1 flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-purple-400" /> Film &amp; KDMs ({filmsList.filter(f => f.judul_film.toLowerCase().includes(searchQuery.trim().toLowerCase())).length})
                    </p>
                    <div className="space-y-1">
                      {filmsList.filter(f => 
                        f.judul_film.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
                        f.singkatan_film.toLowerCase().includes(searchQuery.trim().toLowerCase())
                      ).slice(0, 5).map(f => (
                        <div
                          key={f.id}
                          onClick={() => {
                            onChangeTab?.('film-upload');
                            setIsSearchOpen(false);
                          }}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-colors cursor-pointer"
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="font-bold text-white truncate">{f.judul_film}</p>
                            <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                              Format: {f.format_film} • Sound: {f.format_sound} • {f.tanggal_terima}
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                            f.status_tayang === 'SEDANG TAYANG'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : f.status_tayang === 'BELUM TAYANG'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                          }`}>
                            {f.status_tayang}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 📁 AREAS */}
                {(searchCategory === 'ALL' || searchCategory === 'AREA') && areasList.filter(a => 
                  a.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
                ).length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" /> Cinema Areas ({areasList.filter(a => a.name.toLowerCase().includes(searchQuery.trim().toLowerCase())).length})
                    </p>
                    <div className="space-y-1">
                      {areasList.filter(a => 
                        a.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
                      ).slice(0, 5).map(a => (
                        <div
                          key={a.id}
                          onClick={() => {
                            onChangeTab?.('master-area');
                            setIsSearchOpen(false);
                          }}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-colors cursor-pointer"
                        >
                          <span className="font-bold text-white">{a.name}</span>
                          <span className="text-[10px] text-zinc-400 font-bold bg-white/5 px-2 py-0.5 rounded">
                            ID: {a.id}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Results Found */}
                {searchQuery.trim() !== '' && 
                  equipmentsList.filter(eq => eq.name.toLowerCase().includes(searchQuery.trim().toLowerCase())).length === 0 &&
                  prsList.filter(pr => pr.keluhan.toLowerCase().includes(searchQuery.trim().toLowerCase())).length === 0 &&
                  vendorsList.filter(v => v.namaVendor.toLowerCase().includes(searchQuery.trim().toLowerCase())).length === 0 &&
                  filmsList.filter(f => f.judul_film.toLowerCase().includes(searchQuery.trim().toLowerCase())).length === 0 &&
                  areasList.filter(a => a.name.toLowerCase().includes(searchQuery.trim().toLowerCase())).length === 0 && (
                    <div className="p-8 text-center text-zinc-500 space-y-2">
                      <p className="font-bold text-zinc-400">Pencarian tidak ditemukan</p>
                      <p className="text-[10px] leading-normal">
                        Tidak ada data yang cocok dengan kata kunci <span className="text-[#00E5FF] font-bold">"{searchQuery}"</span>. <br />
                        Coba cari nama alat, lokasi area, atau status penanganan lainnya.
                      </p>
                    </div>
                  )
                }

              </div>
            </div>

            {/* Modal Help Footer */}
            <div className="p-3 border-t border-white/15 bg-black/80 flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <span>💡 NAVIGASI INSTAN: KLIK DATA APAPUN UNTUK BERPINDAH LAYAR</span>
              <span className="text-[#00E5FF] font-bold">CINEMA XXI ENGINE • CMD HUD</span>
            </div>

          </div>
        </div>
      )}

      {/* MODAL / DIALOG: EDIT RUNNING TEXT FOKUS KERJA BRE */}
      {isEditingTicker && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsEditingTicker(false)}
        >
          <div 
            className="w-full max-w-2xl bg-[#090e1e] border-2 border-amber-500/80 rounded-2xl shadow-[0_0_50px_rgba(251,191,36,0.35)] overflow-hidden font-sans flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
            id="modal-edit-running-text"
          >
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-b border-amber-500/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.5)]">
                  <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-wide flex items-center gap-2">
                    <span>Ubah Running Text & Banner</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-400/40">
                      LIVE TICKER
                    </span>
                  </h3>
                  <p className="text-xs text-amber-200/70 font-mono">
                    Kustomisasi judul banner dan teks berjalan header realtime
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingTicker(false)}
                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-rose-900/60 border border-slate-700 hover:border-rose-500 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveTicker} className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
              {/* Field 1: Judul Banner */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center justify-between">
                  <span>1. Judul Banner (Badge Kiri)</span>
                  <span className="text-[11px] text-slate-400 font-normal">Contoh: FOKUS KERJA BRE</span>
                </label>
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  placeholder="FOKUS KERJA BRE"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060b17] border border-amber-500/50 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/30 shadow-inner"
                  required
                />
              </div>

              {/* Field 2: Isi Teks Berjalan */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center justify-between">
                  <span>2. Isi Pesan Teks Berjalan (Marquee)</span>
                  <span className="text-[11px] text-slate-400 font-normal">Bisa masukkan emotikon & slogan</span>
                </label>
                <textarea
                  rows={3}
                  value={tempText}
                  onChange={(e) => setTempText(e.target.value)}
                  placeholder="Ketik teks berjalan yang ingin ditampilkan..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#060b17] border border-amber-500/50 text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/30 shadow-inner resize-none leading-relaxed"
                  required
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Pilihan Cepat / Preset Pesan:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTempTitle('FOKUS KERJA BRE');
                      setTempText('🔥 FOKUS KERJA BRE • UTAMAKAN KESELAMATAN & KUALITAS OPERASIONAL CINEMA XXI LIPPO MALL PURI NSR014 • TELITI, CEPAT, TEPAT & PROFESIONAL! 🎬⚡');
                    }}
                    className="p-2.5 rounded-lg bg-slate-900 hover:bg-amber-950/60 border border-slate-800 hover:border-amber-500/50 text-left transition-all cursor-pointer group"
                  >
                    <p className="text-xs font-bold text-amber-300 group-hover:text-amber-200">🔥 Fokus Kerja XXI</p>
                    <p className="text-[10px] text-slate-400 line-clamp-1">Utamakan keselamatan & kualitas...</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTempTitle('SAFETY FIRST');
                      setTempText('⚠️ SAFETY FIRST • SELALU GUNAKAN APD LENGKAP SAAT BEKERJA DI AREA CHILLER, KANOPIS, MEKANIKAL, ELEKTRIKAL & PROYEKSI! 🛡️');
                    }}
                    className="p-2.5 rounded-lg bg-slate-900 hover:bg-amber-950/60 border border-slate-800 hover:border-amber-500/50 text-left transition-all cursor-pointer group"
                  >
                    <p className="text-xs font-bold text-amber-300 group-hover:text-amber-200">🛡️ SOP APD & Keselamatan</p>
                    <p className="text-[10px] text-slate-400 line-clamp-1">Selalu gunakan APD lengkap...</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTempTitle('AUDITORIUM READY');
                      setTempText('🍿 KESIAPAN AUDITORIUM • PASTIKAN TEMPERATUR AC NYAMAN (21-23°C), SUARA SOUND DOLBY CLEAR & VISUAL PROYEKTOR TAJAM! 🎥');
                    }}
                    className="p-2.5 rounded-lg bg-slate-900 hover:bg-amber-950/60 border border-slate-800 hover:border-amber-500/50 text-left transition-all cursor-pointer group"
                  >
                    <p className="text-xs font-bold text-amber-300 group-hover:text-amber-200">🍿 Kesiapan Auditorium</p>
                    <p className="text-[10px] text-slate-400 line-clamp-1">Temperatur AC & Sound Dolby...</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTempTitle('SOLID NSR014');
                      setTempText('⚡ RESPON CEPAT ENGINEERING • SIAP TANGGAP PENANGANAN KELUHAN & PERAWATAN PREVENTIF BERKALA DI SELURUH AREA XXI! 🛠️');
                    }}
                    className="p-2.5 rounded-lg bg-slate-900 hover:bg-amber-950/60 border border-slate-800 hover:border-amber-500/50 text-left transition-all cursor-pointer group"
                  >
                    <p className="text-xs font-bold text-amber-300 group-hover:text-amber-200">⚡ Respon Cepat Maintenance</p>
                    <p className="text-[10px] text-slate-400 line-clamp-1">Siap tanggap penanganan keluhan...</p>
                  </button>
                </div>
              </div>

              {/* Field 3: Kecepatan Teks Berjalan */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center justify-between">
                  <span>3. Kecepatan Gerak Running Text</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {tempSpeed <= 18 ? '⚡ Cepat' : tempSpeed <= 30 ? '⏱️ Normal' : '🐢 Lambat'} ({tempSpeed} detik/putaran)
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTempSpeed(18)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                      tempSpeed === 18
                        ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-500/50'
                    }`}
                  >
                    ⚡ Cepat (18s)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempSpeed(26)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                      tempSpeed === 26
                        ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-500/50'
                    }`}
                  >
                    ⏱️ Standar (26s)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempSpeed(40)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                      tempSpeed === 40
                        ? 'bg-amber-500 text-black border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-500/50'
                    }`}
                  >
                    🐢 Santai (40s)
                  </button>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleResetTicker}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RESET DEFAULT</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingTicker(false)}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono font-bold transition-all cursor-pointer"
                  >
                    BATAL
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-mono font-black text-xs border border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.6)] flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                    id="btn-save-running-text"
                  >
                    <Check className="w-4 h-4" />
                    <span>SIMPAN PERUBAHAN</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Success Notification Toast */}
      {savedSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-amber-500 text-black font-mono font-black text-xs shadow-[0_0_20px_rgba(251,191,36,0.8)] border border-amber-200 flex items-center gap-2 animate-slideIn">
          <Check className="w-4 h-4 text-black" />
          <span>RUNNING TEKS BERHASIL DISIMPAN & DITERAPKAN!</span>
        </div>
      )}

    </>
  );
}
