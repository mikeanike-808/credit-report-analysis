'use client';

import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import type { AnalysisResult, UserInfo } from '@/types';

interface AnalysisContextValue {
  result: AnalysisResult | null;
  userInfo: UserInfo | null;
  sessionToken: string;
  setResult: (result: AnalysisResult, userInfo: UserInfo) => void;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [result, setResultState] = useState<AnalysisResult | null>(null);
  const [userInfo, setUserInfoState] = useState<UserInfo | null>(null);

  // Stable per-session token — used to associate disputes with this browser session
  const sessionToken = useMemo(() => crypto.randomUUID(), []);

  const setResult = (r: AnalysisResult, u: UserInfo) => {
    setResultState(r);
    setUserInfoState(u);
  };

  return (
    <AnalysisContext.Provider value={{ result, userInfo, sessionToken, setResult }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error('useAnalysis must be used within <AnalysisProvider>');
  return ctx;
}
