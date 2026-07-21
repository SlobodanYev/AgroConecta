import assert from 'node:assert/strict';
import { initializeApp } from 'firebase/app';
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

const projectId = 'demo-agroconecta';
let appCounter = 0;

function databaseFor(uid) {
  const app = initializeApp({ projectId }, `rules-test-${appCounter += 1}`);
  const database = initializeFirestore(app, { experimentalForceLongPolling: true });
  const options = uid ? { mockUserToken: { sub: uid, user_id: uid, email: `${uid}@test.cl` } } : undefined;
  connectFirestoreEmulator(database, '127.0.0.1', 9199, options);
  return database;
}

async function denied(action, label) {
  await assert.rejects(action, (error) => error?.code === 'permission-denied', label);
}

const farmerDb = databaseFor('farmer-1');
const graduateDb = databaseFor('graduate-1');
const intruderDb = databaseFor('intruder-1');
const anonymousDb = databaseFor(null);

await setDoc(doc(farmerDb, 'users', 'farmer-1'), {
  name: 'Agricultor prueba',
  email: 'farmer-1@test.cl',
  role: 'Agricultor',
  verified: false,
  verificationStatus: 'not_required',
  createdAt: serverTimestamp(),
});

await setDoc(doc(graduateDb, 'users', 'graduate-1'), {
  name: 'Egresado prueba',
  email: 'graduate-1@test.cl',
  role: 'Egresado',
  verified: false,
  verificationStatus: 'draft',
  createdAt: serverTimestamp(),
});

await denied(
  () => setDoc(doc(intruderDb, 'users', 'intruder-1'), {
    name: 'Falso administrador',
    email: 'intruder-1@test.cl',
    role: 'Administrador',
    verified: false,
    verificationStatus: 'not_required',
    createdAt: serverTimestamp(),
  }),
  'Un usuario no debe poder registrarse como administrador.',
);

const submitBatch = writeBatch(graduateDb);
submitBatch.update(doc(graduateDb, 'users', 'graduate-1'), {
  rut: '12345678-5',
  university: 'Universidad de Tarapacá',
  degree: 'Ingeniería Agronómica',
  graduationYear: 2022,
  degreeFolio: 'FOLIO-123',
  specialty: 'Riego',
  experienceYears: 3,
  contactEmail: 'graduate-1@test.cl',
  professionalDescription: 'Apoyo en riego tecnificado y uso eficiente del agua.',
  verified: false,
  verificationStatus: 'pending',
  rejectionReason: '',
  submittedAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});
submitBatch.delete(doc(graduateDb, 'graduateProfiles', 'graduate-1'));
await submitBatch.commit();

await denied(
  () => setDoc(doc(graduateDb, 'users', 'graduate-1'), {
    specialty: 'Plagas',
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true }),
  'Un egresado no debe reenviar ni modificar la solicitud mientras está pendiente.',
);

await denied(
  () => getDoc(doc(farmerDb, 'users', 'graduate-1')),
  'Un agricultor no debe leer antecedentes privados de un egresado.',
);

const adminSeedResponse = await fetch(`http://127.0.0.1:9199/v1/projects/${projectId}/databases/(default)/documents/users/admin-1`, {
  method: 'PATCH',
  headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
  body: JSON.stringify({
    fields: {
      name: { stringValue: 'Administrador prueba' },
      email: { stringValue: 'admin-1@test.cl' },
      role: { stringValue: 'Administrador' },
    },
  }),
});
assert.equal(adminSeedResponse.ok, true, 'No fue posible preparar el administrador de prueba.');

const adminDb = databaseFor('admin-1');
const pendingSnapshot = await getDocs(query(collection(adminDb, 'users'), where('verificationStatus', '==', 'pending')));
assert.equal(pendingSnapshot.size, 1, 'El administrador debe ver la solicitud pendiente.');
const privateProfile = { id: pendingSnapshot.docs[0].id, ...pendingSnapshot.docs[0].data() };

await denied(
  () => setDoc(doc(adminDb, 'users', privateProfile.id), {
    verified: true,
    verificationStatus: 'approved',
    rejectionReason: '',
    reviewerId: 'admin-1',
    reviewedAt: serverTimestamp(),
  }, { merge: true }),
  'Una aprobación debe crear la ficha pública en la misma operación.',
);

const mismatchedApproval = writeBatch(adminDb);
mismatchedApproval.update(doc(adminDb, 'users', privateProfile.id), {
  verified: true,
  verificationStatus: 'approved',
  rejectionReason: '',
  reviewerId: 'admin-1',
  reviewedAt: serverTimestamp(),
});
mismatchedApproval.set(doc(adminDb, 'graduateProfiles', privateProfile.id), {
  name: 'Nombre que no corresponde',
  specialty: privateProfile.specialty,
  experienceYears: privateProfile.experienceYears,
  contactEmail: privateProfile.contactEmail,
  summary: privateProfile.professionalDescription,
  verified: true,
  updatedAt: serverTimestamp(),
});
await denied(
  () => mismatchedApproval.commit(),
  'El administrador no debe publicar datos distintos de la solicitud privada.',
);

