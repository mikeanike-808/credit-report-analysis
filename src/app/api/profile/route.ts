import { auth } from '@clerk/nextjs/server';
import { getProfile, upsertProfile } from '@/lib/profiles';
import type { ProfileAddress } from '@/types';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const profile = await getProfile(userId);
    return Response.json({ success: true, data: profile });
  } catch (error) {
    console.error('[profile] GET error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const body = await request.json() as { dob?: unknown; phone?: unknown; address?: unknown };
    if (typeof body.dob !== 'string' || typeof body.phone !== 'string' || typeof body.address !== 'object' || body.address === null) {
      return Response.json({ success: false, error: 'invalid_profile' }, { status: 400 });
    }

    const saved = await upsertProfile(userId, body.dob, body.phone, body.address as ProfileAddress);
    return Response.json({ success: true, data: saved });
  } catch (error) {
    console.error('[profile] PUT error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}
