import fs from 'node:fs/promises';

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

const apiKey = env.EXPO_PUBLIC_FIREBASE_API_KEY;
const projectId = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
if (!apiKey || !projectId) throw new Error('Falta configurar mobile/.env');

const email = 'dylan@agroconecta.cl';
const password = 'dylan2026';
const authBase = 'https://identitytoolkit.googleapis.com/v1/accounts';

async function postJson(url, body, token) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

let authResult;
try {
  authResult = await postJson(`${authBase}:signInWithPassword?key=${apiKey}`, { email, password, returnSecureToken: true });
  console.log('AUTH: cuenta demo existente e inicio de sesión correcto');
} catch (error) {
  if (error.message !== 'INVALID_LOGIN_CREDENTIALS') throw error;
  authResult = await postJson(`${authBase}:signUp?key=${apiKey}`, { email, password, returnSecureToken: true });
  console.log('AUTH: cuenta demo creada correctamente');
}

const token = authResult.idToken;
const uid = authResult.localId;
const firestoreBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const headers = { 'content-type': 'application/json', authorization: `Bearer ${token}` };

const profileResponse = await fetch(`${firestoreBase}/users/${uid}?key=${apiKey}`, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({
    fields: {
      name: { stringValue: 'Dylan' },
      email: { stringValue: email },
      role: { stringValue: 'Agricultor' },
      createdAt: { timestampValue: new Date().toISOString() },
    },
  }),
});
if (!profileResponse.ok) throw new Error(`PERFIL: HTTP ${profileResponse.status} ${await profileResponse.text()}`);
console.log('FIRESTORE: perfil demo creado/actualizado');

const postsResponse = await fetch(`${firestoreBase}/posts?key=${apiKey}`, { headers: { authorization: `Bearer ${token}` } });
if (!postsResponse.ok) throw new Error(`FORO: HTTP ${postsResponse.status} ${await postsResponse.text()}`);
const postsData = await postsResponse.json();

for (const item of postsData.documents || []) {
  if (item.fields?.authorId?.stringValue !== uid || item.fields?.authorName?.stringValue === 'Dylan') continue;
  const authorResponse = await fetch(`https://firestore.googleapis.com/v1/${item.name}?updateMask.fieldPaths=authorName&key=${apiKey}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields: { authorName: { stringValue: 'Dylan' } } }),
  });
  if (!authorResponse.ok) throw new Error(`AUTOR: HTTP ${authorResponse.status} ${await authorResponse.text()}`);
}
console.log('FIRESTORE: nombre Dylan aplicado al perfil y consultas demo');
const demoTitle = 'Consulta de demostración: hojas de tomate';
const alreadyExists = (postsData.documents || []).some((item) => item.fields?.title?.stringValue === demoTitle);

if (!alreadyExists) {
  const postResponse = await fetch(`${firestoreBase}/posts?key=${apiKey}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fields: {
        title: { stringValue: demoTitle },
        description: { stringValue: 'Las hojas inferiores presentan manchas amarillas desde hace cuatro días. ¿Qué manejo recomiendan?' },
        category: { stringValue: 'Tomate' },
        authorId: { stringValue: uid },
        authorName: { stringValue: 'Dylan' },
        authorRole: { stringValue: 'Agricultor' },
        createdAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });
  if (!postResponse.ok) throw new Error(`PUBLICAR: HTTP ${postResponse.status} ${await postResponse.text()}`);
  console.log('FORO: consulta demo publicada');
} else {
  console.log('FORO: consulta demo ya existente');
}

const anonymousResponse = await fetch(`${firestoreBase}/posts?key=${apiKey}`);
if (anonymousResponse.status !== 403) throw new Error(`REGLAS: se esperaba HTTP 403 anónimo y se obtuvo ${anonymousResponse.status}`);
console.log('REGLAS: acceso anónimo bloqueado correctamente');
console.log('VERIFICACIÓN FIREBASE COMPLETA');
