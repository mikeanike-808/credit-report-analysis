// Lob.com certified mail client — server-side only.
// Auto-send is gated behind NEXT_PUBLIC_AUTO_MAIL_ENABLED until Stripe billing is live.

interface LobAddress {
  name: string;
  address_line1: string;
  address_line2?: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country: 'US';
}

interface SendLetterResult {
  lobLetterId: string;
  trackingNumber: string;
}

// Bureau mailing addresses (matches src/lib/bureaus.ts addr field)
const BUREAU_ADDRESSES: Record<string, LobAddress> = {
  experian: {
    name: 'Experian Disputes',
    address_line1: 'P.O. Box 4500',
    address_city: 'Allen',
    address_state: 'TX',
    address_zip: '75013',
    address_country: 'US',
  },
  equifax: {
    name: 'Equifax Disputes',
    address_line1: 'P.O. Box 740256',
    address_city: 'Atlanta',
    address_state: 'GA',
    address_zip: '30374',
    address_country: 'US',
  },
  transunion: {
    name: 'TransUnion Disputes',
    address_line1: 'P.O. Box 2000',
    address_city: 'Chester',
    address_state: 'PA',
    address_zip: '19016',
    address_country: 'US',
  },
};

export async function sendCertifiedLetter(
  bureauKey: string,
  senderName: string,
  senderAddress: {
    address: string;
    city: string;
    state: string;
    zip: string;
  },
  letterBody: string,
): Promise<SendLetterResult> {
  const apiKey = process.env.LOB_API_KEY;
  if (!apiKey) throw new Error('LOB_API_KEY is not configured');

  const toAddress = BUREAU_ADDRESSES[bureauKey];
  if (!toAddress) throw new Error(`Unknown bureau key: ${bureauKey}`);

  const fromAddress: LobAddress = {
    name: senderName,
    address_line1: senderAddress.address,
    address_city: senderAddress.city,
    address_state: senderAddress.state,
    address_zip: senderAddress.zip,
    address_country: 'US',
  };

  // Wrap letter body in minimal HTML for Lob rendering
  const htmlBody = `<html><body><pre style="font-family:Georgia,serif;font-size:11pt;line-height:1.6;white-space:pre-wrap;margin:0">${letterBody.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`;

  const form = new FormData();
  form.append('description', `DisputeGator — ${senderName} → ${toAddress.name}`);
  form.append('to[name]', toAddress.name);
  form.append('to[address_line1]', toAddress.address_line1);
  form.append('to[address_city]', toAddress.address_city);
  form.append('to[address_state]', toAddress.address_state);
  form.append('to[address_zip]', toAddress.address_zip);
  form.append('to[address_country]', toAddress.address_country);
  form.append('from[name]', fromAddress.name);
  form.append('from[address_line1]', fromAddress.address_line1);
  form.append('from[address_city]', fromAddress.address_city);
  form.append('from[address_state]', fromAddress.address_state);
  form.append('from[address_zip]', fromAddress.address_zip);
  form.append('from[address_country]', fromAddress.address_country);
  form.append('file', htmlBody);
  form.append('color', 'false');
  form.append('extra_service', 'certified');

  const res = await fetch('https://api.lob.com/v1/letters', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
    },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Lob API error ${res.status}: ${err}`);
  }

  const json = await res.json() as { id: string; tracking_number?: string };
  return {
    lobLetterId: json.id,
    trackingNumber: json.tracking_number ?? '',
  };
}
