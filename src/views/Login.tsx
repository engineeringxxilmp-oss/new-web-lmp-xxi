/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  UserPlus,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  LogIn,
  ShieldAlert,
  UserCheck
} from 'lucide-react';

import bgImage from '../assets/images/cinema_cyber_bg_1786467939994.jpg';

export interface UserAccount {
  username: string;
  password: string;
  name: string;
  nik: string;
  role: string;
  shift: string;
  createdAt?: string;
}

export interface UserSession {
  username: string;
  name: string;
  role: string;
  nik: string;
  shift: string;
  loggedInAt: string;
}

interface LoginProps {
  onLoginSuccess: (user: UserSession) => void;
}

const DEFAULT_ACCOUNTS: UserAccount[] = [
  {
    username: 'chief.engineer',
    password: 'xxi2026',
    name: 'Ir. Ahmad Subagja, S.T.',
    nik: 'XXI-NSR014-001',
    role: 'Chief Engineer',
    shift: 'Non-Shift / Regular'
  },
  {
    username: 'senior.tech',
    password: 'xxi2026',
    name: 'Rudi Hermawan',
    nik: 'XXI-NSR014-008',
    role: 'Senior Technician',
    shift: 'Shift 1 (Pagi)'
  },
  {
    username: 'admin.eng',
    password: 'xxi2026',
    name: 'Siti Rahmawati',
    nik: 'XXI-NSR014-015',
    role: 'Admin Engineering',
    shift: 'Shift 2 (Siang)'
  }
];

