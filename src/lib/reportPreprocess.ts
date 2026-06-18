// Best-effort, additive pre-processing of raw PDF text before Call 1.
//
// Credit reports from common aggregator platforms share fairly consistent
// boilerplate section headers and field labels. This module inserts
// non-destructive hints (section markers, label-anchored late-tier
// annotations) to narrow the search space the AI has to scan -- it never
// reorders, removes, or rewrites the original text, and it degrades
// completely to the original text when it isn't confident.
//
// These hints are a trust tier below the AI itself: extractReportData()
// remains the sole source of truth for ExtractionResult. This module never
// feeds parsed values directly into the schema -- only into the text the
// AI reads, with an explicit "hints, not ground truth" instruction in
// EXTRACTION_SYSTEM_PROMPT.

export interface PreprocessResult {
  text: string;
  sectionsDetected: string[];
  lateTierAnnotationCount: number;
}

interface SectionAnchor {
  label: string;
  pattern: RegExp;
}

const SECTION_ANCHORS: SectionAnchor[] = [
  { label: 'PERSONAL INFORMATION', pattern: /PERSONAL\s+INFORMATION/i },
  { label: 'CREDIT SCORES', pattern: /CREDIT\s+SCORES?/i },
  { label: 'ACCOUNTS', pattern: /ACCOUNT\s+HISTORY|ACCOUNTS?\s+SUMMARY|^ACCOUNTS$/im },
  { label: 'INQUIRIES', pattern: /REQUESTS?\s+FOR\s+YOUR\s+CREDIT\s+HISTORY|HARD\s+INQUIRIES|INQUIRIES/i },
  { label: 'PUBLIC RECORDS', pattern: /PUBLIC\s+RECORDS?/i },
];

const MIN_ANCHORS_REQUIRED = 2;

// Matches the literal "Times 30/60/90 Days Late" label (and minor variants)
// immediately followed by an unambiguous "X/Y/Z" digit pattern.
const LATE_TIER_PATTERN = /(Times?\s+30\s*\/\s*60\s*\/\s*90\s+Days?\s+Late\D{0,10})(\d{1,3})\s*\/\s*(\d{1,3})\s*\/\s*(\d{1,3})/gi;

function detectSections(text: string): { label: string; index: number }[] {
  const found: { label: string; index: number }[] = [];
  for (const anchor of SECTION_ANCHORS) {
    const match = anchor.pattern.exec(text);
    if (match) found.push({ label: anchor.label, index: match.index });
  }
  return found.sort((a, b) => a.index - b.index);
}

function insertSectionMarkers(text: string, sections: { label: string; index: number }[]): string {
  // Insert from the end backwards so earlier offsets stay valid as we splice.
  let result = text;
  for (let i = sections.length - 1; i >= 0; i--) {
    const { label, index } = sections[i]!;
    const marker = `\n--- SECTION: ${label} ---\n`;
    result = result.slice(0, index) + marker + result.slice(index);
  }
  return result;
}

function annotateLateTiers(text: string): { text: string; count: number } {
  let count = 0;
  const annotated = text.replace(LATE_TIER_PATTERN, (full, prefix: string, a: string, b: string, c: string) => {
    count += 1;
    return `${full} [late30/60/90 precomputed: ${a}/${b}/${c}]`;
  });
  return { text: annotated, count };
}

export function preprocessReportText(rawText: string): PreprocessResult {
  try {
    const sections = detectSections(rawText);
    if (sections.length < MIN_ANCHORS_REQUIRED) {
      // Not enough confidence this report matches expected boilerplate --
      // graceful degradation: pass the raw text through unmodified.
      return { text: rawText, sectionsDetected: [], lateTierAnnotationCount: 0 };
    }

    const withMarkers = insertSectionMarkers(rawText, sections);
    const { text: withLateTierHints, count } = annotateLateTiers(withMarkers);

    return {
      text: withLateTierHints,
      sectionsDetected: sections.map((s) => s.label),
      lateTierAnnotationCount: count,
    };
  } catch {
    // Must never throw -- any unexpected condition falls back to today's
    // exact behavior.
    return { text: rawText, sectionsDetected: [], lateTierAnnotationCount: 0 };
  }
}
