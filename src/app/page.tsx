'use client';

import Link from 'next/link';
import { useState } from 'react';

const steps = [
  {
    num: '01',
    title: 'Download Your Free Report',
    body: 'Get your free annual credit report from all three bureaus at AnnualCreditReport.com. It takes about 5 minutes.',
  },
  {
    num: '02',
    title: 'Enter Your Information',
    body: 'Provide your name and basic details so we can personalize your dispute letters with accurate information.',
  },
  {
    num: '03',
    title: 'Upload & Analyze',
    body: 'Upload the PDF and our AI reads every line — accounts, balances, payment history, inquiries, and public records.',
  },
  {
    num: '04',
    title: 'Get Your Action Plan',
    body: 'Receive a full credit score overview, itemized errors, a ranked action plan, and ready-to-send dispute letters.',
  },
];

const features = [
  { icon: '📊', title: 'Credit Score Overview', body: 'See scores from all three bureaus with a health rating and trend analysis.' },
  { icon: '🔍', title: 'Error Detection', body: 'Every negative item flagged with the bureau it came from and the law that covers it.' },
  { icon: '📋', title: 'Ranked Action Plan', body: 'Prioritized steps ordered by impact — tackle what matters most first.' },
  { icon: '✉️', title: 'Dispute Letters', body: 'Ready-to-send letters pre-filled with your info, the creditor details, and legal citations.' },
  { icon: '🏦', title: '3-Bureau Coverage', body: 'Equifax, Experian, and TransUnion — we analyze all three simultaneously.' },
  { icon: '⚡', title: 'Instant Results', body: 'Analysis completes in under 60 seconds. No waiting, no appointments.' },
];

