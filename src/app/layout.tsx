import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { AnalysisProvider } from '@/context/AnalysisContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Credit Report AI Analyzer',
  description: 'AI-powered credit report analysis and dispute letter generation.',
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
