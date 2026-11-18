import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth, db, googleProvider } from '../config/firebase';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { load, save } from '../services/localStore';

const AuthContext = createContext(null);

// Treat only explicit false / "false" as disabled.
function adminRecordIsActive(data = {}) {
  return data.active !== false && String(data.active ?? 'true').toLowerCase() !== 'false';
}

async function getAdminFlag(fbUser) {
  if (!fbUser) return false;

  // Recommended structure: admins/{AUTH_UID}
  try {
    const byUid = await getDoc(doc(db, 'admins', fbUser.uid));
    if (byUid.exists() && adminRecordIsActive(byUid.data())) return true;
  } catch (error) {
    console.warn('Admin UID lookup failed:', error?.message || error);
  }

  // Also supported: admins/{EMAIL_ADDRESS}
  try {
    if (fbUser.email) {
      const byEmailDoc = await getDoc(doc(db, 'admins', fbUser.email));
      if (byEmailDoc.exists() && adminRecordIsActive(byEmailDoc.data())) return true;
    }
  } catch (error) {
    console.warn('Admin email-document lookup failed:', error?.message || error);
  }

  // Legacy fallback for old auto-ID admin documents that contain an email field.
  // NOTE: this fallback can identify the UI role, but Firestore security rules cannot
  // securely query arbitrary admin docs. For full admin writes, use UID/email as doc ID.
  try {
    if (fbUser.email) {
      const snap = await getDocs(
        query(collection(db, 'admins'), where('email', '==', fbUser.email))
      );
      if (!snap.empty && snap.docs.some((d) => adminRecordIsActive(d.data()))) return true;
    }
  } catch (error) {
    console.warn('Legacy admin email lookup failed:', error?.message || error);
  }

  return false;
}

async function mapFirebaseUser(fbUser) {
  let profile = {};
  let role = 'student';
  let rollNumber = '';
  let name = fbUser.displayName || fbUser.email?.split('@')[0] || 'User';

  try {
    const userSnap = await getDoc(doc(db, 'users', fbUser.uid));
    if (userSnap.exists()) {
      profile = userSnap.data() || {};
      role = profile.role || 'student';
      rollNumber = profile.rollNumber || '';
      name = profile.name || name;
    }
  } catch (error) {
    console.warn('User profile lookup failed:', error?.message || error);
  }

  // Admin collection always wins over a users/{uid}.role value.
  if (await getAdminFlag(fbUser)) role = 'admin';

  // IMPORTANT: profile is spread FIRST. Otherwise profile.role="student"
  // can overwrite the computed admin role.
  return {
    ...profile,
    uid: fbUser.uid,
    name,
    email: fbUser.email || profile.email || '',
    role,
    rollNumber,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => load('currentUser', null));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        save('currentUser', null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const mapped = await mapFirebaseUser(fbUser);
      setUser(mapped);
      save('currentUser', mapped);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const mapped = await mapFirebaseUser(cred.user);
    setUser(mapped);
    save('currentUser', mapped);
    return mapped;
  };

  const register = async ({ name, email, password, rollNumber = '' }) => {
    const cleanEmail = email.trim();
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(
      doc(db, 'users', cred.user.uid),
      {
        uid: cred.user.uid,
        name,
        email: cleanEmail,
        rollNumber,
        role: 'student',
        status: 'active',
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
    return cred.user;
  };

  const loginGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    await setDoc(
      doc(db, 'users', cred.user.uid),
      {
        uid: cred.user.uid,
        name: cred.user.displayName || '',
        email: cred.user.email || '',
        // Do not overwrite an existing admin role here; admin status is resolved separately.
        status: 'active',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    const mapped = await mapFirebaseUser(cred.user);
    setUser(mapped);
    save('currentUser', mapped);
    return mapped;
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    save('currentUser', null);
  };

  const refreshUser = async () => {
    if (!auth.currentUser) return null;
    const mapped = await mapFirebaseUser(auth.currentUser);
    setUser(mapped);
    save('currentUser', mapped);
    return mapped;
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      loginGoogle,
      logout,
      refreshUser,
      isAdmin: user?.role === 'admin',
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
