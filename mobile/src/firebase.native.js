import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { firebaseApp, firebaseConfigured } from './firebaseCommon';

let auth = null;
if (firebaseConfigured) {
  try {
    auth = initializeAuth(firebaseApp, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    auth = getAuth(firebaseApp);
  }
}

export { auth, firebaseConfigured };
export { db } from './firebaseCommon';
