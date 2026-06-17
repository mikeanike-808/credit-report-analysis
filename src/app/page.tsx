'use client';

import Link from 'next/link';
import { useState } from 'react';

const steps = [
  {
    num: '01',
    title: 'Get Your Free Credit Report',
    body: 'Sign up free at SmartCredit to get your tri-bureau report instantly, or download it from AnnualCreditReport.com. Either way, it takes under 5 minutes.',
    cta: { label: 'Get Free Report at SmartCredit →', href: 'https://www.smartcredit.com/join/?pid=78020' },
  },
  {
    num: '02',
    title: 'Enter Your Information',
    body: 'Provide your name and basic details so we can personalize your dispute letters with accurate, legally compliant information.',
  },
  {
    num: '03',
    title: 'Upload & Analyze',
    body: 'Upload the PDF and our AI reads every line — accounts, balances, payment history, inquiries, public records, and FCRA violation signals.',
  },
  {
    num: '04',
    title: 'Get Your Action Plan',
    body: 'Receive a full credit overview, itemized negative items with dispute categories, a ranked action plan, and ready-to-send dispute letters.',
  },
];

const features = [
  { icon: '📊', title: 'Credit Score Overview', body: 'See scores from all three bureaus with a health rating and breakdown by category.' },
  { icon: '🔍', title: 'FCRA Error Detection', body: 'Every negative item flagged with the specific FCRA section violated and dispute strength rating.' },
  { icon: '⚖️', title: 'Legal Dispute Categories', body: 'Items auto-classified as Obsolete, Re-Aged, Balance Error, Duplicate, and more — each with targeted legal language.' },
  { icon: '📋', title: 'Ranked Action Plan', body: 'Prioritized steps ordered by impact — tackle what matters most first with specific FCRA citations.' },
  { icon: '✉️', title: 'Dispute Letters', body: 'Ready-to-send letters pre-filled with your info, creditor details, account numbers, and applicable federal law citations.' },
  { icon: '🏦', title: '3-Bureau Coverage', body: 'Equifax, Experian, and TransUnion — dispute letters generated per bureau based on where each item actually appears.' },
];

const disputeTypes = [
  { icon: '💳', title: 'Collections', body: 'Collection accounts can significantly impact your score. Generate targeted collection dispute letters citing FCRA §1681i.' },
  { icon: '📉', title: 'Charge-Offs', body: 'Identify questionable charge-offs, re-aged accounts, and DOFD violations under FCRA §1681c.' },
  { icon: '📅', title: 'Late Payments', body: 'Challenge reporting errors related to late payment dates, account history, and status inaccuracies.' },
  { icon: '🔎', title: 'Hard Inquiries', body: 'Review unauthorized or inaccurate inquiries and generate inquiry dispute letters under §1681i.' },
  { icon: '🚗', title: 'Repossessions', body: 'Manage repossession disputes and generate letters targeting balance errors and status misreporting.' },
  { icon: '🏠', title: 'Foreclosures', body: 'Track foreclosure-related reporting issues and dispute eligible inaccuracies past their reporting limit.' },
  { icon: '⚖️', title: 'Bankruptcies', body: 'Review bankruptcy reporting for accuracy, obsolete entries, and §1681c compliance.' },
  { icon: '📜', title: 'Judgments & Public Records', body: 'Analyze public record information and dispute reporting errors, including unverifiable and outdated entries.' },
];

