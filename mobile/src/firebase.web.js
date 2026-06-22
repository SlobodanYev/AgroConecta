import { getAuth } from 'firebase/auth';
import { firebaseApp, firebaseConfigured } from './firebaseCommon';

export const auth = firebaseConfigured ? getAuth(firebaseApp) : null;
export { firebaseConfigured };
export { db } from './firebaseCommon';
