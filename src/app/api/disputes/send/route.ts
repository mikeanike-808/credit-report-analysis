import { auth } from '@clerk/nextjs/server';
import { sendCertifiedLetter } from '@/lib/lob';
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
      letterBody: string;
      senderName: string;
      senderAddress: { address: string; city: string; state: string; zip: string };
    };

    const { bureauKey, creditor, accountNumber, disputeCategory, letterBody, senderName, senderAddress } = body;

    if (!bureauKey || !creditor || !letterBody || !senderName || !senderAddress) {
      return Response.json({ success: false, error: 'missing_fields' }, { status: 400 });
    }

    // Never log senderAddress or letterBody — may contain PII
    const { lobLetterId, trackingNumber } = await sendCertifiedLetter(
      bureauKey, senderName, senderAddress, letterBody,
    );

    const sentAt = new Date().toISOString();
    const expectedResponseBy = calcExpectedResponseBy(sentAt);

    const dispute = await createDispute({
      user_id: userId,
      creditor,
      account_number: accountNumber,
      bureau_key: bureauKey,
      dispute_category: disputeCategory,
      send_method: 'auto',
      sent_at: sentAt,
      lob_letter_id: lobLetterId,
      lob_tracking_number: trackingNumber,
      expected_response_by: expectedResponseBy,
    });

    return Response.json({
      success: true,
      data: {
        disputeId: dispute.id,
        trackingNumber,
        expectedResponseBy,
      },
    });
  } catch (error) {
    console.error('[disputes/send] error:', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}
