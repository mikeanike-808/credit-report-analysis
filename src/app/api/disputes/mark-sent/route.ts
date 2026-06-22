import { auth } from '@clerk/nextjs/server';
import { createDispute, calcExpectedResponseBy, incrementBiteLetterCount } from '@/lib/disputes';
import { createNotification } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const body = await request.json() as {
      bureauKey: string;
      creditor: string;
      accountNumber: string;
      disputeCategory: string;
      sentAt: string;
      biteId?: string;
    };

    const { bureauKey, creditor, accountNumber, disputeCategory, sentAt, biteId } = body;

    if (!bureauKey || !creditor || !sentAt) {
      return Response.json({ success: false, error: 'missing_fields' }, { status: 400 });
    }

    const expectedResponseBy = calcExpectedResponseBy(sentAt);

    const dispute = await createDispute({
      user_id: userId,
      creditor,
      account_number: accountNumber ?? '',
      bureau_key: bureauKey,
      dispute_category: disputeCategory ?? '',
      send_method: 'manual',
      sent_at: new Date(sentAt).toISOString(),
      expected_response_by: expectedResponseBy,
      bite_id: biteId,
    });

    if (biteId) await incrementBiteLetterCount(biteId);

    // Non-fatal but awaited (not fire-and-forget) -- a serverless function
    // can be torn down right after its response is sent, so unawaited
    // background work here would risk silently never running. The dispute
    // is already recorded above, so a notification failure here still
    // shouldn't turn into a 500 for an otherwise-successful mark-as-sent.
    try {
      await createNotification(userId, {
        type: 'letter_mailed',
        title: 'Dispute letter mailed',
        body: `Your letter to ${bureauKey} about ${creditor} is on its way.`,
        link: '/letter-tracking',
      });
    } catch (err) {
      console.error('[disputes/mark-sent] notification error:', err);
    }

    return Response.json({
      success: true,
      data: {
        disputeId: dispute.id,
        expectedResponseBy,
      },
    });
  } catch (error) {
    console.error('[disputes/mark-sent] error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}
