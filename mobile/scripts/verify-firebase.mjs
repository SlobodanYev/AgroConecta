import fs from 'node:fs/promises';
import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

const envText = await fs.readFile(new URL('../.env', import.meta.url), 'utf8');
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);

const firebaseConfig = {
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID,
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  projectId: env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
};
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) throw new Error('Falta configurar mobile/.env');

const app = initializeApp(firebaseConfig, `verify-${Date.now()}`);
const auth = getAuth(app);
const db = getFirestore(app);
const email = 'dylan@agroconecta.cl';
const password = 'dylan2026';

let credential;
try {
  credential = await signInWithEmailAndPassword(auth, email, password);
  console.log('AUTH: cuenta demo existente e inicio de sesión correcto');
} catch (error) {
  if (error?.code !== 'auth/invalid-credential') throw error;
  credential = await createUserWithEmailAndPassword(auth, email, password);
  console.log('AUTH: cuenta demo creada correctamente');
}

const uid = credential.user.uid;
const profileRef = doc(db, 'users', uid);
let profileSnapshot = await getDoc(profileRef);
if (!profileSnapshot.exists()) {
  await setDoc(profileRef, {
    name: 'Dylan',
    email,
    role: 'Agricultor',
    verified: false,
    verificationStatus: 'not_required',
    createdAt: serverTimestamp(),
  });
  profileSnapshot = await getDoc(profileRef);
  console.log('FIRESTORE: perfil demo creado');
} else {
  console.log('FIRESTORE: perfil demo existente');
}

const profile = profileSnapshot.data();
const postsSnapshot = await getDocs(collection(db, 'posts'));
const demoTitle = 'Consulta de demostración: hojas de tomate';
let demoPost = postsSnapshot.docs.find((item) => item.data().title === demoTitle);

if (!demoPost) {
  const postRef = await addDoc(collection(db, 'posts'), {
    title: demoTitle,
    description: 'Las hojas inferiores presentan manchas amarillas desde hace cuatro días. ¿Qué manejo recomiendan?',
    category: 'Tomate',
    imageCount: 0,
    authorId: uid,
    authorName: profile.name,
    authorRole: profile.role,
    createdAt: serverTimestamp(),
  });
  demoPost = await getDoc(postRef);
  console.log('FORO: consulta demo publicada');
} else {
  console.log('FORO: consulta demo ya existente');
}

const repliesRef = collection(db, 'posts', demoPost.id, 'replies');
const repliesSnapshot = await getDocs(repliesRef);
const replyBody = 'Respuesta de verificación: revisar humedad del suelo y estado de goteros antes de aplicar productos.';
const replyExists = repliesSnapshot.docs.some((item) => {
  const reply = item.data();
  return reply.body === replyBody && reply.authorId === uid;
});

if (!replyExists) {
  await addDoc(repliesRef, {
    body: replyBody,
    authorId: uid,
    authorName: profile.name,
    authorRole: profile.role,
    authorVerified: profile.role === 'Egresado'
      && profile.verified === true
      && profile.verificationStatus === 'approved',
    createdAt: serverTimestamp(),
  });
  console.log('FORO: respuesta demo publicada');
} else {
  console.log('FORO: respuesta demo ya existente');
}

const firestoreBase = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
const anonymousResponse = await fetch(`${firestoreBase}/posts?key=${firebaseConfig.apiKey}`);
if (anonymousResponse.status !== 403) {
  throw new Error(`REGLAS: se esperaba HTTP 403 anónimo y se obtuvo ${anonymousResponse.status}`);
}
console.log('REGLAS: acceso anónimo bloqueado correctamente');
console.log('VERIFICACIÓN FIREBASE COMPLETA');
process.exit(0);
