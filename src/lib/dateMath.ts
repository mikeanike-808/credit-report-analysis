// Pure date arithmetic, computed server-side instead of by the AI.
// Both functions are defensive: the AI emits dofd/lastActivity as plain
// strings with no format enforcement, so a malformed value must degrade to
// null/false rather than throw or produce NaN/Invalid Date.

const MM_YYYY = /^(0[1-9]|1[0-2])\/\d{4}$/;

function parseMonthYear(value: string): { year: number; month: number } | null {
  if (!MM_YYYY.test(value)) return null;
  const [mm, yyyy] = value.split('/');
  return { year: Number(yyyy), month: Number(mm) };
}

export function monthsBetween(a: string, b: string): number | null {
  const parsedA = parseMonthYear(a);
  const parsedB = parseMonthYear(b);
  if (!parsedA || !parsedB) return null;
  const totalA = parsedA.year * 12 + parsedA.month;
  const totalB = parsedB.year * 12 + parsedB.month;
  return Math.abs(totalA - totalB);
}

export function computeReportingDeadline(
  dofd: string | null,
  now: Date = new Date(),
): { reportingDeadline: string | null; pastReportingLimit: boolean } {
  if (!dofd) return { reportingDeadline: null, pastReportingLimit: false };

  const parsed = parseMonthYear(dofd);
  if (!parsed) return { reportingDeadline: null, pastReportingLimit: false };

  // 7 years + 180 days from DOFD, per 15 U.S.C. 1681c(a)(4)
  const deadline = new Date(parsed.year + 7, parsed.month - 1, 1);
  deadline.setDate(deadline.getDate() + 180);

  const reportingDeadline = `${String(deadline.getMonth() + 1).padStart(2, '0')}/${deadline.getFullYear()}`;
  const pastReportingLimit = deadline.getTime() < now.getTime();

  return { reportingDeadline, pastReportingLimit };
}
