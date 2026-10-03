/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  StudioData,
  ProyektorData,
  INITIAL_STUDIO_NAMES,
  INITIAL_PROYEKTOR_NAMES
} from '../types/studioProyektor';
import { firestore } from '../lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot
} from 'firebase/firestore';

const LOCAL_STORAGE_KEY_STUDIOS = 'xxi_sp_studios_v2';
const LOCAL_STORAGE_KEY_PROYEKTORS = 'xxi_sp_proyektors_v2';
const FIRESTORE_COLLECTION_STUDIOS = 'sp_studios';
const FIRESTORE_COLLECTION_PROYEKTORS = 'sp_proyektors';

// Helper to create empty StudioData without assumptions
export function createBlankStudio(name: string, index: number): StudioData {
  const isPremiere = name.toLowerCase().includes('premiere');
  const id = `studio-${isPremiere ? 'p' : ''}${index + 1}`;
  return {
    id,
    name,
    category: 'studio',
    studioType: isPremiere ? 'Premiere' : 'Regular',
    layar: {
      jenisLayar: '',
      merekTipeLayar: '',
      ukuranLebar: '',
      ukuranTinggi: '',
      rasioAspek: '',
      tipeLayar: '',
      motorLayar: '',
      tipeMotorLayar: '',
      kordenLayar: '',
      tipeKordenLayar: '',
      keteranganTambahan: ''
    },
    soundSystem: {
      jenisSoundSystem: '',
      merekSoundSystem: '',
      tipeSoundSystem: '',
      prosesor: '',
      tipeProsesor: '',
      dcm: '',
      tipeDcm: '',
      crossover: '',
      tipeCrossover: '',
      monitorSound: '',
      merekTipeMonitorSound: '',
      mainSpeakerDepanKiri: '',
      mainSpeakerDepanKanan: '',
      centerSpeaker: '',
      topSpeaker: '',
      surroundSpeakerKiri: '',
      surroundSpeakerKanan: '',
      backSurroundKiri: '',
      backSurroundKanan: '',
      subwoofer: '',
      keteranganTambahan: ''
    },
    fasilitas: {
      jumlahBangku: '',
      tipeBangku: '',
      jenisLantai: '',
      jenisDinding: '',
      jenisPlafon: '',
      tipeStudio: isPremiere ? 'Cinema XXI The Premiere' : 'Cinema XXI Deluxe',
      fasilitasTambahan: '',
      keterangan: ''
    },
    denahGambar: null,
    fotoStudio: [],
    catatanTambahan: '',
    updatedAt: new Date().toISOString()
  };
}

// Helper to create empty ProyektorData without assumptions
export function createBlankProyektor(name: string, index: number): ProyektorData {
  const isPremiere = name.toLowerCase().includes('premiere');
  const studioRef = isPremiere ? `Premiere ${index - 7}` : `Studio ${index + 1}`;
  const id = `proyektor-${isPremiere ? 'p' : ''}${index + 1}`;
  return {
    id,
    name,
    category: 'proyektor',
    studioRef,
    proyektor: {
      merekProyektor: '',
      seriModelProyektor: '',
      teknologiProyektor: '',
      resolusi: '',
      tipeLensa: '',
      merekLensa: '',
      snMachine: '',
      tipeLampuLaser: '',
      merekLampu: '',
      tipeLampu: '',
      keteranganTambahan: ''
    },
    serverDanSistem: {
      merekServer: '',
      tipeServer: '',
      snServer: '',
      jenisIms: '',
      modelIms: '',
      kapasitasPenyimpanan: '',
      keteranganTambahan: ''
    },
    perangkatRuangProyektor: {
      panelDimmer: '',
      tipePanelDimmer: '',
      pcKomunikator: '',
      tipePcKomunikator: '',
      ups: '',
      merekTipeUps: '',
      powerSupply: '',
      tipePowerSupply: '',
      lampuLed: '',
      tipeLampuLed: '',
      soundRuangProyektor: '',
      lampuLedTangga: '',
      keteranganTambahan: ''
    },
    perangkatTambahan: [],
    fotoPerangkat: [],
    catatanTambahan: '',
    updatedAt: new Date().toISOString()
  };
}

// Clean slate defaults - no automatic dummy data
function getDefaultStudios(): StudioData[] {
  return [];
}

function getDefaultProyektors(): ProyektorData[] {
  return [];
}

class StudioProyektorDbService {
  private studios: StudioData[] = [];
  private proyektors: ProyektorData[] = [];
  private listeners: Set<() => void> = new Set();
  private initialized = false;

  constructor() {
    this.loadFromCache();
    this.initFirestoreSync();
  }

