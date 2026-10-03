/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  StudioProyektorItem,
  EquipmentItem,
  INITIAL_STUDIOS,
  INITIAL_PROYEKTORS
} from '../types/studioProyektor';
import { firestore, ensureFirebaseAuth } from '../lib/firebase';
import {
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot
} from 'firebase/firestore';

const LOCAL_STORAGE_KEY = 'xxi_studio_proyektor_items_v3';
const LOCAL_STORAGE_DELETED_KEY = 'xxi_studio_proyektor_deleted_v3';
const FIRESTORE_COLLECTION = 'studio_proyektor_v3';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function createDefaultItem(name: string, category: 'studio' | 'proyektor', order: number): StudioProyektorItem {
  const slug = slugify(name);
  return {
    id: `${category}-${slug}`,
    category,
    name,
    order,
    image: null,
    catatan: '',
    equipments: [],
    updatedAt: new Date().toISOString()
  };
}

function getDefaultItems(): StudioProyektorItem[] {
  // Empty array: no automatic dummy rooms
  return [];
}

class StudioProyektorService {
  private items: StudioProyektorItem[] = [];
  private deletedIds: Set<string> = new Set();
  private listeners: Set<() => void> = new Set();
  private initialized = false;

  constructor() {
    this.loadDeletedIds();
    this.loadFromCache();
    this.initFirestoreSync();
  }

