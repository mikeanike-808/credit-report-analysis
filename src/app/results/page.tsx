'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Brand } from '@/components/ui/Brand';
import { Icon } from '@/components/ui/Icon';
import { UserButton, SignInButton, SignUpButton, useUser } from '@clerk/nextjs';
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
  const { isSignedIn } = useUser();

  // Redirect to upload page if accessed directly (no result in context)
  useEffect(() => {
    if (!result) router.replace('/analyze');
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
            <button className="btn btn-ghost" style={{ fontSize: 14 }} onClick={() => router.push('/disputes')}>
              <Icon name="fileText" size={15} /> Dispute Letters
            </button>
            <button className="btn btn-ghost" style={{ fontSize: 14 }} onClick={() => router.push('/tracking')}>
              <Icon name="check" size={15} /> Dispute Tracker
            </button>
            <button className="btn btn-ghost" style={{ fontSize: 14 }} onClick={() => router.push('/analyze')}>
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

          {!isSignedIn && (
            <div style={{
              marginBottom: 24,
              border: '1px solid #bbf7d0',
              borderRadius: 16,
              background: 'linear-gradient(135deg, #f0fdf4 0%, #f8faff 100%)',
              padding: 'clamp(20px,3vw,32px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 24,
              flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: '#dcfce7',
                  display: 'grid', placeItems: 'center', flex: 'none',
                }}>
                  <Icon name="shield" size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16.5, color: 'var(--ink)', marginBottom: 4 }}>
                    Save this report & unlock more features
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55, maxWidth: 480 }}>
                    Create a free account to save your analysis, track your credit progress over time, and access premium dispute tools.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <SignUpButton mode="modal">
                  <button className="btn btn-primary" style={{ fontSize: 14, padding: '10px 20px' }}>
                    Create Free Account
                  </button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <button className="btn btn-outline" style={{ fontSize: 14, padding: '10px 20px' }}>
                    Sign In
                  </button>
                </SignInButton>
              </div>
            </div>
          )}

          <CreditOverview scores={result.scores} overall={result.overall} />
          <StrengthsWeaknesses strengths={result.strengths} weaknesses={result.weaknesses} />
          <NegativeItems items={result.negativeItems} />

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, marginBottom: 16 }} className="ap-grid">
            <ActionPlan items={result.actionPlan} />
            <SummaryCard summary={result.summary} stats={result.stats} />
          </div>

          {/* Dispute Letters CTA — prominent link to /disputes */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => router.push('/disputes')}
            onKeyDown={(e) => e.key === 'Enter' && router.push('/disputes')}
            style={{
              marginBottom: 16,
              background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)',
              borderRadius: 18,
              padding: 'clamp(24px,3vw,36px) clamp(22px,3vw,40px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 24,
              flexWrap: 'wrap',
              cursor: 'pointer',
              border: '1px solid #15803d',
              transition: 'box-shadow .18s, transform .18s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 40px rgba(22,163,74,0.25)';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.12)',
                display: 'grid', placeItems: 'center', flex: 'none', color: '#fff',
              }}>
                <Icon name="fileText" size={26} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#fff', marginBottom: 4 }}>
                  View Dispute Letters
                </div>
                <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                  {result.negativeItems.length} negative item{result.negativeItems.length !== 1 ? 's' : ''} — targeted letters for Experian, Equifax &amp; TransUnion, pre-filled with FCRA language.
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#16a34a', color: '#fff',
              borderRadius: 12, padding: '12px 22px',
              fontWeight: 700, fontSize: 14.5, whiteSpace: 'nowrap',
              boxShadow: '0 4px 16px rgba(22,163,74,0.35)',
              flex: 'none',
            }}>
              View Dispute Letters →
            </div>
          </div>

          <DisputeLetters />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 28, color: 'var(--muted)', fontSize: 12.8 }}>
            <Icon name="lock" size={14} /> Your data is never stored. Everything is processed in real-time and discarded after your session.
          </div>
        </div>
      </div>
    </div>
  );
}
