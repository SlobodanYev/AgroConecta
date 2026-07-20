import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { auth, db, firebaseConfigured } from '../firebase';

const FAILURES_KEY = 'agroconecta.auth.failures';
const sessionListeners = new Set();
let suppressFirebaseSession = false;

function requireFirebase() {
  if (!firebaseConfigured || !auth || !db) {
    throw new Error('El servicio no está disponible en este momento. Intenta nuevamente más tarde.');
  }
}

const readFailures = async () => {
  try {
    const value = await AsyncStorage.getItem(FAILURES_KEY);
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
};

const writeFailures = (value) => AsyncStorage.setItem(FAILURES_KEY, JSON.stringify(value));

async function profileForFirebaseUser(firebaseUser) {
  if (!firebaseUser) return null;
  const profile = await getDoc(doc(db, 'users', firebaseUser.uid));
  const data = profile.exists() ? profile.data() : {};
  return {
    uid: firebaseUser.uid,
    name: data.name || firebaseUser.displayName || 'Usuario',
    email: firebaseUser.email,
    role: data.role || 'Agricultor',
    verified: data.verified === true,
  };
}

export function subscribeSession(callback) {
  if (!firebaseConfigured || !auth) {
    callback(null);
    return () => {};
  }
  sessionListeners.add(callback);
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (suppressFirebaseSession && firebaseUser) return;
    try {
      callback(await profileForFirebaseUser(firebaseUser));
    } catch {
      callback(null);
    }
  });
  return () => { sessionListeners.delete(callback); unsubscribe(); };
}

async function checkLock(email) {
  const failures = await readFailures();
  const entry = failures[email] || { count: 0, lockedUntil: 0 };
  if (entry.lockedUntil > Date.now()) {
    const minutes = Math.ceil((entry.lockedUntil - Date.now()) / 60000);
    throw new Error(`Cuenta bloqueada. Intenta nuevamente en ${minutes} minuto(s).`);
  }
}

async function recordFailure(email) {
  const failures = await readFailures();
  const entry = failures[email] || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= 5) entry.lockedUntil = Date.now() + 15 * 60 * 1000;
  failures[email] = entry;
  await writeFailures(failures);
}

async function clearFailures(email) {
  const failures = await readFailures();
  failures[email] = { count: 0, lockedUntil: 0 };
  await writeFailures(failures);
}

function friendlyAuthError(error) {
  const code = error?.code || '';
  if (code.includes('email-already-in-use')) return new Error('Este correo ya se encuentra registrado.');
  if (code.includes('invalid-email')) return new Error('El correo electrónico no es válido.');
  if (code.includes('weak-password')) return new Error('La contraseña debe tener al menos 8 caracteres.');
  if (code.includes('invalid-credential') || code.includes('user-not-found') || code.includes('wrong-password')) return new Error('Credenciales incorrectas.');
  if (code.includes('network-request-failed')) return new Error('No hay conexión con Firebase.');
  return new Error(error?.message || 'No fue posible autenticar al usuario.');
}

export async function registerUser({ name, email, password, role }) {
  requireFirebase();
  const normalized = email.trim().toLowerCase();
  try {
    suppressFirebaseSession = true;
    const credential = await createUserWithEmailAndPassword(auth, normalized, password);
    await updateProfile(credential.user, { displayName: name });
    await setDoc(doc(db, 'users', credential.user.uid), { name, email: normalized, role, createdAt: serverTimestamp() });
    await signOut(auth);
    suppressFirebaseSession = false;
    for (const listener of sessionListeners) listener(null);
    return credential.user;
  } catch (error) {
    suppressFirebaseSession = false;
    if (auth?.currentUser) await signOut(auth).catch(() => {});
    throw friendlyAuthError(error);
  }
}

export async function signInUser({ email, password }) {
  requireFirebase();
  const normalized = email.trim().toLowerCase();
  await checkLock(normalized);
  try {
    const credential = await signInWithEmailAndPassword(auth, normalized, password);
    await clearFailures(normalized);
    return credential.user;
  } catch (error) {
    await recordFailure(normalized);
    throw friendlyAuthError(error);
  }
}

export async function signOutUser() {
  requireFirebase();
  return signOut(auth);
}

export function subscribePosts(callback, onError = () => {}) {
  if (!firebaseConfigured || !db) {
    callback([]);
    onError(new Error('Firebase no está configurado.'));
    return () => {};
  }
  const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
  return onSnapshot(postsQuery, (snapshot) => {
    callback(snapshot.docs.map((item) => {
      const data = item.data();
      return { id: item.id, ...data, createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString() };
    }));
  }, () => onError(new Error('No fue posible sincronizar el foro con Firestore.')));
}

/**
 * HU-05: crea una consulta y guarda las URI de sus fotografías.
 * Se utiliza slice(0, 3) como validación adicional para no guardar más de 3 imágenes.
 * En esta versión las URI son locales porque no se utiliza Firebase Storage.
 */
export async function createForumPost({ title, description, category, imageUris = [], user }) {
  requireFirebase();
  await addDoc(collection(db, 'posts'), {
    title,
    description,
    category,
    imageUris: imageUris.slice(0, 3),
    authorId: user.uid,
    authorName: user.name,
    authorRole: user.role,
    createdAt: serverTimestamp(),
  });
}

export function subscribeReplies(postId, callback, onError = () => {}) {
  if (!firebaseConfigured || !db || !postId) {
    callback([]);
    return () => {};
  }
  const repliesQuery = query(collection(db, 'posts', postId, 'replies'), orderBy('createdAt', 'asc'));
  return onSnapshot(repliesQuery, (snapshot) => {
    callback(snapshot.docs.map((item) => {
      const data = item.data();
      const createdAt = data.createdAt?.toDate?.();
      return { id: item.id, ...data, createdAt: createdAt ? createdAt.toISOString() : null };
    }));
  }, () => onError(new Error('No fue posible sincronizar las respuestas del foro.')));
}

export async function createReply({ postId, body, user }) {
  requireFirebase();
  await addDoc(collection(db, 'posts', postId, 'replies'), {
    body,
    authorId: user.uid,
    authorName: user.name,
    authorRole: user.role,
    authorVerified: user.role === 'Egresado' && user.verified === true,
    createdAt: serverTimestamp(),
  });
}
