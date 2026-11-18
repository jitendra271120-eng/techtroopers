import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const timestampToText = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value?.toDate) return value.toDate().toISOString();
  if (value?.seconds) return new Date(value.seconds * 1000).toISOString();
  return String(value);
};

export const normalizeDoc = (snap) => ({ id: snap.id, ...snap.data() });

export async function listCollection(name, options = {}) {
  const { filters = [], order = null } = options;
  const constraints = [];
  filters.forEach(([field, op, value]) => constraints.push(where(field, op, value)));
  if (order?.field) constraints.push(orderBy(order.field, order.direction || 'asc'));
  const ref = constraints.length ? query(collection(db, name), ...constraints) : collection(db, name);
  const snap = await getDocs(ref);
  return snap.docs.map(normalizeDoc);
}

export async function getRecord(name, id) {
  const snap = await getDoc(doc(db, name, id));
  return snap.exists() ? normalizeDoc(snap) : null;
}

export async function addRecord(name, data) {
  const ref = await addDoc(collection(db, name), {
    ...data,
    createdAt: data.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function setRecord(name, id, data, merge = true) {
  await setDoc(doc(db, name, id), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge });
  return id;
}

export async function updateRecord(name, id, data) {
  await updateDoc(doc(db, name, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function removeRecord(name, id) {
  await deleteDoc(doc(db, name, id));
}
