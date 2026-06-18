import { auth } from '@clerk/nextjs/server';
import { createBite, getBitesByUser } from '@/lib/disputes';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const bites = await getBitesByUser(userId);
    return Response.json({ success: true, data: bites });
  } catch (error) {
    console.error('[bites] GET error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

// Starts a new Bite -- called once per Dispute Letters visit, before the first
// letter in that visit is marked sent / auto-mailed, so every letter from the
// same visit attaches to the same dated batch.
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const bite = await createBite(userId);
    return Response.json({ success: true, data: bite });
  } catch (error) {
    console.error('[bites] POST error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}
