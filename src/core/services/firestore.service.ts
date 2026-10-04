// Ported from gymtrack-web's FirestoreService (src/app/core/services/firestore.service.ts),
// dropping Angular @Injectable/DI in favor of plain exported functions.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  type DocumentData,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

function stripUndefined(data: DocumentData): DocumentData {
  const clean: DocumentData = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      clean[key] = value.map((item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? stripUndefined(item)
          : item
      );
    } else if (value && typeof value === "object") {
      clean[key] = stripUndefined(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export async function getDocument<T>(collectionName: string, docId: string): Promise<T | null> {
  if (!isFirebaseConfigured) return null;
  const snap = await getDoc(doc(db, collectionName, docId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null;
}

export async function setDocument(
  collectionName: string,
  docId: string,
  data: DocumentData,
  merge = true
): Promise<void> {
  if (!isFirebaseConfigured) return;
  await setDoc(doc(db, collectionName, docId), stripUndefined(data), { merge });
}

export async function updateDocument(
  collectionName: string,
  docId: string,
  data: DocumentData
): Promise<void> {
  if (!isFirebaseConfigured) return;
  await updateDoc(doc(db, collectionName, docId), stripUndefined(data));
}

export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  if (!isFirebaseConfigured) return;
  await deleteDoc(doc(db, collectionName, docId));
}

export async function addDocument(collectionName: string, data: DocumentData): Promise<string> {
  if (!isFirebaseConfigured) return "";
  const ref = await addDoc(collection(db, collectionName), stripUndefined(data));
  return ref.id;
}

export async function queryDocuments<T>(
  collectionName: string,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  if (!isFirebaseConfigured) return [];
  const q = query(collection(db, collectionName), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

export function subscribe<T>(
  collectionName: string,
  callback: (docs: T[]) => void,
  ...constraints: QueryConstraint[]
): Unsubscribe {
  if (!isFirebaseConfigured) return () => {};
  const q = query(collection(db, collectionName), ...constraints);
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as T)));
  });
}

export { where, orderBy };
