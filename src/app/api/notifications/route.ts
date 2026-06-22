import { auth } from '@clerk/nextjs/server';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/notifications';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const notifications = await getNotifications(userId);
    return Response.json({ success: true, data: notifications });
  } catch (error) {
    console.error('[notifications] GET error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const body = await request.json() as { id?: unknown };
    if (typeof body.id === 'string') {
      await markNotificationRead(body.id, userId);
    } else {
      await markAllNotificationsRead(userId);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[notifications] PATCH error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}
