
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';

export default function AuthInit() {
  const auth = useAuth();

  useEffect(() => {
    if (auth && !auth.currentUser) {
      signInAnonymously(auth).catch((error) => {
        console.error("Anonymous sign-in failed", error);
      });
    }
  }, [auth]);

  return null;
}