export default function Login({ onLoginSuccess }: LoginProps) {
  const [activeMode, setActiveMode] = useState<'LOGIN' | 'REGISTER' | 'RESET'>('LOGIN');

  // Registered Accounts Database State
  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('xxi_registered_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // ignore
      }
    }
    return DEFAULT_ACCOUNTS;
  });

  useEffect(() => {
    localStorage.setItem('xxi_registered_users', JSON.stringify(accounts));
  }, [accounts]);

  // Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Chief Engineer');
  const [shift, setShift] = useState('Non-Shift / Regular');
  const [showPassword, setShowPassword] = useState(false);

  // Status Alerts
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Handle preset quick click
  const handleSelectPreset = (acc: UserAccount) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setRole(acc.role);
    setShift(acc.shift);
    setErrorMsg('');
    setSuccessMsg('');

    // Instant login as selected user
    const sessionData: UserSession = {
      username: acc.username,
      name: acc.name,
      nik: acc.nik,
      role: acc.role,
      shift: acc.shift,
      loggedInAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };
    onLoginSuccess(sessionData);
  };

  // 1. Submit Login Form
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('Username atau NIK harus diisi!');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Password wajib diisi!');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    setTimeout(() => {
      setIsLoading(false);
      const userMatch = accounts.find(
        (a) => a.username.toLowerCase() === username.trim().toLowerCase()
      );

      if (userMatch) {
        if (userMatch.password && userMatch.password !== password) {
          setErrorMsg('Password salah! Silakan coba lagi atau gunakan menu Reset Password.');
          return;
        }

        const sessionData: UserSession = {
          username: userMatch.username,
          name: userMatch.name,
          nik: userMatch.nik,
          role: userMatch.role,
          shift: userMatch.shift,
          loggedInAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        };
        onLoginSuccess(sessionData);
      } else {
        // Fallback auto login for new custom credentials
        const generatedNik = `XXI-NSR014-${Math.floor(100 + Math.random() * 900)}`;
        const sessionData: UserSession = {
          username: username,
          name: fullName.trim() || username.toUpperCase(),
          nik: generatedNik,
          role: role,
          shift: shift,
          loggedInAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        };
        onLoginSuccess(sessionData);
      }
    }, 200);
  };

  // 2. Submit Register (Buat Akun Baru)
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Nama Lengkap wajib diisi!');
      return;
    }
    if (!username.trim()) {
      setErrorMsg('Username wajib diisi!');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Password wajib diisi!');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi Password tidak cocok!');
      return;
    }

    // Check if username already exists
    const existing = accounts.find(a => a.username.toLowerCase() === username.trim().toLowerCase());
    if (existing) {
      setErrorMsg(`Username "${username}" sudah terdaftar! Gunakan username lain atau lakukan Reset Password.`);
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const generatedNik = `XXI-NSR014-${Math.floor(100 + Math.random() * 900)}`;
      const newAccount: UserAccount = {
        username: username.trim().toLowerCase(),
        password: password,
        name: fullName.trim(),
        nik: generatedNik,
        role: role,
        shift: shift,
        createdAt: new Date().toISOString()
      };

      const updatedAccounts = [newAccount, ...accounts];
      setAccounts(updatedAccounts);
      localStorage.setItem('xxi_registered_users', JSON.stringify(updatedAccounts));

      setSuccessMsg(`Akun "${fullName}" berhasil dibuat! Mengalihkan ke dalam aplikasi XXI...`);

      // AUTO LOGIN DIRECTLY INTO APP AS REQUESTED!
      setTimeout(() => {
        const sessionData: UserSession = {
          username: newAccount.username,
          name: newAccount.name,
          nik: newAccount.nik,
          role: newAccount.role,
          shift: newAccount.shift,
          loggedInAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        };
        onLoginSuccess(sessionData);
      }, 500);
    }, 300);
  };

  // 3. Submit Reset Password
  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!username.trim()) {
      setErrorMsg('Masukkan Username atau NIK yang ingin di-reset!');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Password Baru wajib diisi!');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi Password Baru tidak cocok!');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const targetIndex = accounts.findIndex(
        (a) => a.username.toLowerCase() === username.trim().toLowerCase()
      );

      if (targetIndex !== -1) {
        const updated = [...accounts];
        updated[targetIndex].password = password;
        setAccounts(updated);
        localStorage.setItem('xxi_registered_users', JSON.stringify(updated));

        setSuccessMsg(`Password untuk akun "${username}" berhasil diperbarui! Silakan login.`);
        
        // Auto pre-fill login
        setTimeout(() => {
          setActiveMode('LOGIN');
          setPassword(password);
          setErrorMsg('');
        }, 800);
      } else {
        // Create reset user dynamically if not found
        const generatedNik = `XXI-NSR014-${Math.floor(100 + Math.random() * 900)}`;
        const newAcc: UserAccount = {
          username: username.trim().toLowerCase(),
          password: password,
          name: username.toUpperCase(),
          nik: generatedNik,
          role: role,
          shift: shift
        };
        const updated = [newAcc, ...accounts];
        setAccounts(updated);
        localStorage.setItem('xxi_registered_users', JSON.stringify(updated));

        setSuccessMsg(`Akun "${username}" diperbarui dengan password baru!`);
        setTimeout(() => {
          setActiveMode('LOGIN');
        }, 800);
      }
    }, 300);
  };

  return (
    <div className="min-h-screen w-full bg-[#030712] text-white flex flex-col justify-between relative overflow-hidden font-sans selection:bg-cyan-500 selection:text-black">
      {/* Background Image with Dark Vignette Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 transition-transform duration-1000"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      
      {/* Dark Cyber Mesh Overlays for high readability and atmospheric look */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/75 to-slate-950/95 backdrop-blur-[2px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.12)_0%,rgba(3,7,18,0.85)_80%)] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-amber-400 to-fuchsia-500 animate-pulse z-20" />

      {/* Decorative Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00f0ff10_1px,transparent_1px),linear-gradient(to_bottom,#00f0ff10_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none opacity-40" />

      {/* Top Header Bar */}
      <header className="px-6 py-4 border-b border-cyan-500/20 bg-slate-950/80 backdrop-blur-xl flex items-center justify-between relative z-10 shadow-[0_0_20px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-22 rounded-xl bg-cyan-950/80 border-2 border-cyan-400 flex items-center justify-center text-cyan-300 font-black text-sm font-mono shadow-[0_0_15px_rgba(0,240,255,0.5)] shrink-0">
            NSR014
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black text-amber-300 font-sans tracking-wide uppercase drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]">CINEMA XXI</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">LIPPO MALL PURI</span>
            </div>
            <p className="text-xs font-mono text-slate-400 font-semibold">Engineering & Maintenance Control Center</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>SISTEM TERPROTEKSI XXI</span>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-md">
          {/* Main Glass Card with Futuristic Tech Styling */}
          <div className="bg-gradient-to-b from-slate-900/95 via-[#0b132c]/95 to-[#060b1e]/98 backdrop-blur-2xl rounded-3xl border-2 border-cyan-500/40 p-6 sm:p-8 shadow-[0_0_60px_rgba(0,240,255,0.25),0_0_15px_rgba(0,240,255,0.3)] relative overflow-hidden group">
            {/* Corner Tech Accents */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400 rounded-tl-3xl pointer-events-none" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400 rounded-tr-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400 rounded-bl-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400 rounded-br-3xl pointer-events-none" />

            {/* Top Glowing Beam */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#00f0ff]" />

            {/* Header Emblem */}
            <div className="text-center mb-6 relative">
              <div className="relative inline-flex items-center justify-center mb-3">
                <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 opacity-40 blur-lg animate-pulse" />
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-950/90 border-2 border-cyan-400 text-cyan-300 shadow-[0_0_30px_rgba(0,240,255,0.6)]">
                  {activeMode === 'LOGIN' && <Lock className="w-8 h-8 text-cyan-300 animate-pulse" />}
                  {activeMode === 'REGISTER' && <UserPlus className="w-8 h-8 text-amber-300 animate-bounce" />}
                  {activeMode === 'RESET' && <RotateCcw className="w-8 h-8 text-fuchsia-300 animate-spin" />}
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-['Orbitron'] tracking-wider bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent uppercase drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]">
                {activeMode === 'LOGIN' && 'LOGIN OTENTIKASI'}
                {activeMode === 'REGISTER' && 'PENDAFTARAN AKUN XXI'}
                {activeMode === 'RESET' && 'PERBARUI PASSWORD'}
              </h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <p className="text-[11px] font-mono text-cyan-300 font-bold uppercase tracking-widest">
                  {activeMode === 'LOGIN' && 'Sistem Manajemen Teknik NSR014'}
                  {activeMode === 'REGISTER' && 'Buat Akun Petugas Baru'}
                  {activeMode === 'RESET' && 'Reset Kata Sandi Terdaftar'}
                </p>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              </div>
            </div>



            {/* Error Alert */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-bold font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Alert */}
            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold font-mono flex items-center gap-2 animate-pulse">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* ----------------- MODE 1: LOGIN FORM ----------------- */}
            {activeMode === 'LOGIN' && (
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    Username / NIK Petugas <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: chief.engineer"
                    className="w-full rounded-xl border-2 border-slate-700 bg-slate-950/90 px-4 py-2.5 text-sm font-bold text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:outline-hidden transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                    Password Keamanan <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border-2 border-slate-700 bg-slate-950/90 px-4 py-2.5 text-sm font-bold text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 focus:outline-hidden transition-all font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300 cursor-pointer p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 text-black font-black text-sm font-sans tracking-wider uppercase border border-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.5)] hover:shadow-[0_0_30px_rgba(0,240,255,0.8)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>MASUK KE SISTEM NAVIGASI</span>
                      <ArrowRight className="w-4 h-4 text-black" />
                    </>
                  )}
                </button>

                {/* Hidden / Secondary Options Links */}
                <div className="pt-4 mt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono gap-2">
                  <button
                    type="button"
                    onClick={() => { setActiveMode('RESET'); setErrorMsg(''); setSuccessMsg(''); }}
                    className="px-3 py-1.5 rounded-xl bg-fuchsia-950/40 border border-fuchsia-500/30 text-fuchsia-300 hover:text-white hover:border-fuchsia-400 hover:bg-fuchsia-900/60 shadow-[0_0_10px_rgba(217,70,239,0.15)] hover:shadow-[0_0_15px_rgba(217,70,239,0.4)] transition-all flex items-center gap-1.5 cursor-pointer font-bold"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span>Lupa Password?</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveMode('REGISTER'); setErrorMsg(''); setSuccessMsg(''); }}
                    className="px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 hover:text-white hover:border-amber-400 hover:bg-amber-900/60 shadow-[0_0_10px_rgba(251,191,36,0.15)] hover:shadow-[0_0_15px_rgba(251,191,36,0.4)] transition-all flex items-center gap-1.5 cursor-pointer font-bold"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Buat Akun Baru</span>
                  </button>
                </div>
              </form>
            )}

            {/* ----------------- MODE 2: REGISTER FORM ----------------- */}
            {activeMode === 'REGISTER' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono font-black text-amber-300 uppercase tracking-wider">
                    Nama Lengkap Petugas <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full rounded-xl border-2 border-slate-700 bg-slate-950/90 px-3.5 py-2 text-xs font-bold text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-hidden font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono font-black text-amber-300 uppercase tracking-wider">
                    Username Akun Baru <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: budi.tech"
                    className="w-full rounded-xl border-2 border-slate-700 bg-slate-950/90 px-3.5 py-2 text-xs font-bold text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-hidden font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono font-black text-amber-300 uppercase">
                      Password <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border-2 border-slate-700 bg-slate-950/90 px-3 py-2 text-xs font-bold text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-hidden font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono font-black text-amber-300 uppercase">
                      Konfirmasi Password <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border-2 border-slate-700 bg-slate-950/90 px-3 py-2 text-xs font-bold text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-6 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-black font-black text-sm font-sans tracking-wider uppercase border border-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.5)] hover:shadow-[0_0_30px_rgba(251,191,36,0.8)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 text-black" />
                      <span>DAFTAR & LANGSUNG MASUK</span>
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => { setActiveMode('LOGIN'); setErrorMsg(''); setSuccessMsg(''); }}
                    className="text-cyan-400 hover:text-cyan-300 hover:underline text-xs font-mono font-bold cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>← Kembali ke Login</span>
                  </button>
                </div>
              </form>
            )}

            {/* ----------------- MODE 3: RESET PASSWORD FORM ----------------- */}
            {activeMode === 'RESET' && (
              <form onSubmit={handleResetSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-mono font-black text-fuchsia-300 uppercase tracking-wider">
                    Username / NIK Akun <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: chief.engineer"
                    className="w-full rounded-xl border-2 border-slate-700 bg-slate-950/90 px-3.5 py-2 text-xs font-bold text-white placeholder:text-slate-500 focus:border-fuchsia-400 focus:outline-hidden font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono font-black text-fuchsia-300 uppercase tracking-wider">
                    Password Baru <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password baru"
                    className="w-full rounded-xl border-2 border-slate-700 bg-slate-950/90 px-3.5 py-2 text-xs font-bold text-white placeholder:text-slate-500 focus:border-fuchsia-400 focus:outline-hidden font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono font-black text-fuchsia-300 uppercase tracking-wider">
                    Konfirmasi Password Baru <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    className="w-full rounded-xl border-2 border-slate-700 bg-slate-950/90 px-3.5 py-2 text-xs font-bold text-white placeholder:text-slate-500 focus:border-fuchsia-400 focus:outline-hidden font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-6 rounded-xl bg-gradient-to-r from-fuchsia-500 via-pink-600 to-fuchsia-500 text-black font-black text-sm font-sans tracking-wider uppercase border border-fuchsia-200 shadow-[0_0_20px_rgba(217,70,239,0.5)] hover:shadow-[0_0_30px_rgba(217,70,239,0.8)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4 text-black" />
                      <span>PERBARUI PASSWORD</span>
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => { setActiveMode('LOGIN'); setErrorMsg(''); setSuccessMsg(''); }}
                    className="text-cyan-400 hover:text-cyan-300 hover:underline text-xs font-mono font-bold cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>← Kembali ke Login</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="px-6 py-3 border-t border-cyan-500/20 bg-slate-950/80 backdrop-blur-md text-center text-xs font-mono text-slate-400 relative z-10">
        <p className="font-bold">© 2026 PT NUSANTARA SEJAHTERA RAYA Tbk (NSR014 - LIPPO MALL PURI)</p>
        <p className="text-[11px] text-cyan-400 mt-0.5">Sistem Kendali & Logistik Engineering XXI. Hak Cipta Dilindungi.</p>
      </footer>
    </div>
  );
}

