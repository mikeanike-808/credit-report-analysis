// Builds dispute letters client-side from structured AI analysis data.
//
// buildLetter   — generic fallback letter covering all negative items for a bureau.
// buildCreditorLetter — targeted letter for one creditor × bureau, using AI-provided item data.

import type { AnalysisResult, NegativeItem, UserInfo, Bureau, DisputeCategory } from '@/types';

// Per-category opening paragraph — uses AI-provided specificViolation and DOFD data
// to produce legally grounded, non-generic dispute language.
const categoryOpener: Record<DisputeCategory, (item: NegativeItem) => string> = {
  'Obsolete (Past Reporting Limit)': (item) =>
    `This account has exceeded the maximum reportable period under FCRA §1681c. ` +
    `The Date of First Delinquency was ${item.dofd ?? 'on or before the charge-off date shown on this report'}. ` +
    `Adding the statutory 180-day period and the 7-year reporting limit places this item's reporting deadline at approximately ${item.reportingDeadline ?? 'more than 7.5 years ago'}. ` +
    `Continued reporting of this item beyond its legal expiration constitutes a violation of 15 U.S.C. §1681c and must be removed immediately.`,

  'Re-Aged Account': (item) =>
    `This account has been unlawfully re-aged in violation of FCRA §1681s-2(a)(5). ` +
    `The Date of First Delinquency reported by the collection agency appears to be more recent than the original delinquency date with the original creditor, ` +
    `which has the effect of artificially extending the 7-year reporting period. ` +
    `Under 15 U.S.C. §1681s-2(a)(5), furnishers are prohibited from reporting a delinquency date that is not the date of the original charge-off or delinquency. ` +
    (item.specificViolation ? `Specifically: ${item.specificViolation}` : ''),

  'Unverifiable Debt': (_item) =>
    `I am formally requesting a reinvestigation of this account under FCRA §1681i(a)(1). ` +
    `Under 15 U.S.C. §1681s-2(b), the furnisher has a duty to investigate this dispute upon notice from the credit reporting agency and to certify the accuracy and completeness of the reported information. ` +
    `If the furnisher cannot verify all reported data within the statutory 30-day reinvestigation period, this item must be promptly deleted pursuant to §1681i(a)(5)(A).`,

  'Balance/Status Error': (item) =>
    `This account contains a material inaccuracy in violation of FCRA §1681e(b) and §1681s-2(a)(1), which require furnishers to report only accurate and complete information. ` +
    (item.specificViolation
      ? `Specifically: ${item.specificViolation}`
      : `The account status and/or balance as reported are internally contradictory or factually incorrect.`) +
    ` Reporting contradictory or incorrect account data violates the maximum possible accuracy standard required by law.`,

  'Not Mine': (_item) =>
    `I am disputing this account as one that does not belong to me and was not authorized by me. ` +
    `Under FCRA §1681i, I am entitled to a credit file that is accurate and complete. ` +
    `I have no knowledge of this account and did not authorize its opening. ` +
    `I request a full reinvestigation. If this account cannot be verified as belonging to me, it must be deleted immediately from my credit file.`,

  'Duplicate Entry': (item) =>
    `This account appears to be a duplicate entry in violation of FCRA §1681e(b). ` +
    (item.specificViolation
      ? `Specifically: ${item.specificViolation}`
      : `The same underlying debt appears to be reported multiple times under different creditor names or account numbers.`) +
    ` Each duplicate entry independently violates the accuracy requirement and artificially inflates the negative impact on my credit file.`,

  'Account Closed/Paid Incorrectly': (item) =>
    `This account is reported with an incorrect status in violation of FCRA §1681s-2(a)(1), which requires furnishers to report only accurate account standing. ` +
    (item.specificViolation
      ? `Specifically: ${item.specificViolation}`
      : `This account should reflect a closed or paid-in-full status but is being reported otherwise.`) +
    ` Furnishers are legally obligated to update account status to accurately reflect current standing.`,

  'Inaccurate Information': (item) =>
    `This account contains inaccurate information in violation of FCRA §1681e(b) and §1681i, which require that credit reporting agencies follow reasonable procedures to assure maximum possible accuracy. ` +
    (item.specificViolation
      ? `Specifically: ${item.specificViolation}`
      : `The information as reported does not accurately reflect the true status or history of this account.`) +
    ` I am requesting a full reinvestigation under §1681i(a)(1).`,
};

