import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import OpenAI from 'openai';
import { analyzeReport } from '@/lib/openai';
import type { UserInfo } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pdfText, userInfo, apiKey } = body as {
      pdfText: string;
      userInfo: UserInfo;
      apiKey: string;
    };

    if (!pdfText || !userInfo || !apiKey) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: pdfText, userInfo, apiKey.' },
        { status: 400 }
      );
    }

    const validated = await analyzeReport(pdfText, userInfo, apiKey);
    const result = { ...validated, completedAt: new Date().toISOString() };
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
        return NextResponse.json(
          { success: false, error: 'Too many requests to the AI service. Please wait a moment and try again.' },
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
