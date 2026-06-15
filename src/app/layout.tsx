import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { AnalysisProvider } from '@/context/AnalysisContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'DisputeGator — Take A Bite Out Of Bad Credit™',
  description: 'AI-powered credit report analysis, FCRA dispute letters, and personalized action plans across all three bureaus.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <AnalysisProvider>
            {children}
          </AnalysisProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
