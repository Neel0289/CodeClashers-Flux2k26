import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'flux2k26'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (projectId ? `${projectId}.firebaseapp.com` : ''),
  projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId,
)

let app = null
let auth = null

if (isFirebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  auth = getAuth(app)
}

export async function getGoogleIdentityToken() {
  if (!auth) {
    throw new Error('Firebase web configuration is missing. Set VITE_FIREBASE_API_KEY and VITE_FIREBASE_APP_ID.')
  }

  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  let result
  try {
    result = await signInWithPopup(auth, provider)
  } catch (error) {
    if (error?.code === 'auth/configuration-not-found') {
      throw new Error(
        'Google Sign-In is not enabled in Firebase Console. Enable Firebase Authentication -> Sign-in method -> Google and add localhost to Authorized domains.',
      )
    }
    throw error
  }

  const idToken = await result.user.getIdToken()

  return {
    idToken,
    email: result.user.email || '',
    displayName: result.user.displayName || '',
  }
}
