import { auth } from '@clerk/nextjs/server';
import { getBitesByUser } from '@/lib/disputes';
import { daysUntilNextRound } from '@/lib/roundCycle';
import { createRoundReadyNotificationIfNeeded } from '@/lib/notifications';

// Called passively by the top bar whenever it renders with the 45-day
// countdown at zero. Re-derives "is it actually ready" server-side rather
// than trusting the client's computation, and the dedupe check inside
// createRoundReadyNotificationIfNeeded() means repeated calls across many
// page loads don't spam duplicate notifications.
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const bites = await getBitesByUser(userId);
    const lastBite = bites[0];
    if (!lastBite) return Response.json({ success: true });

    const days = daysUntilNextRound(lastBite.sent_at);
    if (days === 0) {
      await createRoundReadyNotificationIfNeeded(userId, lastBite.sent_at);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[notifications/round-ready-check] POST error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}
