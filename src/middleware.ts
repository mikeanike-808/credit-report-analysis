import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Only the marketing landing page, the sign-in/sign-up pages themselves, and
// Clerk's own routes are public. Everything else -- upload, home, dispute
// letters, history -- requires sign-in.
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mjs)).*)',
    '/__clerk/:path*',
    '/(api|trpc)(.*)',
  ],
};
