/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// 1. Flexible 3-Panel Dashboard Types (Modern & Flexible)
// ============================================================================

export interface EquipmentItem {
  id: string;
  nama: string;
  merek?: string;
  tipeModel?: string;
  nomorSeri?: string;
  spesifikasi?: string;
  keterangan?: string;
}

export interface StudioProyektorImage {
  id: string;
  dataUrl: string;
  name: string;
  sizeFormatted?: string;
  uploadedAt: string;
}

export interface StudioProyektorItem {
  id: string;
  category: 'studio' | 'proyektor';
  name: string;
  order: number;
  image?: StudioProyektorImage | null;
  catatan?: string;
  equipments: EquipmentItem[];
  updatedAt: string;
}

export const INITIAL_STUDIOS: string[] = [];

export const INITIAL_PROYEKTORS: string[] = [];

export const INITIAL_STUDIO_NAMES: string[] = [];
export const INITIAL_PROYEKTOR_NAMES: string[] = [];

// ============================================================================
// 2. Legacy / Compatibility Types (If referenced by previous modules)
// ============================================================================

export interface DenahGambarItem {
  id: string;
  dataUrl: string;
  name: string;
  sizeFormatted?: string;
  uploadedAt: string;
  applied: boolean;
}

export interface FotoStudioItem {
  id: string;
  dataUrl: string;
  title: string;
  sizeFormatted?: string;
  uploadedAt: string;
  applied: boolean;
}

export interface PerangkatTambahanItem {
  id: string;
  namaPerangkat: string;
  tipeModel: string;
  keterangan: string;
}

export interface StudioLayarSpecs {
  jenisLayar: string;
  merekTipeLayar: string;
  ukuranLebar: string;
  ukuranTinggi: string;
  rasioAspek: string;
  tipeLayar: string;
  motorLayar: string;
  tipeMotorLayar: string;
  kordenLayar: string;
  tipeKordenLayar: string;
  keteranganTambahan: string;
}

export interface StudioSoundSpecs {
  jenisSoundSystem: string;
  merekSoundSystem: string;
  tipeSoundSystem: string;
  prosesor: string;
  tipeProsesor: string;
  dcm: string;
  tipeDcm: string;
  crossover: string;
  tipeCrossover: string;
  monitorSound: string;
  merekTipeMonitorSound: string;
  mainSpeakerDepanKiri: string;
  mainSpeakerDepanKanan: string;
  centerSpeaker: string;
  topSpeaker: string;
  surroundSpeakerKiri: string;
  surroundSpeakerKanan: string;
  backSurroundKiri: string;
  backSurroundKanan: string;
  subwoofer: string;
  keteranganTambahan: string;
}

export interface StudioFasilitasSpecs {
  jumlahBangku: string;
  tipeBangku: string;
  jenisLantai: string;
  jenisDinding: string;
  jenisPlafon: string;
  tipeStudio: string;
  fasilitasTambahan: string;
  keterangan: string;
}

export interface StudioData {
  id: string;
  name: string;
  category: 'studio';
  studioType: 'Regular' | 'Premiere';
  layar: StudioLayarSpecs;
  soundSystem: StudioSoundSpecs;
  fasilitas: StudioFasilitasSpecs;
  denahGambar: DenahGambarItem | null;
  fotoStudio: FotoStudioItem[];
  catatanTambahan: string;
  updatedAt: string;
}

export interface ProyektorSpecs {
  merekProyektor: string;
  seriModelProyektor: string;
  teknologiProyektor: string;
  resolusi: string;
  tipeLensa: string;
  merekLensa: string;
  snMachine: string;
  tipeLampuLaser: string;
  merekLampu: string;
  tipeLampu: string;
  keteranganTambahan: string;
}

export interface ProyektorServerSpecs {
  merekServer: string;
  tipeServer: string;
  snServer: string;
  jenisIms: string;
  modelIms: string;
  kapasitasPenyimpanan: string;
  keteranganTambahan: string;
}

export interface ProyektorPerangkatSpecs {
  panelDimmer: string;
  tipePanelDimmer: string;
  pcKomunikator: string;
  tipePcKomunikator: string;
  ups: string;
  merekTipeUps: string;
  powerSupply: string;
  tipePowerSupply: string;
  lampuLed: string;
  tipeLampuLed: string;
  soundRuangProyektor: string;
  lampuLedTangga: string;
  keteranganTambahan: string;
}

export interface ProyektorData {
  id: string;
  name: string;
  category: 'proyektor';
  studioRef: string;
  proyektor: ProyektorSpecs;
  serverDanSistem: ProyektorServerSpecs;
  perangkatRuangProyektor: ProyektorPerangkatSpecs;
  perangkatTambahan?: PerangkatTambahanItem[];
  fotoPerangkat: FotoStudioItem[];
  catatanTambahan: string;
  updatedAt: string;
}
