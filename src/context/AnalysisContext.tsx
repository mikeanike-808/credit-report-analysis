'use client';

import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import type { AnalysisResult, UserInfo } from '@/types';

interface AnalysisContextValue {
  result: AnalysisResult | null;
  userInfo: UserInfo | null;
  /** Saved analysis row id -- lets Action Tracker persist checked-off items against the right record */
  analysisId: string | null;
  /** Indices into result.actionPlan the user has checked off, for Action Tracker */
  completedActions: number[];
  sessionToken: string;
  setResult: (result: AnalysisResult, userInfo: UserInfo, analysisId?: string | null, completedActions?: number[]) => void;
  setCompletedActions: (completedActions: number[]) => void;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [result, setResultState] = useState<AnalysisResult | null>(null);
  const [userInfo, setUserInfoState] = useState<UserInfo | null>(null);
  const [analysisId, setAnalysisIdState] = useState<string | null>(null);
  const [completedActions, setCompletedActionsState] = useState<number[]>([]);

  // Stable per-session token — used to associate disputes with this browser session
  const sessionToken = useMemo(() => crypto.randomUUID(), []);

  const setResult = (r: AnalysisResult, u: UserInfo, id: string | null = null, completed: number[] = []) => {
    setResultState(r);
    setUserInfoState(u);
    setAnalysisIdState(id);
    setCompletedActionsState(completed);
  };

  const setCompletedActions = (completed: number[]) => {
    setCompletedActionsState(completed);
  };

  return (
    <AnalysisContext.Provider value={{ result, userInfo, analysisId, completedActions, sessionToken, setResult, setCompletedActions }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error('useAnalysis must be used within <AnalysisProvider>');
  return ctx;
}