  private loadFromCache() {
    try {
      const CLEAN_SLATE_KEY = 'xxi_sp_db_clean_slate_v2';
      if (!localStorage.getItem(CLEAN_SLATE_KEY)) {
        try {
          localStorage.removeItem(LOCAL_STORAGE_KEY_STUDIOS);
          localStorage.removeItem(LOCAL_STORAGE_KEY_PROYEKTORS);
          localStorage.removeItem('xxi_sp_studios_v1');
          localStorage.removeItem('xxi_sp_proyektors_v1');
        } catch (_) {}
        localStorage.setItem(CLEAN_SLATE_KEY, 'true');
      }

      const storedStudios = localStorage.getItem(LOCAL_STORAGE_KEY_STUDIOS) || localStorage.getItem('xxi_sp_studios_v1');
      if (storedStudios) {
        const parsed = JSON.parse(storedStudios);
        if (Array.isArray(parsed)) {
          this.studios = parsed;
        } else {
          this.studios = [];
        }
      } else {
        this.studios = [];
      }

      const storedProyektors = localStorage.getItem(LOCAL_STORAGE_KEY_PROYEKTORS) || localStorage.getItem('xxi_sp_proyektors_v1');
      if (storedProyektors) {
        const parsed = JSON.parse(storedProyektors);
        if (Array.isArray(parsed)) {
          this.proyektors = parsed;
        } else {
          this.proyektors = [];
        }
      } else {
        this.proyektors = [];
      }
    } catch (e) {
      console.warn('[StudioProyektorDb] Cache load warning:', e);
      this.studios = [];
      this.proyektors = [];
    }
  }

