'use client';
import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import LoginPageContent from './components/LoginPageContent';

export default function LoginPage() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  if (!clientId) {
    return <LoginPageContent googleEnabled={false} />;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <LoginPageContent googleEnabled={true} />
    </GoogleOAuthProvider>
  );
}