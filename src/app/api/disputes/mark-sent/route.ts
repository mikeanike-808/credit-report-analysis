import { auth } from '@clerk/nextjs/server';
import { createDispute, calcExpectedResponseBy } from '@/lib/disputes';

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
    };

    const { bureauKey, creditor, accountNumber, disputeCategory, sentAt } = body;

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
    });

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