const approvalBatch = writeBatch(adminDb);
approvalBatch.update(doc(adminDb, 'users', privateProfile.id), {
  verified: true,
  verificationStatus: 'approved',
  rejectionReason: '',
  reviewerId: 'admin-1',
  reviewedAt: serverTimestamp(),
});
approvalBatch.set(doc(adminDb, 'graduateProfiles', privateProfile.id), {
  name: privateProfile.name,
  specialty: privateProfile.specialty,
  experienceYears: privateProfile.experienceYears,
  contactEmail: privateProfile.contactEmail,
  summary: privateProfile.professionalDescription,
  verified: true,
  updatedAt: serverTimestamp(),
});
await approvalBatch.commit();

const publicProfile = await getDoc(doc(farmerDb, 'graduateProfiles', 'graduate-1'));
assert.equal(publicProfile.exists(), true, 'El perfil aprobado debe aparecer en el directorio.');
assert.equal('degreeFolio' in publicProfile.data(), false, 'El directorio no debe exponer el folio privado.');

await denied(
  () => setDoc(doc(graduateDb, 'users', 'graduate-1'), {
    specialty: 'Nutrición',
    verified: false,
    verificationStatus: 'pending',
    rejectionReason: '',
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true }),
  'Al reenviar antecedentes se debe retirar la ficha pública en la misma operación.',
);

const resubmitBatch = writeBatch(graduateDb);
resubmitBatch.update(doc(graduateDb, 'users', 'graduate-1'), {
  specialty: 'Nutrición',
  verified: false,
  verificationStatus: 'pending',
  rejectionReason: '',
  submittedAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});
resubmitBatch.delete(doc(graduateDb, 'graduateProfiles', 'graduate-1'));
await resubmitBatch.commit();
assert.equal((await getDoc(doc(farmerDb, 'graduateProfiles', 'graduate-1'))).exists(), false, 'Al editar, la ficha debe salir del directorio hasta una nueva aprobación.');

await denied(
  () => setDoc(doc(adminDb, 'users', 'graduate-1'), {
    verified: false,
    verificationStatus: 'rejected',
    rejectionReason: '',
    reviewerId: 'admin-1',
    reviewedAt: serverTimestamp(),
  }, { merge: true }),
  'Un rechazo administrativo debe incluir un motivo.',
);

const postRef = doc(collection(farmerDb, 'posts'));
const imageRef = doc(farmerDb, 'posts', postRef.id, 'images', 'image-0');
const postBatch = writeBatch(farmerDb);
postBatch.set(postRef, {
  title: 'Consulta con fotografía',
  description: 'Descripción suficiente para probar la publicación.',
  category: 'Tomate',
  imageCount: 1,
  authorId: 'farmer-1',
  authorName: 'Agricultor prueba',
  authorRole: 'Agricultor',
  createdAt: serverTimestamp(),
});
postBatch.set(imageRef, {
  dataUrl: 'data:image/jpeg;base64,AA==',
  authorId: 'farmer-1',
  position: 0,
  createdAt: serverTimestamp(),
});
await postBatch.commit();

await setDoc(doc(collection(farmerDb, 'posts', postRef.id, 'replies')), {
  body: 'Esta es una respuesta válida de una cuenta agricultora.',
  authorId: 'farmer-1',
  authorName: 'Agricultor prueba',
  authorRole: 'Agricultor',
  authorVerified: false,
  createdAt: serverTimestamp(),
});

await denied(
  () => setDoc(doc(collection(farmerDb, 'posts', postRef.id, 'replies')), {
    body: 'Intento de aparentar una validación inexistente.',
    authorId: 'farmer-1',
    authorName: 'Agricultor prueba',
    authorRole: 'Egresado',
    authorVerified: true,
    createdAt: serverTimestamp(),
  }),
  'Una cuenta no debe poder falsificar su rol ni el distintivo de validación.',
);

await denied(
  () => setDoc(doc(farmerDb, 'posts', postRef.id, 'images', 'image-3'), {
    dataUrl: 'data:image/jpeg;base64,AA==',
    authorId: 'farmer-1',
    position: 3,
    createdAt: serverTimestamp(),
  }),
  'Una consulta no debe aceptar una cuarta fotografía.',
);

await denied(
  () => setDoc(doc(collection(intruderDb, 'posts')), {
    title: 'Autor falso',
    description: 'Intento de publicar con la identidad de otra persona.',
    category: 'Tomate',
    imageCount: 0,
    authorId: 'farmer-1',
    authorName: 'Agricultor prueba',
    authorRole: 'Agricultor',
    createdAt: serverTimestamp(),
  }),
  'No se debe permitir suplantar al autor de una consulta.',
);

await denied(
  () => setDoc(doc(collection(farmerDb, 'posts')), {
    title: 'Rol y nombre falsos',
    description: 'Intento de publicar con datos públicos que no corresponden a la cuenta.',
    category: 'Tomate',
    imageCount: 0,
    authorId: 'farmer-1',
    authorName: 'Otro nombre',
    authorRole: 'Egresado',
    createdAt: serverTimestamp(),
  }),
  'El autor no debe poder falsificar su nombre ni su rol en una consulta.',
);

await denied(
  () => getDocs(collection(anonymousDb, 'posts')),
  'El foro no debe ser legible sin autenticación.',
);

console.log('REGLAS: HU-03, HU-05, privacidad y autenticación verificadas.');
process.exit(0);
