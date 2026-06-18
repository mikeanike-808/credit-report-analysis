import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import OpenAI from 'openai';
import { auth } from '@clerk/nextjs/server';
import { analyzeReport } from '@/lib/openai';
import { saveAnalysis } from '@/lib/analyses';
import { RequestBodySchema } from '@/lib/schemas';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'auth_required' }, { status: 401 });
    }

    const raw: unknown = await req.json();
    const parseResult = RequestBodySchema.safeParse(raw);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: ' + (parseResult.error.issues[0]?.message ?? 'missing fields') },
        { status: 400 }
      );
    }
    const { pdfText, userInfo } = parseResult.data;

    // ~30k tokens of text; leaves room for system prompt + full response
    const MAX_PDF_CHARS = 120_000;
    if (pdfText.length > MAX_PDF_CHARS) {
      return NextResponse.json(
        { success: false, error: 'Your credit report is too large to process. Try a shorter export or remove non-essential pages.' },
        { status: 422 }
      );
    }

    const validated = await analyzeReport(pdfText, userInfo);

    // Normalize bureau keys to lowercase and ensure primaryBureau is valid.
    // The AI may return "Experian" instead of "experian"; this corrects it deterministically.
    const VALID_BUREAUS = ['experian', 'equifax', 'transunion'];
    const normalizedItems = validated.negativeItems.map((item) => {
      const normalizedBureaus = item.bureaus
        .map((b) => b.toLowerCase())
        .filter((b) => VALID_BUREAUS.includes(b));
      // If normalization emptied the array, default to experian
      const safeBureaus = normalizedBureaus.length > 0 ? normalizedBureaus : ['experian'];
      const normalizedPrimary = item.primaryBureau.toLowerCase();
      // primaryBureau must be a value that actually appears in bureaus[]
      const safePrimary = safeBureaus.includes(normalizedPrimary)
        ? normalizedPrimary
        : safeBureaus[0]!;
      return { ...item, bureaus: safeBureaus, primaryBureau: safePrimary };
    });

    // Override negativeItemCount so it always matches the actual array length.
    // The AI sets this independently and it can drift from negativeItems.length.
    const result = {
      ...validated,
      negativeItems: normalizedItems,
      completedAt: new Date().toISOString(),
      stats: {
        ...validated.stats,
        negativeItemCount: normalizedItems.length,
      },
    };

    await saveAnalysis(userId, userInfo, result);

    return NextResponse.json({ success: true, result });

  } catch (err) {
    if (err instanceof OpenAI.APIError) {
      if (err.status === 401) {
        return NextResponse.json(
          { success: false, error: 'Your OpenAI API key is invalid or has insufficient permissions. Please check it and try again.' },
          { status: 401 }
        );
      }
      if (err.status === 429) {
        const hdrs = err.headers as Record<string, string> | undefined;
        const retryAfter = hdrs?.['retry-after'] ?? hdrs?.['x-ratelimit-reset-requests'];
        const waitMsg = retryAfter
          ? `Please wait ${retryAfter} before trying again.`
          : 'Please wait at least 60 seconds before trying again.';
        return NextResponse.json(
          { success: false, error: `OpenAI rate limit reached. ${waitMsg} If this keeps happening, check your usage at platform.openai.com/usage.` },
          { status: 429 }
        );
      }
      if (err.code === 'context_length_exceeded') {
        return NextResponse.json(
          { success: false, error: 'Your credit report is too long to process. Try uploading a shorter version.' },
          { status: 422 }
        );
      }
    }

    if (err instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: 'The AI returned an unexpected response format. Please try again.' },
        { status: 502 }
      );
    }

    const message = err instanceof Error ? err.message : 'Unexpected server error.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
