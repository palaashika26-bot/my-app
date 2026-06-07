'use client';
import React, { Suspense } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import LoginPageContent from './components/LoginPageContent';

export default function LoginPage() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  const content = !clientId
    ? <LoginPageContent googleEnabled={false} />
    : (
      <GoogleOAuthProvider clientId={clientId}>
        <LoginPageContent googleEnabled={true} />
      </GoogleOAuthProvider>
    );

  return <Suspense fallback={null}>{content}</Suspense>;
}