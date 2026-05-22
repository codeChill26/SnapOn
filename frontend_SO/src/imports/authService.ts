import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

export const registerWithEmail = async (
  email: string,
  password: string
): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  return userCredential.user;
};

export const loginWithEmail = async (
  email: string,
  password: string
): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  return userCredential.user;
};

export const loginWithGoogle = async (): Promise<User> => {
  const userCredential = await signInWithPopup(auth, googleProvider);

  return userCredential.user;
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};

export const getCurrentUserToken = async (): Promise<string | null> => {
  const user = auth.currentUser;

  if (!user) {
    return null;
  }

  return await user.getIdToken();
};