export function buildLetter(
  bureau: Bureau,
  result: AnalysisResult,
  userInfo: UserInfo
): string {
  const date = new Date(result.completedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const items = result.negativeItems
    .map(
      (n, i) =>
        `${i + 1}. ${n.creditor} — Account #${n.accountNumber}\n` +
        `   Type: ${n.type}   |   Reported Status: ${n.status} (${n.dateReported})\n` +
        `   Reason for dispute: ${n.reasons.join('; ')}.`
    )
    .join('\n\n');

  const fullName = `${userInfo.first} ${userInfo.last}`;
  const address = `${userInfo.address}\n${userInfo.city}, ${userInfo.state} ${userInfo.zip}`;

  return `${date}

${fullName}
${address}

${bureau.name}
${bureau.addr}

RE: Formal Dispute of Inaccurate Credit Information

To Whom It May Concern:

I am writing to formally dispute the following items appearing on my ${bureau.name} credit report. Under the Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681, I am entitled to a credit file that is accurate, complete, and verifiable. After reviewing my report, I have identified the following inaccuracies:

${items}

I respectfully request that you conduct a reasonable reinvestigation of each item above as required under FCRA § 1681i. If any item cannot be fully verified with the original furnisher, it must be promptly deleted or corrected, and an updated copy of my credit report must be provided to me.

Please complete this reinvestigation within 30 days of receipt of this letter and notify me in writing of the results. Enclosed are copies (not originals) of documents supporting my identity and this dispute.

Sincerely,

${fullName}`;
}

/**
 * Builds a targeted dispute letter for a specific creditor and bureau.
 * All item details come directly from AI-structured output — no invented data.
 */
export function buildCreditorLetter(
  bureau: Bureau,
  creditor: string,
  items: NegativeItem[],
  userInfo: UserInfo,
  completedAt: string,
): string {
  const date = new Date(completedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const fullName = `${userInfo.first} ${userInfo.last}`;
  const address = `${userInfo.address}\n${userInfo.city}, ${userInfo.state} ${userInfo.zip}`;

  // Collect all unique laws cited across the items for this creditor
  const allLaws = Array.from(new Set(items.flatMap((i) => i.laws)));
  const lawsCitation = allLaws.length > 0 ? allLaws.join(', ') : 'FCRA § 1681i';

  // Determine the dominant dispute category (use the first item's category as the primary)
  const primaryCategory = items[0]?.disputeCategory ?? 'Inaccurate Information';
  const openingParagraph = categoryOpener[primaryCategory](items[0]);

  // Include escalation language for Strong disputes
  const hasStrongDispute = items.some((i) => i.disputeStrength === 'Strong');
  const escalationClosing = hasStrongDispute
    ? `\nGiven the objective, documentable nature of the violation(s) described above, I expect these items to be corrected or deleted upon reinvestigation. Should this bureau fail to act in accordance with the FCRA, I am aware of my right to seek statutory and actual damages under 15 U.S.C. §1681n and §1681o.`
    : '';

  const itemBlocks = items
    .map((item, idx) => {
      const reasonsText = item.reasons.map((r) => `   • ${r}`).join('\n');
      const dofdLine = item.dofd ? `   Date of First Delinquency: ${item.dofd}\n` : '';
      const deadlineLine = item.reportingDeadline ? `   Reporting deadline (§1681c): ${item.reportingDeadline}\n` : '';
      return (
        `${idx + 1}. Account: ${item.accountNumber}  |  Type: ${item.type}\n` +
        `   Dispute category: ${item.disputeCategory}\n` +
        `   Status reported: ${item.status} (${item.dateReported})\n` +
        `   Balance: ${item.balance}\n` +
        dofdLine +
        deadlineLine +
        `   Grounds for dispute:\n${reasonsText}\n` +
        `   Recommended action: ${item.recommendedAction}`
      );
    })
    .join('\n\n');

  return `${date}

${fullName}
${address}
${userInfo.dob ? `Date of Birth: ${userInfo.dob}\n` : ''}${userInfo.ssn ? `SSN: ${userInfo.ssn}\n` : ''}
${bureau.name}
${bureau.addr}

RE: Formal Dispute — ${creditor}

To Whom It May Concern:

${openingParagraph}

After reviewing my ${bureau.name} credit report, I have identified the following account(s) furnished by ${creditor} that require reinvestigation:

${itemBlocks}

Under ${lawsCitation}, I respectfully request that you conduct a thorough reinvestigation of each item listed above. If any item cannot be verified in full with ${creditor} as the original furnisher, it must be promptly deleted or corrected from my credit file, and I must be provided an updated copy of my report.

Please complete this reinvestigation within 30 days of receipt as required by law and notify me in writing of the outcome. Enclosed are copies (not originals) of documents supporting my identity and this dispute.${escalationClosing}

Sincerely,

${fullName}`;
}
