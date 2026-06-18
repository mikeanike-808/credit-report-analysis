import { SignUp } from '@clerk/nextjs';

// Catch-all route required by Clerk's embedded <SignUp /> component.
export default function SignUpPage() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
      <SignUp />
    </div>
  );
}
