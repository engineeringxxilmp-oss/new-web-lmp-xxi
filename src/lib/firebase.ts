/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDocFromServer,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import fileConfig from '../../firebase-applet-config.json';

// Read config from Vite environment variables with fallback to firebase-applet-config.json
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : (process.env || {});
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || fileConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || fileConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || fileConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || fileConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || fileConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || fileConfig.appId,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || fileConfig.measurementId,
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with long-polling and multi-tab local cache for robust container and offline operation
function initFirestoreInstance() {
  const dbId = (fileConfig as any).firestoreDatabaseId;
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    }, dbId);
  } catch {
    try {
      return initializeFirestore(app, {
        experimentalForceLongPolling: true,
      }, dbId);
    } catch {
      return getFirestore(app, dbId);
    }
  }
}

export const firestore = initFirestoreInstance();
export const auth = getAuth(app);

// Authenticate anonymously in background if not logged in, ensuring Firestore operations succeed
export const ensureFirebaseAuth = async (): Promise<void> => {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  } catch (error) {
    console.warn('Firebase Anonymous Auth warning:', error);
  }
};

// Validate Firestore connection on boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(firestore, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is offline or network is disconnected.');
    }
    return false;
  }
}
