import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

const provider = new GoogleAuthProvider();
SCOPES.forEach(scope => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account'
});

// Storage keys for session & token persistence
const STAY_SIGNED_IN_KEY = 'possd_google_stay_signed_in';
const TOKEN_STORAGE_KEY = 'possd_google_oauth_token';
const TOKEN_EXPIRY_KEY = 'possd_google_oauth_expiry';

// Check if user has opted into staying signed in (defaults to true)
export const getStaySignedIn = (): boolean => {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STAY_SIGNED_IN_KEY) !== 'false';
};

// Set stay signed in preference
export const setStaySignedIn = (stay: boolean): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STAY_SIGNED_IN_KEY, stay ? 'true' : 'false');
};

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// In-memory access token cache
let cachedAccessToken: string | null = null;

// Helper to retrieve saved token if valid and not expired
const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const stay = getStaySignedIn();
  const primaryStorage = stay ? localStorage : sessionStorage;
  const secondaryStorage = stay ? sessionStorage : localStorage;

  const token = primaryStorage.getItem(TOKEN_STORAGE_KEY) || secondaryStorage.getItem(TOKEN_STORAGE_KEY);
  const expiry = Number(primaryStorage.getItem(TOKEN_EXPIRY_KEY) || secondaryStorage.getItem(TOKEN_EXPIRY_KEY) || 0);

  if (token && expiry > Date.now()) {
    return token;
  }
  return null;
};

// Helper to save token to appropriate storage
const saveStoredToken = (token: string, stay: boolean) => {
  if (typeof window === 'undefined') return;
  const storage = stay ? localStorage : sessionStorage;
  const otherStorage = stay ? sessionStorage : localStorage;

  // Google OAuth tokens are valid for 1 hour (3600s); store expiry at 55 minutes
  const expiry = Date.now() + 55 * 60 * 1000;
  storage.setItem(TOKEN_STORAGE_KEY, token);
  storage.setItem(TOKEN_EXPIRY_KEY, String(expiry));
  
  // Clean other storage to avoid conflicts
  otherStorage.removeItem(TOKEN_STORAGE_KEY);
  otherStorage.removeItem(TOKEN_EXPIRY_KEY);
};

// Helper to clear all stored tokens
const clearStoredToken = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
};

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken) {
        cachedAccessToken = getStoredToken();
      }

      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // If we don't have the token, let's just get it since the user is authenticated in firebase
        try {
            // Since we need OAuth token and not ID token for Google Sheets, if the token is lost from session, we cannot retrieve the OAuth token from just getIdToken() which is a Firebase JWT.
            // We must prompt the user to re-authenticate or they will be signed out from spreadsheet capability.
            // However, we just return the user for now. Google Sheet writes might fail and prompt re-auth.
            cachedAccessToken = null;
            if (!isSigningIn && onAuthFailure) onAuthFailure();
        } catch (e) {
            if (!isSigningIn && onAuthFailure) onAuthFailure();
        }
      }
    } else {
      cachedAccessToken = null;
      clearStoredToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (
  options?: { staySignedIn?: boolean }
): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const stay = options?.staySignedIn !== undefined ? options.staySignedIn : getStaySignedIn();
    setStaySignedIn(stay);

    // Set Firebase Auth persistence
    try {
      await setPersistence(auth, stay ? browserLocalPersistence : browserSessionPersistence);
    } catch (persistErr) {
      console.warn('Failed to set auth persistence:', persistErr);
    }

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    if (!token) throw new Error('No Google OAuth access token returned');
    cachedAccessToken = token;
    saveStoredToken(cachedAccessToken, stay);

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken || getStoredToken();
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (token) {
    saveStoredToken(token, getStaySignedIn());
  } else {
    clearStoredToken();
  }
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  clearStoredToken();
};
