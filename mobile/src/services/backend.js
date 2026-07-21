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
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
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

function profileForFirebaseUser(firebaseUser, data = {}) {
  if (!firebaseUser) return null;
  return {
    uid: firebaseUser.uid,
    name: data.name || firebaseUser.displayName || 'Usuario',
    email: firebaseUser.email,
    role: data.role || 'Agricultor',
    verified: data.verified === true,
    verificationStatus: data.verificationStatus || (data.role === 'Egresado' ? 'draft' : 'not_required'),
    rut: data.rut || '',
    university: data.university || '',
    degree: data.degree || '',
    graduationYear: data.graduationYear || '',
    degreeFolio: data.degreeFolio || '',
    specialty: data.specialty || '',
    experienceYears: data.experienceYears ?? '',
    contactEmail: data.contactEmail || firebaseUser.email || '',
    professionalDescription: data.professionalDescription || '',
    rejectionReason: data.rejectionReason || '',
    submittedAt: data.submittedAt || null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
  };
}

export function subscribeSession(callback) {
  if (!firebaseConfigured || !auth) {
    callback(null);
    return () => {};
  }
  sessionListeners.add(callback);
  let unsubscribeProfile = () => {};
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    unsubscribeProfile();
    unsubscribeProfile = () => {};
    if (suppressFirebaseSession && firebaseUser) return;
    if (!firebaseUser) {
      callback(null);
      return;
    }
    unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (snapshot) => {
      callback(profileForFirebaseUser(firebaseUser, snapshot.exists() ? snapshot.data() : {}));
    }, async () => {
      await signOut(auth).catch(() => {});
      callback(null);
    });
  });
  return () => {
    sessionListeners.delete(callback);
    unsubscribeProfile();
    unsubscribe();
  };
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
    await setDoc(doc(db, 'users', credential.user.uid), {
      name,
      email: normalized,
      role,
      verified: false,
      verificationStatus: role === 'Egresado' ? 'draft' : 'not_required',
      createdAt: serverTimestamp(),
    });
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

export async function createForumPost({ title, description, category, images = [], user }) {
  requireFirebase();
  const safeImages = images.slice(0, 3);
  const postRef = doc(collection(db, 'posts'));
  const batch = writeBatch(db);

  batch.set(postRef, {
    title,
    description,
    category,
    imageCount: safeImages.length,
    authorId: user.uid,
    authorName: user.name,
    authorRole: user.role,
    createdAt: serverTimestamp(),
  });

  safeImages.forEach((dataUrl, position) => {
    const imageRef = doc(db, 'posts', postRef.id, 'images', `image-${position}`);
    batch.set(imageRef, {
      dataUrl,
      authorId: user.uid,
      position,
      createdAt: serverTimestamp(),
    });
  });

  await batch.commit();
  return postRef.id;
}

export function subscribePostImages(postId, callback, onError = () => {}) {
  if (!firebaseConfigured || !db || !postId) {
    callback([]);
    return () => {};
  }
  const imagesRef = collection(db, 'posts', postId, 'images');
  return onSnapshot(imagesRef, (snapshot) => {
    const images = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    images.sort((left, right) => {
      const leftPosition = Number.isInteger(left.position) ? left.position : 99;
      const rightPosition = Number.isInteger(right.position) ? right.position : 99;
      if (leftPosition !== rightPosition) return leftPosition - rightPosition;
      return (left.createdAt?.seconds || 0) - (right.createdAt?.seconds || 0);
    });
    callback(images);
  }, () => onError(new Error('No fue posible cargar las fotografías de esta consulta.')));
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

export async function submitGraduateProfile({ userId, profile }) {
  requireFirebase();
  const batch = writeBatch(db);
  const userRef = doc(db, 'users', userId);
  const publicProfileRef = doc(db, 'graduateProfiles', userId);

  batch.update(userRef, {
    rut: profile.rut,
    university: profile.university,
    degree: profile.degree,
    graduationYear: profile.graduationYear,
    degreeFolio: profile.degreeFolio,
    specialty: profile.specialty,
    experienceYears: profile.experienceYears,
    contactEmail: profile.contactEmail,
    professionalDescription: profile.professionalDescription,
    verified: false,
    verificationStatus: 'pending',
    rejectionReason: '',
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.delete(publicProfileRef);
  await batch.commit();
}

export function subscribeApprovedGraduates(callback, onError = () => {}) {
  if (!firebaseConfigured || !db) {
    callback([]);
    return () => {};
  }
  const profilesQuery = query(collection(db, 'graduateProfiles'), orderBy('name', 'asc'));
  return onSnapshot(profilesQuery, (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data(), status: 'approved' })));
  }, () => onError(new Error('No fue posible cargar el directorio de egresados.')));
}

export function subscribePendingGraduates(callback, onError = () => {}) {
  if (!firebaseConfigured || !db) {
    callback([]);
    return () => {};
  }
  const pendingQuery = query(collection(db, 'users'), where('verificationStatus', '==', 'pending'));
  return onSnapshot(pendingQuery, (snapshot) => {
    const profiles = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    profiles.sort((left, right) => (left.name || '').localeCompare(right.name || '', 'es'));
    callback(profiles);
  }, () => onError(new Error('No fue posible cargar las solicitudes pendientes.')));
}

export async function reviewGraduateProfile({ profile, approved, reason = '', reviewerId }) {
  requireFirebase();
  const normalizedReason = reason.trim();
  if (!approved && !normalizedReason) {
    throw new Error('Escribe un motivo antes de rechazar la solicitud.');
  }
  if (normalizedReason.length > 180) {
    throw new Error('El motivo no puede superar 180 caracteres.');
  }
  const userRef = doc(db, 'users', profile.id);
  const publicProfileRef = doc(db, 'graduateProfiles', profile.id);

  await runTransaction(db, async (transaction) => {
    const latestSnapshot = await transaction.get(userRef);
    if (!latestSnapshot.exists()) throw new Error('La solicitud ya no existe.');

    const latest = latestSnapshot.data();
    if (latest.verificationStatus !== 'pending') {
      throw new Error('Esta solicitud ya fue revisada o reenviada. Actualiza la lista.');
    }
    if (!latest.rut) {
      throw new Error('La solicitud no incluye RUT. El egresado debe actualizarla y reenviarla.');
    }

    const expected = profile.submittedAt;
    const current = latest.submittedAt;
    const sameSubmission = !!expected
      && !!current
      && expected.seconds === current.seconds
      && expected.nanoseconds === current.nanoseconds;
    if (!sameSubmission) {
      throw new Error('La solicitud cambió mientras la revisabas. Comprueba los datos actualizados.');
    }

    transaction.update(userRef, {
      verified: approved,
      verificationStatus: approved ? 'approved' : 'rejected',
      rejectionReason: approved ? '' : normalizedReason,
      reviewerId,
      reviewedAt: serverTimestamp(),
    });

    if (approved) {
      transaction.set(publicProfileRef, {
        name: latest.name,
        specialty: latest.specialty,
        experienceYears: latest.experienceYears,
        contactEmail: latest.contactEmail,
        summary: latest.professionalDescription,
        verified: true,
        updatedAt: serverTimestamp(),
      });
    } else {
      transaction.delete(publicProfileRef);
    }
  });
}