const faqs = [
  {
    q: 'Where do I get my credit report?',
    a: 'Visit AnnualCreditReport.com — the only federally authorized free credit report site. You can download all three bureau reports (Equifax, Experian, TransUnion) for free.',
  },
  {
    q: 'Is my personal information safe?',
    a: 'Yes. Your data is never stored on our servers. All analysis happens in real-time and everything is discarded after your session ends. We never log your SSN or personal details.',
  },
  {
    q: 'What format does the PDF need to be in?',
    a: 'Any standard PDF credit report works — including reports downloaded directly from AnnualCreditReport.com or from individual bureau websites.',
  },
  {
    q: 'Do I need to create an account?',
    a: 'No account required to analyze your report and generate dispute letters. Create a free account if you want to save your analysis for future reference.',
  },
  {
    q: 'How accurate is the AI analysis?',
    a: 'The AI reads every line of your report and identifies errors based on FCRA guidelines. Dispute letters cite specific federal laws. We recommend reviewing letters before sending.',
  },
  {
    q: 'How long does the analysis take?',
    a: 'Typically under 60 seconds from upload to full results — credit overview, errors, action plan, and dispute letters.',
  },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <style>{`
        .lp { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; color: #0f1b33; }
        .lp * { box-sizing: border-box; }
        .lp a { text-decoration: none; }
        .lp-nav { position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid #e7ebf2; padding: 0 clamp(20px,5vw,60px); display: flex; align-items: center; justify-content: space-between; height: 64px; }
        .lp-logo { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 17px; color: #0f1b33; }
        .lp-logo-icon { width: 34px; height: 34px; background: #2563eb; border-radius: 9px; display: grid; place-items: center; }
        .lp-nav-cta { background: #2563eb; color: #fff; border: none; border-radius: 9px; padding: 10px 20px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; transition: background 0.15s; }
        .lp-nav-cta:hover { background: #1d4ed8; }
        .lp-hero { background: linear-gradient(135deg, #0f1b33 0%, #1e3a8a 60%, #1d4ed8 100%); color: #fff; text-align: center; padding: clamp(64px,10vw,120px) clamp(20px,5vw,60px); }
        .lp-hero-badge { display: inline-flex; align-items: center; gap: 7px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2); border-radius: 999px; padding: 6px 16px; font-size: 13px; font-weight: 600; margin-bottom: 28px; }
        .lp-hero h1 { font-size: clamp(34px,6vw,68px); font-weight: 800; line-height: 1.1; letter-spacing: -0.03em; margin: 0 0 20px; max-width: 820px; margin-left: auto; margin-right: auto; }
        .lp-hero-sub { font-size: clamp(16px,2vw,20px); color: rgba(255,255,255,0.75); max-width: 560px; margin: 0 auto 36px; line-height: 1.6; }
        .lp-hero-cta { display: inline-block; background: #fff; color: #1d4ed8; border-radius: 12px; padding: 16px 36px; font-size: 17px; font-weight: 800; transition: transform 0.15s, box-shadow 0.15s; box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
        .lp-hero-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.28); }
        .lp-hero-note { margin-top: 16px; font-size: 13px; color: rgba(255,255,255,0.5); }
        .lp-trust { background: #f8faff; border-top: 1px solid #e7ebf2; border-bottom: 1px solid #e7ebf2; padding: 22px clamp(20px,5vw,60px); display: flex; align-items: center; justify-content: center; gap: clamp(20px,4vw,56px); flex-wrap: wrap; }
        .lp-trust-item { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; color: #475569; }
        .lp-trust-dot { width: 8px; height: 8px; border-radius: 50%; background: #16a34a; flex-shrink: 0; }
        .lp-section { padding: clamp(56px,8vw,96px) clamp(20px,5vw,60px); max-width: 1100px; margin: 0 auto; }
        .lp-section-label { font-size: 12px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #2563eb; margin-bottom: 12px; }
        .lp-section-title { font-size: clamp(26px,4vw,42px); font-weight: 800; letter-spacing: -0.025em; color: #0f1b33; margin: 0 0 14px; }
        .lp-section-sub { font-size: 16px; color: #475569; max-width: 520px; line-height: 1.65; margin: 0; }
        .lp-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; margin-top: 48px; }
        .lp-step { background: #fff; border: 1px solid #e7ebf2; border-radius: 18px; padding: 28px 24px; box-shadow: 0 1px 3px rgba(15,27,51,.05); }
        .lp-step-num { font-size: 11px; font-weight: 800; letter-spacing: 0.08em; color: #2563eb; background: #eef3ff; border-radius: 6px; padding: 4px 8px; display: inline-block; margin-bottom: 14px; }
        .lp-step h3 { font-size: 16px; font-weight: 700; color: #0f1b33; margin: 0 0 8px; }
        .lp-step p { font-size: 14px; color: #64748b; line-height: 1.6; margin: 0; }
        .lp-features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; margin-top: 48px; }
        .lp-feature { background: #fff; border: 1px solid #e7ebf2; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(15,27,51,.04); }
        .lp-feature-icon { font-size: 28px; margin-bottom: 12px; }
        .lp-feature h3 { font-size: 15.5px; font-weight: 700; color: #0f1b33; margin: 0 0 6px; }
        .lp-feature p { font-size: 13.5px; color: #64748b; line-height: 1.6; margin: 0; }
        .lp-security { background: linear-gradient(135deg, #0f1b33 0%, #1e3a8a 100%); color: #fff; padding: clamp(56px,8vw,96px) clamp(20px,5vw,60px); text-align: center; }
        .lp-security-inner { max-width: 700px; margin: 0 auto; }
        .lp-security h2 { font-size: clamp(24px,3.5vw,38px); font-weight: 800; letter-spacing: -0.025em; margin: 0 0 14px; }
        .lp-security p { font-size: 15.5px; color: rgba(255,255,255,0.7); line-height: 1.65; margin: 0 0 32px; }
        .lp-security-pills { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
        .lp-security-pill { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.18); border-radius: 999px; padding: 8px 18px; font-size: 13px; font-weight: 600; }
        .lp-audience { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 48px; }
        .lp-audience-card { background: #fff; border: 1px solid #e7ebf2; border-radius: 16px; padding: 22px 20px; }
        .lp-audience-card h3 { font-size: 15px; font-weight: 700; color: #0f1b33; margin: 0 0 6px; }
        .lp-audience-card p { font-size: 13.5px; color: #64748b; line-height: 1.55; margin: 0; }
        .lp-faq { max-width: 720px; margin: 48px auto 0; display: flex; flex-direction: column; gap: 10px; }
        .lp-faq-item { background: #fff; border: 1px solid #e7ebf2; border-radius: 14px; overflow: hidden; }
        .lp-faq-q { width: 100%; background: none; border: none; padding: 18px 20px; font-size: 15px; font-weight: 600; color: #0f1b33; text-align: left; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 12px; font-family: inherit; }
        .lp-faq-q:hover { background: #f8faff; }
        .lp-faq-arrow { color: #2563eb; font-size: 18px; transition: transform 0.2s; flex-shrink: 0; }
        .lp-faq-arrow.open { transform: rotate(45deg); }
        .lp-faq-a { padding: 0 20px 18px; font-size: 14px; color: #475569; line-height: 1.65; }
        .lp-cta-panel { background: #eef3ff; border: 1px solid #d9e4ff; border-radius: 24px; padding: clamp(36px,5vw,60px); text-align: center; margin: clamp(56px,8vw,96px) auto; max-width: 840px; }
        .lp-cta-panel h2 { font-size: clamp(24px,3.5vw,38px); font-weight: 800; letter-spacing: -0.025em; color: #0f1b33; margin: 0 0 12px; }
        .lp-cta-panel p { font-size: 15.5px; color: #475569; margin: 0 0 28px; line-height: 1.6; }
        .lp-cta-btn { display: inline-block; background: #2563eb; color: #fff; border-radius: 12px; padding: 16px 36px; font-size: 17px; font-weight: 800; transition: background 0.15s, transform 0.15s; box-shadow: 0 4px 16px rgba(37,99,235,0.3); }
        .lp-cta-btn:hover { background: #1d4ed8; transform: translateY(-1px); }
        .lp-cta-wrap { padding: 0 clamp(20px,5vw,60px); }
        .lp-footer { background: #0f1b33; color: rgba(255,255,255,0.5); padding: 32px clamp(20px,5vw,60px); text-align: center; font-size: 12.5px; line-height: 1.7; }
        .lp-footer a { color: rgba(255,255,255,0.5); }
        .lp-footer-logo { color: #fff; font-weight: 800; font-size: 15px; margin-bottom: 10px; }
        @media (max-width: 640px) {
          .lp-steps, .lp-features-grid, .lp-audience { grid-template-columns: 1fr; }
          .lp-trust { flex-direction: column; gap: 12px; }
        }
      `}</style>

      <div className="lp">
        {/* Nav */}
        <nav className="lp-nav">
          <div className="lp-logo">
            <div className="lp-logo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            Credit Report AI
          </div>
          <Link href="/analyze" className="lp-nav-cta">Analyze My Report</Link>
        </nav>

        {/* Hero */}
        <section className="lp-hero">
          <div className="lp-hero-badge">
            <span>✨</span> AI-Powered Credit Analysis
          </div>
          <h1>Understand Your Credit.<br />Dispute Errors. Rebuild Fast.</h1>
          <p className="lp-hero-sub">
            Upload your credit report and get an instant AI analysis, error breakdown, ranked action plan, and ready-to-send dispute letters — in under 60 seconds.
          </p>
          <Link href="/analyze" className="lp-hero-cta">Start Free Analysis →</Link>
          <p className="lp-hero-note">No account required · Your data is never stored · Free to use</p>
        </section>

        {/* Trust bar */}
        <div className="lp-trust">
          <div className="lp-trust-item"><div className="lp-trust-dot" /> No data stored</div>
          <div className="lp-trust-item"><div className="lp-trust-dot" /> All 3 bureaus covered</div>
          <div className="lp-trust-item"><div className="lp-trust-dot" /> FCRA-based dispute letters</div>
          <div className="lp-trust-item"><div className="lp-trust-dot" /> Results in under 60 seconds</div>
          <div className="lp-trust-item"><div className="lp-trust-dot" /> No account required</div>
        </div>

        {/* How it works */}
        <div style={{ background: '#f8faff' }}>
          <div className="lp-section">
            <div className="lp-section-label">How It Works</div>
            <h2 className="lp-section-title">Four steps to a better credit score</h2>
            <p className="lp-section-sub">From downloading your report to sending dispute letters — the whole process takes less than 10 minutes.</p>
            <div className="lp-steps">
              {steps.map((s) => (
                <div key={s.num} className="lp-step">
                  <div className="lp-step-num">STEP {s.num}</div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="lp-section">
          <div className="lp-section-label">What You Get</div>
          <h2 className="lp-section-title">Everything you need in one report</h2>
          <p className="lp-section-sub">No guesswork. No generic advice. A full breakdown of your exact credit situation with actionable next steps.</p>
          <div className="lp-features-grid">
            {features.map((f) => (
              <div key={f.title} className="lp-feature">
                <div className="lp-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="lp-security">
          <div className="lp-security-inner">
            <div className="lp-section-label" style={{ color: 'rgba(255,255,255,0.5)' }}>Privacy &amp; Security</div>
            <h2>Your data stays yours</h2>
            <p>
              We never store your credit report, SSN, or personal information. Everything is processed in real-time and discarded the moment your session ends. No database. No account needed.
            </p>
            <div className="lp-security-pills">
              {['Zero data storage', 'No SSN logging', 'Real-time processing', 'Session-only data', 'No third-party sharing', 'HTTPS encrypted'].map((pill) => (
                <span key={pill} className="lp-security-pill">{pill}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Who it's for */}
        <div style={{ background: '#f8faff' }}>
          <div className="lp-section">
            <div className="lp-section-label">Who It&rsquo;s For</div>
            <h2 className="lp-section-title">Built for anyone with a credit report</h2>
            <p className="lp-section-sub">Whether you&rsquo;re rebuilding from scratch or optimizing a good score, the analyzer gives you a clear path forward.</p>
            <div className="lp-audience">
              {[
                { title: 'First-time buyers', body: 'Preparing to apply for a mortgage and want to maximize your score before the application.' },
                { title: 'Rebuilding credit', body: 'Coming back from bankruptcy, collections, or a rough financial period and need a clear starting point.' },
                { title: 'Dispute filers', body: 'You know there are errors on your report and want legally grounded letters to challenge them.' },
                { title: 'Credit curious', body: "You simply want to understand what's on your report and what's helping or hurting your score." },
              ].map((c) => (
                <div key={c.title} className="lp-audience-card">
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ background: '#fff' }}>
          <div className="lp-section">
            <div className="lp-section-label">FAQ</div>
            <h2 className="lp-section-title">Common questions</h2>
            <div className="lp-faq">
              {faqs.map((faq, i) => (
                <div key={i} className="lp-faq-item">
                  <button className="lp-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    {faq.q}
                    <span className={`lp-faq-arrow${openFaq === i ? ' open' : ''}`}>+</span>
                  </button>
                  {openFaq === i && <div className="lp-faq-a">{faq.a}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA panel */}
        <div className="lp-cta-wrap">
          <div className="lp-cta-panel">
            <h2>Ready to see what&rsquo;s on your report?</h2>
            <p>Upload your credit report PDF and get your full analysis, dispute letters, and action plan in under 60 seconds — completely free.</p>
            <Link href="/analyze" className="lp-cta-btn">Analyze My Report — Free →</Link>
            <p style={{ marginTop: 16, fontSize: 13, color: '#94a3b8' }}>No account required · No data stored · Instant results</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="lp-footer">
          <div className="lp-footer-logo">Credit Report AI Analyzer</div>
          <p>
            This tool is for informational purposes only and does not constitute legal or financial advice.<br />
            Dispute letters are generated based on AI analysis of your credit report. Always review before sending.<br />
            Not affiliated with Equifax, Experian, TransUnion, or AnnualCreditReport.com.
          </p>
          <p style={{ marginTop: 12 }}>
            <Link href="/analyze">Analyze My Report</Link> &nbsp;&middot;&nbsp; &copy; {new Date().getFullYear()} Credit Report AI Analyzer
          </p>
        </footer>
      </div>
    </>
  );
}
