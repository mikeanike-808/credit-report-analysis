'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { PersonalInfoForm } from '@/components/upload/PersonalInfoForm';
import { UploadArea } from '@/components/upload/UploadArea';
import { useAnalysis } from '@/context/AnalysisContext';
import { extractTextFromPDF } from '@/lib/pdf';
import type { UserInfo } from '@/types';

const EMPTY_FORM: UserInfo = {
  first: '', last: '', dob: '', ssn: '',
  address: '', city: '', state: '', zip: '',
};

export default function UploadPage() {
  const router = useRouter();
  const { setResult } = useAnalysis();

  const [form, setForm] = useState<UserInfo>(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [fileErr, setFileErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  const handleFormChange = (key: keyof UserInfo, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isValid = form.first && form.last && file;

  const analyze = async () => {
    setTouched(true);
    if (!isValid) {
      if (!file) setFileErr('Please upload your credit report PDF.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const pdfText = await extractTextFromPDF(file!);

      if (pdfText.trim().length < 500) {
        setError('Your PDF appears to be image-based or unreadable. Please use a text-based PDF downloaded directly from AnnualCreditReport.com.');
        return;
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfText, userInfo: form }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Analysis failed. Please try again.');
        return;
      }

      setResult(data.result, form, data.analysisId ?? null, []);
      router.push('/home');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 'clamp(24px,3.5vw,40px) clamp(20px,3vw,40px) 40px' }}>
      {/* Intro header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 30 }}>
        <div style={{ maxWidth: 600 }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(28px,3.6vw,38px)', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>
            Upload Your Credit Report
          </h1>
          <p style={{ margin: '12px 0 0', color: 'var(--ink-2)', fontSize: 15.5, lineHeight: 1.6, maxWidth: 560 }}>
            Enter your information and upload your credit report PDF.
            We&rsquo;ll analyze it and give you a detailed summary, action plan, and dispute letters.
          </p>
        </div>
        <div style={{
          background: 'var(--blue-tintbg)', border: '1px solid #bbf7d0', borderRadius: 14,
          padding: '16px 18px', maxWidth: 290, color: 'var(--ink-2)', fontSize: 13.2, lineHeight: 1.55,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--blue-ink)', fontWeight: 700, marginBottom: 6 }}>
            <Icon name="shield" size={17} /> We respect your privacy.
          </div>
          Your information is only used to personalize your dispute letters.
        </div>
      </div>

      {/* Form sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <PersonalInfoForm form={form} onChange={handleFormChange} touched={touched} />

        {/* SmartCredit callout */}
        <div style={{
          background: 'var(--blue-tintbg)', border: '1px solid #bbf7d0', borderRadius: 14,
          padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 700, color: 'var(--blue-ink)', fontSize: 14, marginBottom: 5 }}>
              📋 Don&rsquo;t have your credit report yet?
            </div>
            <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: 13.2, lineHeight: 1.55 }}>
              Get your free tri-bureau report from SmartCredit — download the PDF, then upload it below. Takes under 5 minutes.
            </p>
          </div>
          <a
            href="https://www.smartcredit.com/join/?pid=78020"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'var(--blue)', color: '#fff', borderRadius: 9,
              padding: '10px 18px', fontSize: 13.5, fontWeight: 700,
              textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'background .15s',
            }}
          >
            Get Free Report at SmartCredit →
          </a>
        </div>

        {/* Section 2: Upload */}
        <section className="card" style={{ padding: 'clamp(18px,2.4vw,28px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 4 }}>
            <span style={{ color: 'var(--blue)', display: 'grid', placeItems: 'center' }}>
              <Icon name="file" size={22} stroke={2} />
            </span>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
              2. Upload Credit Report
            </h2>
          </div>
          <p style={{ margin: '6px 0 16px', color: 'var(--ink-3)', fontSize: 13.5 }}>
            Upload your credit report PDF from SmartCredit or{' '}
            <a href="https://www.annualcreditreport.com" target="_blank" rel="noopener noreferrer"
              style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>
              AnnualCreditReport.com
            </a>.
          </p>
          <UploadArea file={file} setFile={setFile} error={fileErr} setError={setFileErr} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-3)', fontSize: 12.8 }}>
              <Icon name="file" size={14} /> Accepted: PDF&nbsp;&nbsp;·&nbsp;&nbsp;Max size: 25 MB
            </div>
            {fileErr && <span style={{ color: 'var(--red)', fontSize: 12.8, fontWeight: 600 }}>{fileErr}</span>}
          </div>
        </section>
      </div>

      {/* Analyze button */}
      <button
        className="btn btn-primary"
        onClick={analyze}
        disabled={loading}
        style={{ width: '100%', height: 58, fontSize: 17, marginTop: 22, borderRadius: 13, opacity: loading ? 0.85 : 1 }}
      >
        {loading
          ? <><span className="spin" /> Analyzing your report&hellip;</>
          : <><Icon name="sparkle" size={19} fill="currentColor" stroke={0} /> Analyze My Report</>}
      </button>

      {touched && !isValid && !loading && (
        <div style={{ textAlign: 'center', color: 'var(--red)', fontSize: 13, marginTop: 10, fontWeight: 600 }}>
          Please complete your name and upload a credit report to continue.
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', color: 'var(--red)', fontSize: 13, marginTop: 10, fontWeight: 600 }}>
          {error}
        </div>
      )}
    </div>
  );
}