  private saveStudiosToCache() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_STUDIOS, JSON.stringify(this.studios));
    } catch (e) {
      console.warn('[StudioProyektorDb] Local save studios failed (likely quota with large images):', e);
    }
  }

  private saveProyektorsToCache() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_PROYEKTORS, JSON.stringify(this.proyektors));
    } catch (e) {
      console.warn('[StudioProyektorDb] Local save proyektors failed:', e);
    }
  }

  private async initFirestoreSync() {
    if (this.initialized) return;
    this.initialized = true;

    try {
      // 1. Check & Sync Studios collection
      const studiosColRef = collection(firestore, FIRESTORE_COLLECTION_STUDIOS);
      const studiosSnap = await getDocs(studiosColRef);

      if (!studiosSnap.empty) {
        const loaded: StudioData[] = [];
        studiosSnap.forEach((docSnap) => {
          loaded.push(docSnap.data() as StudioData);
        });
        loaded.sort((a, b) => {
          const idxA = INITIAL_STUDIO_NAMES.indexOf(a.name);
          const idxB = INITIAL_STUDIO_NAMES.indexOf(b.name);
          if (idxA >= 0 && idxB >= 0) return idxA - idxB;
          return a.name.localeCompare(b.name);
        });
        this.studios = loaded;
        this.saveStudiosToCache();
      } else {
        // Clean slate: do not auto-seed dummy studios
        this.studios = [];
        this.saveStudiosToCache();
      }

      // Realtime listener for studios collection
      onSnapshot(studiosColRef, (snapshot) => {
        const updated: StudioData[] = [];
        snapshot.forEach((docSnap) => {
          updated.push(docSnap.data() as StudioData);
        });
        updated.sort((a, b) => {
          const idxA = INITIAL_STUDIO_NAMES.indexOf(a.name);
          const idxB = INITIAL_STUDIO_NAMES.indexOf(b.name);
          if (idxA >= 0 && idxB >= 0) return idxA - idxB;
          return a.name.localeCompare(b.name);
        });
        this.studios = updated;
        this.saveStudiosToCache();
        this.notifyListeners();
      }, (err) => {
        console.warn('[StudioProyektorDb] Studio snapshot error:', err);
      });

      // 2. Check & Sync Proyektors collection
      const proyektorsColRef = collection(firestore, FIRESTORE_COLLECTION_PROYEKTORS);
      const proyektorsSnap = await getDocs(proyektorsColRef);

      if (!proyektorsSnap.empty) {
        const loaded: ProyektorData[] = [];
        proyektorsSnap.forEach((docSnap) => {
          loaded.push(docSnap.data() as ProyektorData);
        });
        loaded.sort((a, b) => {
          const idxA = INITIAL_PROYEKTOR_NAMES.indexOf(a.name);
          const idxB = INITIAL_PROYEKTOR_NAMES.indexOf(b.name);
          if (idxA >= 0 && idxB >= 0) return idxA - idxB;
          return a.name.localeCompare(b.name);
        });
        this.proyektors = loaded;
        this.saveProyektorsToCache();
      } else {
        // Clean slate: do not auto-seed dummy projectors
        this.proyektors = [];
        this.saveProyektorsToCache();
      }

      // Realtime listener for proyektors collection
      onSnapshot(proyektorsColRef, (snapshot) => {
        const updated: ProyektorData[] = [];
        snapshot.forEach((docSnap) => {
          updated.push(docSnap.data() as ProyektorData);
        });
        updated.sort((a, b) => {
          const idxA = INITIAL_PROYEKTOR_NAMES.indexOf(a.name);
          const idxB = INITIAL_PROYEKTOR_NAMES.indexOf(b.name);
          if (idxA >= 0 && idxB >= 0) return idxA - idxB;
          return a.name.localeCompare(b.name);
        });
        this.proyektors = updated;
        this.saveProyektorsToCache();
        this.notifyListeners();
      }, (err) => {
        console.warn('[StudioProyektorDb] Proyektor snapshot error:', err);
      });

      this.notifyListeners();
    } catch (e) {
      console.warn('[StudioProyektorDb] Firestore sync note:', e);
    }
  }

  public async resetAllData(): Promise<void> {
    this.studios = [];
    this.proyektors = [];

    // Clear caches immediately
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY_STUDIOS);
      localStorage.removeItem(LOCAL_STORAGE_KEY_PROYEKTORS);
      localStorage.removeItem('xxi_sp_studios_v1');
      localStorage.removeItem('xxi_sp_proyektors_v1');
    } catch (_) {}

    this.notifyListeners();

    // Delete Firestore docs safely
    try {
      const snapStudios = await getDocs(collection(firestore, FIRESTORE_COLLECTION_STUDIOS));
      if (!snapStudios.empty) {
        await Promise.allSettled(
          snapStudios.docs.map((d) => deleteDoc(doc(firestore, FIRESTORE_COLLECTION_STUDIOS, d.id)))
        );
      }
    } catch (e) {
      console.warn('[StudioProyektorDb] Warn clearing studios:', e);
    }

    try {
      const snapProyektors = await getDocs(collection(firestore, FIRESTORE_COLLECTION_PROYEKTORS));
      if (!snapProyektors.empty) {
        await Promise.allSettled(
          snapProyektors.docs.map((d) => deleteDoc(doc(firestore, FIRESTORE_COLLECTION_PROYEKTORS, d.id)))
        );
      }
    } catch (e) {
      console.warn('[StudioProyektorDb] Warn clearing proyektors:', e);
    }

    this.notifyListeners();
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error(err);
      }
    });
  }

  public getStudios(): StudioData[] {
    return [...this.studios];
  }

  public getProyektors(): ProyektorData[] {
    return [...this.proyektors];
  }

  public getStudioById(id: string): StudioData | undefined {
    return this.studios.find((s) => s.id === id);
  }

  public getProyektorById(id: string): ProyektorData | undefined {
    return this.proyektors.find((p) => p.id === id);
  }

  public async saveStudio(item: StudioData): Promise<void> {
    const updated: StudioData = {
      ...item,
      updatedAt: new Date().toISOString()
    };
    const index = this.studios.findIndex((s) => s.id === item.id);
    if (index >= 0) {
      this.studios[index] = updated;
    } else {
      this.studios.push(updated);
    }

    this.saveStudiosToCache();
    this.notifyListeners();

    // Async save to Firestore document in sp_studios collection
    try {
      const docRef = doc(firestore, FIRESTORE_COLLECTION_STUDIOS, updated.id);
      await setDoc(docRef, updated);
    } catch (e) {
      console.warn('[StudioProyektorDb] Firestore saveStudio warning:', e);
    }
  }

  public async saveProyektor(item: ProyektorData): Promise<void> {
    const updated: ProyektorData = {
      ...item,
      updatedAt: new Date().toISOString()
    };
    const index = this.proyektors.findIndex((p) => p.id === item.id);
    if (index >= 0) {
      this.proyektors[index] = updated;
    } else {
      this.proyektors.push(updated);
    }

    this.saveProyektorsToCache();
    this.notifyListeners();

    // Async save to Firestore document in sp_proyektors collection
    try {
      const docRef = doc(firestore, FIRESTORE_COLLECTION_PROYEKTORS, updated.id);
      await setDoc(docRef, updated);
    } catch (e) {
      console.warn('[StudioProyektorDb] Firestore saveProyektor warning:', e);
    }
  }

  public async deleteStudio(id: string): Promise<void> {
    this.studios = this.studios.filter((s) => s.id !== id);
    this.saveStudiosToCache();
    this.notifyListeners();

    try {
      const docRef = doc(firestore, FIRESTORE_COLLECTION_STUDIOS, id);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn('[StudioProyektorDb] Firestore deleteStudio warning:', e);
    }
  }

  public async deleteProyektor(id: string): Promise<void> {
    this.proyektors = this.proyektors.filter((p) => p.id !== id);
    this.saveProyektorsToCache();
    this.notifyListeners();

    try {
      const docRef = doc(firestore, FIRESTORE_COLLECTION_PROYEKTORS, id);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn('[StudioProyektorDb] Firestore deleteProyektor warning:', e);
    }
  }
}

export const studioProyektorDb = new StudioProyektorDbService();
export default studioProyektorDb;
