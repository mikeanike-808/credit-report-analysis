import { SignIn } from '@clerk/nextjs';

// Catch-all route required by Clerk's embedded <SignIn /> component.
// This is the actual redirect destination for auth.protect() in middleware.ts --
// without a dedicated page like this, signed-out visitors hitting any
// protected route have nowhere to land.
export default function SignInPage() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
      <SignIn />
    </div>
  );
}
