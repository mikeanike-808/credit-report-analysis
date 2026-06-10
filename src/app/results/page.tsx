'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Brand } from '@/components/ui/Brand';
import { Icon } from '@/components/ui/Icon';
import { UserButton } from '@clerk/nextjs';
import { useAnalysis } from '@/context/AnalysisContext';
import { CreditOverview } from '@/components/dashboard/CreditOverview';
import { StrengthsWeaknesses } from '@/components/dashboard/StrengthsWeaknesses';
import { NegativeItems } from '@/components/dashboard/NegativeItems';
import { ActionPlan } from '@/components/dashboard/ActionPlan';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { DisputeLetters } from '@/components/dashboard/DisputeLetters';

export default function ResultsPage() {
  const router = useRouter();
  const { result } = useAnalysis();

  // Redirect to upload page if accessed directly (no result in context)
  useEffect(() => {
    if (!result) router.replace('/');
  }, [result, router]);

  if (!result) return null;

  const completed = new Date(result.completedAt);
  const completedDate = completed.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const completedTime = completed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="page-pad">
      <div className="shell">
        <header className="topbar">
          <Brand />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-ghost" style={{ fontSize: 14 }} onClick={() => router.push('/')}>
              <Icon name="refresh" size={15} /> New Analysis
            </button>
            <UserButton />
          </div>
        </header>

        <div style={{ padding: 'clamp(22px,3vw,36px) clamp(18px,3vw,38px) 44px' }}>
          {/* Page heading */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 26 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 'clamp(26px,3.4vw,34px)', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>
                Analysis Summary
              </h1>
              <p style={{ margin: '7px 0 0', color: 'var(--ink-3)', fontSize: 14.5 }}>
                Review your credit report analysis and recommended actions.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '8px 14px' }}>
              <span style={{ color: 'var(--green)', display: 'grid', placeItems: 'center' }}>
                <Icon name="checkCircle" size={17} />
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--green)' }}>Analysis completed</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{completedDate} &bull; {completedTime}</div>
              </div>
            </div>
          </div>

          <CreditOverview scores={result.scores} overall={result.overall} />
          <StrengthsWeaknesses strengths={result.strengths} weaknesses={result.weaknesses} />
          <NegativeItems items={result.negativeItems} />

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, marginBottom: 16 }} className="ap-grid">
            <ActionPlan items={result.actionPlan} />
            <SummaryCard summary={result.summary} stats={result.stats} />
          </div>

          <DisputeLetters letters={result.disputeLetters} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 28, color: 'var(--muted)', fontSize: 12.8 }}>
            <Icon name="lock" size={14} /> Your data is never stored. Everything is processed in real-time and discarded after your session.
          </div>
        </div>
      </div>
    </div>
  );
}
