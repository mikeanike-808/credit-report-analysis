import { clerkMiddleware } from '@clerk/nextjs/server';

// All routes are public — auth is optional.
// Clerk is still initialized so useUser(), UserButton, SignInButton etc. work everywhere.
export default clerkMiddleware();

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mjs)).*)',
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
};
