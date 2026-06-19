'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalysis } from '@/context/AnalysisContext';
import type { AnalysisRecord } from '@/types';

// AnalysisContext only lives in memory, so a refresh wipes it even though the
// user is signed in and has a saved analysis. This recovers it from
// /api/analyses/latest before falling back to redirecting to /upload --
// used by /home and /dispute-letters instead of redirecting unconditionally.
export function useEnsureAnalysis(): { ready: boolean } {
  const router = useRouter();
  const { result, setResult } = useAnalysis();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (result) {
      setChecked(true);
      return;
    }

    let cancelled = false;
    fetch('/api/analyses/latest')
      .then((r) => r.json())
      .then((data: { success: boolean; data?: AnalysisRecord | null }) => {
        if (cancelled) return;
        if (data.success && data.data) {
          setResult(data.data.result, data.data.user_info, data.data.id, data.data.completed_actions ?? []);
          setChecked(true);
        } else {
          router.replace('/upload');
        }
      })
      .catch(() => {
        if (!cancelled) router.replace('/upload');
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  return { ready: result !== null || checked };
}