  private loadDeletedIds() {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_DELETED_KEY);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) {
          this.deletedIds = new Set(arr);
        }
      }
    } catch (e) {
      console.warn('[StudioProyektorService] Deleted IDs load note:', e);
    }
  }

  private saveDeletedIds() {
    try {
      localStorage.setItem(LOCAL_STORAGE_DELETED_KEY, JSON.stringify(Array.from(this.deletedIds)));
    } catch (e) {
      console.warn('[StudioProyektorService] Deleted IDs save note:', e);
    }
  }

  private loadFromCache() {
    try {
      const CLEAN_SLATE_KEY = 'xxi_sp_service_clean_slate_v2';
      if (!localStorage.getItem(CLEAN_SLATE_KEY)) {
        try {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          localStorage.removeItem(LOCAL_STORAGE_DELETED_KEY);
          this.deletedIds = new Set();
        } catch (_) {}
        localStorage.setItem(CLEAN_SLATE_KEY, 'true');
      }

      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out any tombstoned IDs
          this.items = parsed.filter((it: StudioProyektorItem) => !this.deletedIds.has(it.id));
          return;
        }
      }
      this.items = getDefaultItems().filter((it) => !this.deletedIds.has(it.id));
      this.saveToCache();
    } catch (e) {
      console.warn('[StudioProyektorService] Cache load note:', e);
      this.items = getDefaultItems().filter((it) => !this.deletedIds.has(it.id));
    }
  }

  private saveToCache() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.items));
    } catch (e) {
      console.warn('[StudioProyektorService] Local cache save failed:', e);
    }
  }

  private async initFirestoreSync() {
    if (this.initialized) return;
    this.initialized = true;

    try {
      await ensureFirebaseAuth().catch(() => {});
      const colRef = collection(firestore, FIRESTORE_COLLECTION);
      const snapshot = await getDocs(colRef);

      if (!snapshot.empty) {
        const loaded: StudioProyektorItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as StudioProyektorItem;
          const id = data.id || docSnap.id;
          if (!this.deletedIds.has(id)) {
            loaded.push({ ...data, id });
          }
        });
        loaded.sort((a, b) => (a.order || 0) - (b.order || 0));
        this.items = loaded;
        this.saveToCache();
        this.notifyListeners();
      } else {
        // Remote collection is empty: do NOT auto-seed dummy rooms, keep empty clean slate
        this.items = [];
        this.saveToCache();
        this.notifyListeners();
      }

      // Realtime listener
      onSnapshot(
        colRef,
        (snap) => {
          const remoteList: StudioProyektorItem[] = [];
          snap.forEach((d) => {
            const data = d.data() as StudioProyektorItem;
            const id = data.id || d.id;
            if (!this.deletedIds.has(id)) {
              remoteList.push({ ...data, id });
            }
          });
          remoteList.sort((a, b) => (a.order || 0) - (b.order || 0));
          if (remoteList.length > 0 || this.items.length === 0) {
            this.items = remoteList;
            this.saveToCache();
            this.notifyListeners();
          }
        },
        (err) => {
          console.warn('[StudioProyektorService] Realtime sync note:', err);
        }
      );
    } catch (e) {
      console.warn('[StudioProyektorService] Firestore init note:', e);
    }
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

  public getItems(): StudioProyektorItem[] {
    return [...this.items];
  }

  public getStudios(): StudioProyektorItem[] {
    return this.items.filter((i) => i.category === 'studio');
  }

  public getProyektors(): StudioProyektorItem[] {
    return this.items.filter((i) => i.category === 'proyektor');
  }

  public getItemById(id: string): StudioProyektorItem | undefined {
    return this.items.find((i) => i.id === id);
  }

  public async saveItem(item: StudioProyektorItem): Promise<StudioProyektorItem> {
    const updated: StudioProyektorItem = {
      ...item,
      updatedAt: new Date().toISOString()
    };

    // Remove from deleted list if it was re-added
    if (this.deletedIds.has(updated.id)) {
      this.deletedIds.delete(updated.id);
      this.saveDeletedIds();
    }

    const index = this.items.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      this.items = this.items.map((it, idx) => (idx === index ? updated : it));
    } else {
      this.items = [...this.items, updated];
    }

    this.saveToCache();
    this.notifyListeners();

    // Async sync to Firestore with timeout race so UI is never blocked by slow network ACK
    const syncFirestore = async () => {
      try {
        await ensureFirebaseAuth().catch(() => {});
        const docRef = doc(firestore, FIRESTORE_COLLECTION, updated.id);
        await setDoc(docRef, updated);
      } catch (e) {
        console.warn('[StudioProyektorService] Firestore save error:', e);
      }
    };

    await Promise.race([
      syncFirestore(),
      new Promise((resolve) => setTimeout(resolve, 800))
    ]);

    return updated;
  }

  public async deleteItem(id: string): Promise<void> {
    // 1. Add to tombstone set immediately
    this.deletedIds.add(id);
    this.saveDeletedIds();

    // 2. Remove locally immediately
    this.items = this.items.filter((i) => i.id !== id);
    this.saveToCache();
    this.notifyListeners();

    // 3. Delete from Firestore with timeout race
    const syncDelete = async () => {
      try {
        await ensureFirebaseAuth().catch(() => {});
        const docRef = doc(firestore, FIRESTORE_COLLECTION, id);
        await deleteDoc(docRef);
      } catch (e) {
        console.warn('[StudioProyektorService] Firestore delete error:', e);
      }
    };

    await Promise.race([
      syncDelete(),
      new Promise((resolve) => setTimeout(resolve, 800))
    ]);
  }

  public async createNewItem(name: string, category: 'studio' | 'proyektor'): Promise<StudioProyektorItem> {
    const categoryItems = category === 'studio' ? this.getStudios() : this.getProyektors();
    const maxOrder = categoryItems.length > 0 ? Math.max(...categoryItems.map((c) => c.order || 0)) : 0;
    const slug = slugify(name);
    const uniqueSuffix = Date.now().toString(36);
    const id = `${category}-${slug}-${uniqueSuffix}`;

    const newItem: StudioProyektorItem = {
      id,
      category,
      name,
      order: maxOrder + 1,
      image: null,
      catatan: '',
      equipments: [],
      updatedAt: new Date().toISOString()
    };

    await this.saveItem(newItem);
    return newItem;
  }

  public async resetOperationalData(): Promise<void> {
    // Total reset: completely empty all studios & projectors from cache and Firestore
    const previousItems = [...this.items];
    this.items = [];
    this.deletedIds.clear();
    this.saveToCache();
    this.saveDeletedIds();
    this.notifyListeners();

    try {
      await ensureFirebaseAuth().catch(() => {});
      const colRef = collection(firestore, FIRESTORE_COLLECTION);
      const snapshot = await getDocs(colRef);
      const deletePromises: Promise<any>[] = [];

      if (!snapshot.empty) {
        snapshot.docs.forEach((docSnap) => {
          deletePromises.push(deleteDoc(doc(firestore, FIRESTORE_COLLECTION, docSnap.id)).catch(() => {}));
        });
      }
      for (const item of previousItems) {
        deletePromises.push(deleteDoc(doc(firestore, FIRESTORE_COLLECTION, item.id)).catch(() => {}));
      }

      await Promise.allSettled(deletePromises);
    } catch (e) {
      console.warn('[StudioProyektorService] Firestore total reset warning:', e);
    }
  }
}

export const studioProyektorService = new StudioProyektorService();
export default studioProyektorService;
