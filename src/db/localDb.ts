/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { firestoreDb } from './firestoreDb';

// Re-export firestoreDb as primary database across entire application
export const db = firestoreDb;
export default firestoreDb;