const faqs = [
  {
    q: 'Where do I get my credit report?',
    a: 'The easiest way is to sign up free at SmartCredit — you get all three bureau reports instantly. You can also visit AnnualCreditReport.com, the only federally authorized free annual report site.',
  },
  {
    q: 'What types of accounts can be disputed?',
    a: 'Collections, charge-offs, late payments, hard inquiries, repossessions, foreclosures, bankruptcies, judgments, and other negative reporting items. DisputeGator classifies each item with the specific FCRA dispute category and legal grounds.',
  },
  {
    q: 'Is my personal information safe?',
    a: 'Yes. Your data is never stored on our servers. All analysis happens in real-time and everything is discarded after your session ends. We never log your SSN or personal details.',
  },
  {
    q: 'What format does the PDF need to be in?',
    a: 'Any standard text-based PDF credit report — including reports from SmartCredit, AnnualCreditReport.com, or individual bureau websites. Image-based PDFs will not work.',
  },
  {
    q: 'Do I need to create an account?',
    a: 'No account required to analyze your report and generate dispute letters. Everything works in a single session.',
  },
  {
    q: 'How accurate is the AI analysis?',
    a: 'The AI reads every line of your report and classifies negative items using FCRA decision logic — including DOFD calculation, reporting deadline math, and dispute category assignment. Dispute letters cite specific federal law sections. Always review before sending.',
  },
  {
    q: 'How long does the dispute process take?',
    a: 'The DisputeGator analysis takes under 60 seconds. Bureau reinvestigations typically take 30 days as required by FCRA §1681i.',
  },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <style>{`
        .lp { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; color: #052e16; }
        .lp * { box-sizing: border-box; }
        .lp a { text-decoration: none; }
        .lp-nav { position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid #e7ebf2; padding: 0 clamp(20px,5vw,60px); display: flex; align-items: center; justify-content: space-between; height: 64px; }
        .lp-logo { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 17px; color: #052e16; }
        .lp-logo-icon { width: 34px; height: 34px; background: #16a34a; border-radius: 9px; display: grid; place-items: center; }
        .lp-nav-cta { background: #16a34a; color: #fff; border: none; border-radius: 9px; padding: 10px 20px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; transition: background 0.15s; }
        .lp-nav-cta:hover { background: #15803d; }
        .lp-hero { background: linear-gradient(135deg, #052e16 0%, #14532d 60%, #16a34a 100%); color: #fff; text-align: center; padding: clamp(64px,10vw,120px) clamp(20px,5vw,60px); }
        .lp-hero-badge { display: inline-flex; align-items: center; gap: 7px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2); border-radius: 999px; padding: 6px 16px; font-size: 13px; font-weight: 600; margin-bottom: 28px; }
        .lp-hero h1 { font-size: clamp(34px,6vw,68px); font-weight: 800; line-height: 1.1; letter-spacing: -0.03em; margin: 0 0 16px; max-width: 820px; margin-left: auto; margin-right: auto; }
        .lp-hero-slogan { font-size: clamp(15px,2vw,18px); color: rgba(255,255,255,0.6); font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 14px; }
        .lp-hero-sub { font-size: clamp(16px,2vw,20px); color: rgba(255,255,255,0.75); max-width: 560px; margin: 0 auto 36px; line-height: 1.6; }
        .lp-hero-cta { display: inline-block; background: #fff; color: #15803d; border-radius: 12px; padding: 16px 36px; font-size: 17px; font-weight: 800; transition: transform 0.15s, box-shadow 0.15s; box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
        .lp-hero-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.28); }
        .lp-hero-note { margin-top: 16px; font-size: 13px; color: rgba(255,255,255,0.5); }
        .lp-trust { background: #f8faff; border-top: 1px solid #e7ebf2; border-bottom: 1px solid #e7ebf2; padding: 22px clamp(20px,5vw,60px); display: flex; align-items: center; justify-content: center; gap: clamp(20px,4vw,56px); flex-wrap: wrap; }
        .lp-trust-item { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; color: #475569; }
        .lp-trust-dot { width: 8px; height: 8px; border-radius: 50%; background: #16a34a; flex-shrink: 0; }
        .lp-section { padding: clamp(56px,8vw,96px) clamp(20px,5vw,60px); max-width: 1100px; margin: 0 auto; }
        .lp-section-label { font-size: 12px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #16a34a; margin-bottom: 12px; }
        .lp-section-title { font-size: clamp(26px,4vw,42px); font-weight: 800; letter-spacing: -0.025em; color: #052e16; margin: 0 0 14px; }
        .lp-section-sub { font-size: 16px; color: #475569; max-width: 520px; line-height: 1.65; margin: 0; }
        .lp-steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; margin-top: 48px; }
        .lp-step { background: #fff; border: 1px solid #e7ebf2; border-radius: 18px; padding: 28px 24px; box-shadow: 0 1px 3px rgba(5,46,22,.05); }
        .lp-step-num { font-size: 11px; font-weight: 800; letter-spacing: 0.08em; color: #16a34a; background: #f0fdf4; border-radius: 6px; padding: 4px 8px; display: inline-block; margin-bottom: 14px; }
        .lp-step h3 { font-size: 16px; font-weight: 700; color: #052e16; margin: 0 0 8px; }
        .lp-step p { font-size: 14px; color: #64748b; line-height: 1.6; margin: 0 0 12px; }
        .lp-step-link { display: inline-block; font-size: 13px; font-weight: 700; color: #16a34a; margin-top: 4px; }
        .lp-step-link:hover { color: #15803d; }
        .lp-features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; margin-top: 48px; }
        .lp-feature { background: #fff; border: 1px solid #e7ebf2; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(5,46,22,.04); }
        .lp-feature-icon { font-size: 28px; margin-bottom: 12px; }
        .lp-feature h3 { font-size: 15.5px; font-weight: 700; color: #052e16; margin: 0 0 6px; }
        .lp-feature p { font-size: 13.5px; color: #64748b; line-height: 1.6; margin: 0; }
        .lp-dispute-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-top: 48px; }
        .lp-dispute-card { background: #fff; border: 1px solid #e7ebf2; border-radius: 16px; padding: 22px 20px; box-shadow: 0 1px 3px rgba(5,46,22,.04); }
        .lp-dispute-card-icon { font-size: 24px; margin-bottom: 10px; }
        .lp-dispute-card h3 { font-size: 15px; font-weight: 700; color: #052e16; margin: 0 0 6px; }
        .lp-dispute-card p { font-size: 13.5px; color: #64748b; line-height: 1.55; margin: 0; }
        .lp-security { background: linear-gradient(135deg, #052e16 0%, #14532d 100%); color: #fff; padding: clamp(56px,8vw,96px) clamp(20px,5vw,60px); text-align: center; }
        .lp-security-inner { max-width: 700px; margin: 0 auto; }
        .lp-security h2 { font-size: clamp(24px,3.5vw,38px); font-weight: 800; letter-spacing: -0.025em; margin: 0 0 14px; }
        .lp-security p { font-size: 15.5px; color: rgba(255,255,255,0.7); line-height: 1.65; margin: 0 0 32px; }
        .lp-security-pills { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
        .lp-security-pill { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.18); border-radius: 999px; padding: 8px 18px; font-size: 13px; font-weight: 600; }
        .lp-audience { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 48px; }
        .lp-audience-card { background: #fff; border: 1px solid #e7ebf2; border-radius: 16px; padding: 22px 20px; }
        .lp-audience-card h3 { font-size: 15px; font-weight: 700; color: #052e16; margin: 0 0 6px; }
        .lp-audience-card p { font-size: 13.5px; color: #64748b; line-height: 1.55; margin: 0; }
        .lp-faq { max-width: 720px; margin: 48px auto 0; display: flex; flex-direction: column; gap: 10px; }
        .lp-faq-item { background: #fff; border: 1px solid #e7ebf2; border-radius: 14px; overflow: hidden; }
        .lp-faq-q { width: 100%; background: none; border: none; padding: 18px 20px; font-size: 15px; font-weight: 600; color: #052e16; text-align: left; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 12px; font-family: inherit; }
        .lp-faq-q:hover { background: #f0fdf4; }
        .lp-faq-arrow { color: #16a34a; font-size: 18px; transition: transform 0.2s; flex-shrink: 0; }
        .lp-faq-arrow.open { transform: rotate(45deg); }
        .lp-faq-a { padding: 0 20px 18px; font-size: 14px; color: #475569; line-height: 1.65; }
        .lp-cta-panel { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 24px; padding: clamp(36px,5vw,60px); text-align: center; margin: clamp(56px,8vw,96px) auto; max-width: 840px; }
        .lp-cta-panel h2 { font-size: clamp(24px,3.5vw,38px); font-weight: 800; letter-spacing: -0.025em; color: #052e16; margin: 0 0 12px; }
        .lp-cta-panel p { font-size: 15.5px; color: #475569; margin: 0 0 28px; line-height: 1.6; }
        .lp-cta-btn { display: inline-block; background: #16a34a; color: #fff; border-radius: 12px; padding: 16px 36px; font-size: 17px; font-weight: 800; transition: background 0.15s, transform 0.15s; box-shadow: 0 4px 16px rgba(22,163,74,0.3); }
        .lp-cta-btn:hover { background: #15803d; transform: translateY(-1px); }
        .lp-cta-wrap { padding: 0 clamp(20px,5vw,60px); }
        .lp-footer { background: #052e16; color: rgba(255,255,255,0.5); padding: 32px clamp(20px,5vw,60px); text-align: center; font-size: 12.5px; line-height: 1.7; }
        .lp-footer a { color: rgba(255,255,255,0.5); }
        .lp-footer-logo { color: #fff; font-weight: 800; font-size: 15px; margin-bottom: 10px; }
        @media (max-width: 640px) {
          .lp-steps, .lp-features-grid, .lp-audience, .lp-dispute-grid { grid-template-columns: 1fr; }
          .lp-trust { flex-direction: column; gap: 12px; }
        }
      `}</style>

      <div className="lp">
        {/* Nav */}
        <nav className="lp-nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Shield mark */}
            <svg width="36" height="36" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 2 L34 8 L34 20 C34 28 19 36 19 36 C19 36 4 28 4 20 L4 8 Z" fill="#010D18" />
              <path d="M19 2 L34 8 L34 20 C34 28 19 36 19 36 C19 36 4 28 4 20 L4 8 Z" stroke="#53A02C" strokeWidth="1.5" />
              <text x="19" y="25" textAnchor="middle" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="17" fill="#53A02C">G</text>
            </svg>
            <span style={{ fontFamily: "'Arial Black', Impact, sans-serif", fontWeight: 900, fontSize: 19, letterSpacing: '-.01em', lineHeight: 1 }}>
              <span style={{ color: '#010D18' }}>DISPUTE</span>
              <span style={{ color: '#53A02C' }}>GATOR</span>
            </span>
          </div>
          <Link href="/analyze" className="lp-nav-cta">Analyze My Report</Link>
        </nav>

        {/* Hero */}
        <section className="lp-hero">
          <div className="lp-hero-badge">
            <span>⚖️</span> AI-Powered FCRA Dispute Intelligence
          </div>
          <h1>Remove Negative Items From Your Credit Report With AI</h1>
          <p className="lp-hero-slogan">Take A Bite Out Of Bad Credit™</p>
          <p className="lp-hero-sub">
            Upload your credit report and get an instant AI analysis, FCRA-categorized dispute letters, and a ranked action plan — in under 60 seconds.
          </p>
          <Link href="/analyze" className="lp-hero-cta">Analyze My Credit Report →</Link>
          <p className="lp-hero-note">No account required · Your data is never stored · Free to use</p>
        </section>

        {/* Trust bar */}
        <div className="lp-trust">
          <div className="lp-trust-item"><div className="lp-trust-dot" /> No data stored</div>
          <div className="lp-trust-item"><div className="lp-trust-dot" /> All 3 bureaus covered</div>
          <div className="lp-trust-item"><div className="lp-trust-dot" /> FCRA-based dispute letters</div>
          <div className="lp-trust-item"><div className="lp-trust-dot" /> Results in under 60 seconds</div>
          <div className="lp-trust-item"><div className="lp-trust-dot" /> No credit repair company required</div>
        </div>

        {/* How it works */}
        <div style={{ background: '#f8faff' }}>
          <div className="lp-section">
            <div className="lp-section-label">How It Works</div>
            <h2 className="lp-section-title">Four steps to a better credit score</h2>
            <p className="lp-section-sub">From getting your report to sending dispute letters — the whole process takes less than 10 minutes.</p>
            <div className="lp-steps">
              {steps.map((s) => (
                <div key={s.num} className="lp-step">
                  <div className="lp-step-num">STEP {s.num}</div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                  {s.cta && (
                    <a href={s.cta.href} target="_blank" rel="noopener noreferrer" className="lp-step-link">
                      {s.cta.label}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dispute types */}
        <div className="lp-section">
          <div className="lp-section-label">What We Dispute</div>
          <h2 className="lp-section-title">Dispute negative items across all three credit bureaus</h2>
          <p className="lp-section-sub">DisputeGator identifies and generates targeted dispute letters for every type of negative account — each citing the specific FCRA section that applies.</p>
          <div className="lp-dispute-grid">
            {disputeTypes.map((d) => (
              <div key={d.title} className="lp-dispute-card">
                <div className="lp-dispute-card-icon">{d.icon}</div>
                <h3>{d.title}</h3>
                <p>{d.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={{ background: '#f8faff' }}>
          <div className="lp-section">
            <div className="lp-section-label">What You Get</div>
            <h2 className="lp-section-title">Everything you need in one report</h2>
            <p className="lp-section-sub">No guesswork. No generic advice. A full breakdown of your exact credit situation with FCRA-grounded action steps.</p>
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
            <p className="lp-section-sub">Whether you&rsquo;re rebuilding from scratch or optimizing a good score, DisputeGator gives you a clear, legally grounded path forward.</p>
            <div className="lp-audience">
              {[
                { title: 'First-time buyers', body: 'Preparing to apply for a mortgage and want to maximize your score before the application.' },
                { title: 'Rebuilding credit', body: 'Coming back from bankruptcy, collections, or a rough financial period and need a clear starting point.' },
                { title: 'Dispute filers', body: 'You know there are errors on your report and want legally grounded FCRA letters to challenge them.' },
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
            <h2>Start Your Credit Dispute Journey Today</h2>
            <p>Upload your credit report and get your full analysis, FCRA dispute letters, and action plan in under 60 seconds — completely free. No credit repair company required.</p>
            <Link href="/analyze" className="lp-cta-btn">Analyze My Credit Report — Free →</Link>
            <p style={{ marginTop: 16, fontSize: 13, color: '#94a3b8' }}>No account required · No data stored · Instant results</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="lp-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 12 }}>
            <svg width="30" height="30" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 2 L34 8 L34 20 C34 28 19 36 19 36 C19 36 4 28 4 20 L4 8 Z" fill="#010D18" />
              <path d="M19 2 L34 8 L34 20 C34 28 19 36 19 36 C19 36 4 28 4 20 L4 8 Z" stroke="#53A02C" strokeWidth="1.5" />
              <text x="19" y="25" textAnchor="middle" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="17" fill="#53A02C">G</text>
            </svg>
            <span style={{ fontFamily: "'Arial Black', Impact, sans-serif", fontWeight: 900, fontSize: 16, letterSpacing: '-.01em' }}>
              <span style={{ color: '#E3E2E2' }}>DISPUTE</span>
              <span style={{ color: '#53A02C' }}>GATOR</span>
            </span>
          </div>
          <p>
            This tool is for informational purposes only and does not constitute legal or financial advice.<br />
            Dispute letters are generated based on AI analysis of your credit report. Always review before sending.<br />
            Not affiliated with Equifax, Experian, TransUnion, AnnualCreditReport.com, or SmartCredit.
          </p>
          <p style={{ marginTop: 12 }}>
            <Link href="/analyze">Analyze My Report</Link> &nbsp;&middot;&nbsp; &copy; {new Date().getFullYear()} DisputeGator
          </p>
        </footer>
      </div>
    </>
  );
}
