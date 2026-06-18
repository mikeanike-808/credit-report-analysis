// Builds dispute letters from structured AI analysis data.
//
// buildLetter          -- generic fallback covering all negative items for a bureau.
// buildCreditorLetter  -- targeted letter for one creditor x bureau, using AI item data.

import type { AnalysisResult, NegativeItem, UserInfo, Bureau, DisputeCategory } from '@/types';
import { BUREAUS } from './bureaus';

// ── Helpers ──────────────────────────────────────────────────────────────────

function tc(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function titleCaseName(first: string, last: string): string {
  return `${tc(first)} ${tc(last)}`;
}

function cityStateZip(city: string, state: string, zip: string): string {
  return [city, state, zip].filter(Boolean).join(', ');
}

function ssnMask(ssn: string): string {
  const digits = ssn.replace(/\D/g, '');
  return digits.length >= 4 ? `***-**-${digits.slice(-4)}` : '***-**-****';
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function bureauDisplayName(key: string): string {
  return BUREAUS.find((b) => b.key === key.toLowerCase())?.name ?? key;
}

// Renders the per-item identifying-data block. Each dispute type carries
// different identifying fields -- a hard inquiry has no account number or
// balance, and a personal information error has neither. Printing "N/A" for
// fields that structurally don't exist for that type makes the letter look
// incomplete even when every relevant field IS present. Branch on
// disputeCategory (a schema-enforced enum) rather than the free-form `type`
// string, since `type` has no enum constraint and a stray AI variation
// (e.g. "hard inquiry" lowercase) would silently fall through to the
// generic account block and reintroduce the "Account Number: N/A" bug.
function buildAccountBlock(item: NegativeItem): string {
  const reasonsText = item.reasons.map((r) => `  * ${r}`).join('\n');

  if (item.disputeCategory === 'Unauthorized Inquiry') {
    const bureauNames = item.bureaus.map(bureauDisplayName).join(', ') || bureauDisplayName(item.primaryBureau);
    return (
      `${BOX}\n` +
      `  HARD INQUIRY: ${item.creditor.toUpperCase()}\n` +
      `${BOX}\n` +
      `  Inquiry Date:          ${item.dateReported}\n` +
      `  Reported To:           ${bureauNames}\n` +
      `  Dispute Category:      ${item.disputeCategory}\n` +
      `  Specific Violation:    ${item.specificViolation}\n` +
      `${BOX}\n\n` +
      `Grounds for dispute:\n${reasonsText}`
    );
  }

  if (item.disputeCategory === 'Personal Information Error') {
    const bureauNames = item.bureaus.map(bureauDisplayName).join(', ') || bureauDisplayName(item.primaryBureau);
    return (
      `${BOX}\n` +
      `  PERSONAL INFORMATION ERROR\n` +
      `${BOX}\n` +
      `  Disputed Item:         ${item.creditor}\n` +
      `  Reported To:           ${bureauNames}\n` +
      `  Dispute Category:      ${item.disputeCategory}\n` +
      `  Specific Violation:    ${item.specificViolation}\n` +
      `${BOX}\n\n` +
      `Grounds for dispute:\n${reasonsText}`
    );
  }

  const dofdLine = item.dofd ? `  Date of First Delinquency: ${item.dofd}\n` : '';
  const deadlineLine = item.reportingDeadline ? `  Reporting Deadline:        ${item.reportingDeadline}\n` : '';
  return (
    `${BOX}\n` +
    `  ACCOUNT: ${item.creditor.toUpperCase()}\n` +
    `${BOX}\n` +
    `  Account Number:        ${item.accountNumber}\n` +
    `  Account Type:          ${item.type}\n` +
    `  Account Status:        ${item.status}\n` +
    `  Balance:               ${item.balance}\n` +
    `  Date Last Reported:    ${item.dateReported}\n` +
    dofdLine +
    deadlineLine +
    `  Dispute Category:      ${item.disputeCategory}\n` +
    `  Specific Violation:    ${item.specificViolation}\n` +
    `${BOX}\n\n` +
    `Grounds for dispute:\n${reasonsText}`
  );
}

const SEP = '----------------------------------------------------------------------';
const BOX = '======================================================================';

// ── Category-specific legal demand paragraphs ─────────────────────────────────
//
// Each paragraph states: (1) FCRA section, (2) Metro 2 field affected,
// (3) exact remedy demanded (delete / correct / reinvestigate),
// (4) case law where directly applicable.
// All text uses plain ASCII -- no Section sign, no em-dashes, no bullet glyphs.

const categoryDemand: Record<DisputeCategory, (item: NegativeItem) => string> = {
  'Unauthorized Inquiry': (item) => {
    const violation = item.specificViolation
      ? `Specifically: ${item.specificViolation}`
      : `I did not authorize this inquiry and have no record of applying for credit, employment, or any other permissible transaction with this entity.`;
    return (
      `This hard inquiry is being disputed under 15 U.S.C. Section 1681b(f), which ` +
      `prohibits any person from obtaining a consumer report without a permissible purpose. ` +
      `${violation} ` +
      `The Metro 2 Inquiry Type field must reflect only authorized inquiries. ` +
      `I demand that you provide written proof of the specific permissible purpose authorizing ` +
      `this inquiry. If such proof is not available, the FCRA mandates deletion of this inquiry ` +
      `from my credit file without delay. ` +
      `See Dalton v. Capital Associated Industries, Inc., 257 F.3d 409 (4th Cir. 2001) ` +
      `(consumers may dispute the accuracy and permissibility of inquiries under the FCRA).`
    );
  },

  'Late Payment Error': (item) => {
    const violation = item.specificViolation
      ? `Specifically: ${item.specificViolation}`
      : `The payment rating, days-past-due value, or payment date as reported is inconsistent with the account history shown elsewhere in this report.`;
    return (
      `This late payment entry is being disputed under 15 U.S.C. Section 1681s-2(b), which ` +
      `requires furnishers to investigate consumer disputes and correct or delete any inaccurate ` +
      `information. ${violation} ` +
      `The Metro 2 Payment Rating field must accurately reflect the payment history based on ` +
      `actual account records -- not internal system approximations. ` +
      `I demand that the furnisher produce the original payment ledger and account statements ` +
      `to verify each reported late payment date and amount. If the reported late payment cannot ` +
      `be verified against original source documents, it must be corrected or deleted immediately. ` +
      `See Johnson v. MBNA America Bank, N.A., 357 F.3d 426 (4th Cir. 2004) ` +
      `(furnisher's duty to investigate requires review of original account documents, ` +
      `not merely a summary query of internal records).`
    );
  },

  'Collection Not Validated': (item) => {
    const violation = item.specificViolation
      ? `Specifically: ${item.specificViolation}`
      : `I have not received validation that this debt is accurate, that the amount claimed is correct, and that this party has the legal right to collect it.`;
    return (
      `This collection account is being disputed under 15 U.S.C. Section 1681s-2(b) and ` +
      `the Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. Section 1692g. ` +
      `${violation} ` +
      `The Metro 2 Special Comment and Balance fields must reflect only verified, validated ` +
      `debt information. I demand that the collection agency produce: (1) a complete chain of ` +
      `assignment or purchase agreement from the original creditor demonstrating legal standing ` +
      `to collect this debt, and (2) a signed debt validation letter confirming the amount ` +
      `owed. If this collection cannot be fully validated with original documentation, ` +
      `it must be deleted from my credit file immediately under 15 U.S.C. Section 1681i(a)(5)(A).`
    );
  },

  'Balance/Status Error': (item) => {
    const violation = item.specificViolation
      ? `Specifically: ${item.specificViolation}`
      : `The account status and/or balance as reported are internally contradictory or factually incorrect.`;
    return (
      `This account contains a material inaccuracy in violation of 15 U.S.C. Section 1681e(b) ` +
      `and Section 1681s-2(a)(1), which require furnishers to report only accurate and complete ` +
      `information. ${violation} ` +
      `The Metro 2 Account Status Code and Current Balance fields must reflect the actual ` +
      `state of the account at the time of reporting. I demand that the furnisher provide ` +
      `current account statements or billing records as verification -- not a summary from ` +
      `an internal collections system. If the balance or status cannot be verified against ` +
      `original account records, the entry must be corrected to reflect accurate information.`
    );
  },

  'Not Mine': (item) => {
    const violation = item.specificViolation
      ? `Specifically: ${item.specificViolation}`
      : `I have no knowledge of this account and did not authorize its opening or any activity associated with it.`;
    return (
      `This account is being disputed as one that does not belong to me under ` +
      `15 U.S.C. Section 1681i, which entitles me to a credit file that is accurate and complete, ` +
      `and 15 U.S.C. Section 1681c-1, which grants fraud alert and identity theft rights when ` +
      `an account is opened without the consumer's knowledge. ${violation} ` +
      `All Metro 2 fields for this account are disputed in their entirety. ` +
      `I demand that the furnisher provide the original signed credit application bearing ` +
      `my signature as proof that I opened or authorized this account. ` +
      `If no such documentation exists, this account must be deleted immediately and ` +
      `my file must be audited for any other accounts that may have been opened without ` +
      `my authorization.`
    );
  },

  'Duplicate Entry': (item) => {
    const violation = item.specificViolation
      ? `Specifically: ${item.specificViolation}`
      : `The same underlying debt appears to be reported multiple times under different creditor names or account numbers.`;
    return (
      `This account appears to be a duplicate entry in violation of 15 U.S.C. Section 1681e(b), ` +
      `which requires credit reporting agencies to maintain reasonable procedures to assure ` +
      `maximum possible accuracy. ${violation} ` +
      `The Metro 2 Account Number field must uniquely identify each tradeline; the same ` +
      `account cannot appear twice for the same bureau. Each duplicate entry independently ` +
      `violates the accuracy requirement and artificially inflates the negative impact on my ` +
      `credit file. I demand that all duplicate entries be identified and deleted, retaining ` +
      `only one accurate representation of this account if it legitimately belongs in my file.`
    );
  },

  'Account Closed/Paid Incorrectly': (item) => {
    const violation = item.specificViolation
      ? `Specifically: ${item.specificViolation}`
      : `This account should reflect a closed or paid-in-full status but is being reported otherwise.`;
    return (
      `This account is reported with an incorrect status in violation of 15 U.S.C. ` +
      `Section 1681s-2(a)(1) and Section 1681s-2(b), which require furnishers to report ` +
      `accurate account standing and to correct any inaccuracies upon dispute. ` +
      `${violation} ` +
      `The Metro 2 Account Status Code and Date Closed fields must accurately reflect ` +
      `the actual closure date and paid status. I demand that the furnisher provide account ` +
      `records showing the actual closure date and any payoff documentation. If the furnisher ` +
      `cannot verify the current reported status with original account records, the entry ` +
      `must be corrected to reflect the accurate, paid and/or closed status.`
    );
  },

  'Inaccurate Information': (item) => {
    const violation = item.specificViolation
      ? `Specifically: ${item.specificViolation}`
      : `The information as reported does not accurately reflect the true status or history of this account.`;
    return (
      `This account contains inaccurate information in violation of 15 U.S.C. Section 1681e(b) ` +
      `and Section 1681s-2(b), which require that credit reporting agencies follow reasonable ` +
      `procedures to assure maximum possible accuracy and that furnishers investigate and ` +
      `correct inaccurate information upon dispute. ${violation} ` +
      `The Metro 2 fields affected by this inaccuracy must be corrected to reflect only ` +
      `verified, source-documented data. I demand that the furnisher produce the original ` +
      `account documentation supporting the reported information. If the reported information ` +
      `cannot be verified against original source documents, it must be corrected or deleted ` +
      `under 15 U.S.C. Section 1681i(a)(5)(A).`
    );
  },

  'Obsolete (Past Reporting Limit)': (item) => {
    const parts = [
      item.dofd ? `The Date of First Delinquency was ${item.dofd}.` : '',
      item.reportingDeadline ? `The calculated reporting deadline is ${item.reportingDeadline}.` : '',
    ].filter(Boolean).join(' ');
    const context = parts ? ` ${parts}` : '';
    return (
      `This account has exceeded the maximum reportable period under 15 U.S.C. Section 1681c(a)(4), ` +
      `which prohibits reporting of adverse information more than seven years from the Date of ` +
      `First Delinquency (DOFD).${context} ` +
      `The Metro 2 Date of First Delinquency field is the controlling data point for calculating ` +
      `the 7-year reporting clock. Continued reporting of this item beyond its legal expiration ` +
      `is a per-se violation of the FCRA. I demand immediate deletion of this account from my ` +
      `credit file without reinvestigation -- the reporting period has expired and no further ` +
      `verification is required to trigger the deletion obligation.`
    );
  },

  'Unverifiable Debt': (_item) =>
    `I am formally disputing this account under 15 U.S.C. Section 1681i(a)(1), which entitles ` +
    `me to a reinvestigation of any item in dispute. Under Section 1681s-2(b), the furnisher ` +
    `has a duty to investigate this dispute upon notice from the credit reporting agency and ` +
    `to certify with original documentation the accuracy and completeness of all reported ` +
    `Metro 2 fields. If the furnisher cannot verify this account with original source documents ` +
    `within the statutory 30-day reinvestigation period, this item must be deleted pursuant to ` +
    `15 U.S.C. Section 1681i(a)(5)(A). Internal system records or verbal confirmation from the ` +
    `furnisher do not constitute adequate verification of a disputed account.`,

  'Re-Aged Account': (item) => {
    const dofdStr = item.dofd
      ? `The Date of First Delinquency with the original creditor was ${item.dofd}.`
      : `The Date of First Delinquency with the original creditor has not been clearly disclosed in my credit file.`;
    const violation = item.specificViolation ? `Specifically: ${item.specificViolation}` : '';
    return (
      `This account has been unlawfully re-aged in violation of 15 U.S.C. Section 1681c(a) ` +
      `and Section 1681s-2(a)(5), which prohibit any furnisher from reporting a delinquency ` +
      `that is not the date of the original charge-off or delinquency with the original creditor. ` +
      `${dofdStr} ${violation} ` +
      `The Metro 2 Date of First Delinquency (DOFD) field must reflect the original delinquency ` +
      `date -- not the date the account was transferred, purchased, or placed with a collection ` +
      `agency. I demand that the furnisher produce the original DOFD documentation from the ` +
      `original creditor. If the reported DOFD does not match original creditor records, this ` +
      `account must be deleted as an unlawfully re-aged entry. ` +
      `See Richardson v. Fleet Bank of Massachusetts, 190 F. Supp. 2d 81 (D. Mass. 2000) ` +
      `(re-aging a debt to extend the reporting period is a willful violation of the FCRA).`
    );
  },

  'Personal Information Error': (item) => {
    const violation = item.specificViolation
      ? `Specifically: ${item.specificViolation}`
      : `My credit file contains a name, address, or other identifier that does not belong to me.`;
    return (
      `I am disputing inaccurate personal identifying information under 15 U.S.C. ` +
      `Section 1681e(b) and Section 1681i, which require credit reporting agencies to follow ` +
      `reasonable procedures to assure maximum possible accuracy of consumer identifiers. ` +
      `${violation} ` +
      `The Metro 2 Consumer Name and Address fields must match only verified, consumer-confirmed ` +
      `data. Unknown names or addresses may indicate a mixed file, where accounts belonging to ` +
      `another individual have been merged into my credit history -- a serious data integrity ` +
      `failure. I demand that you immediately correct this personal information and audit my ` +
      `entire file for any accounts that may have been associated with my file due to this error.`
    );
  },

  'Cross-Bureau Inconsistency': (item) => {
    const violation = item.specificViolation
      ? `Specifically: ${item.specificViolation}`
      : `This account is reported with materially different information across two or more bureaus, including discrepancies in account status, balance, last activity date, or remarks.`;
    return (
      `I am disputing a material inconsistency in the reporting of this account under ` +
      `15 U.S.C. Section 1681s-2(a)(1), which requires furnishers to report accurate and ` +
      `complete information, and CFPB Circular 2022-07, which confirms that furnishers have ` +
      `a duty to report accurate and consistent data across all bureaus to which they furnish. ` +
      `${violation} ` +
      `The same Metro 2 data fields cannot legitimately carry different values across bureaus ` +
      `for the same account -- any discrepancy is itself evidence of inaccuracy. ` +
      `I demand that the furnisher review and correct the reported information at all three ` +
      `bureaus simultaneously so that a single, accurate, and consistent record is maintained. ` +
      `If the furnisher cannot confirm which bureau's data is correct, all discrepant entries ` +
      `must be corrected to the most favorable accurate value or deleted.`
    );
  },
};

// ── buildLetter -- generic multi-item fallback ────────────────────────────────

export function buildLetter(
  bureau: Bureau,
  result: AnalysisResult,
  userInfo: UserInfo
): string {
  const date = fmtDate(result.completedAt);
  const name = titleCaseName(userInfo.first, userInfo.last);
  const cityLine = cityStateZip(userInfo.city, userInfo.state, userInfo.zip);
  const ssnLine = userInfo.ssn ? `SSN: ${ssnMask(userInfo.ssn)}` : '';
  const dobLine = userInfo.dob ? `DOB: ${userInfo.dob}` : '';

  const headerLines = [name, userInfo.address, cityLine, ssnLine, dobLine]
    .filter(Boolean)
    .join('\n');

  const items = result.negativeItems
    .map((n, i) => {
      const idLine =
        n.disputeCategory === 'Unauthorized Inquiry' || n.disputeCategory === 'Personal Information Error'
          ? `${i + 1}. ${n.creditor}\n   Type: ${n.type}  |  Reported: ${n.dateReported}`
          : `${i + 1}. ${n.creditor} -- Account #${n.accountNumber}\n   Type: ${n.type}  |  Status: ${n.status} (${n.dateReported})`;
      return `${idLine}\n   Reason: ${n.reasons.join('; ')}.`;
    })
    .join('\n\n');

  return `${headerLines}

${date}

${bureau.name}
${bureau.addr}

RE: Formal Dispute of Inaccurate Credit Information

To Whom It May Concern:

I am writing to formally dispute the following items appearing on my ${bureau.name} credit report. Under the Fair Credit Reporting Act (FCRA), 15 U.S.C. Section 1681, I am entitled to a credit file that is accurate, complete, and verifiable. After reviewing my report, I have identified the following inaccuracies:

${items}

I respectfully request that you conduct a reasonable reinvestigation of each item above as required under FCRA Section 1681i. If any item cannot be fully verified with the original furnisher, it must be promptly deleted or corrected, and an updated copy of my credit report must be provided to me.

Please complete this reinvestigation within 30 days of receipt of this letter and notify me in writing of the results. Enclosed are copies (not originals) of documents supporting my identity and this dispute.

Sincerely,

${name}`;
}

// ── buildCreditorLetter -- targeted per-creditor per-bureau letter ─────────────

export function buildCreditorLetter(
  bureau: Bureau,
  creditor: string,
  items: NegativeItem[],
  userInfo: UserInfo,
  completedAt: string,
): string {
  const date = fmtDate(completedAt);
  const name = titleCaseName(userInfo.first, userInfo.last);
  const cityLine = cityStateZip(userInfo.city, userInfo.state, userInfo.zip);
  const ssnLine = userInfo.ssn ? `SSN: ${ssnMask(userInfo.ssn)}` : '';
  const dobLine = userInfo.dob ? `DOB: ${userInfo.dob}` : '';

  const headerLines = [name, userInfo.address, cityLine, ssnLine, dobLine]
    .filter(Boolean)
    .join('\n');

  // Use the primary item for the category-specific demand paragraph
  const primaryItem = items[0];
  if (!primaryItem) return '';
  const primaryCategory = primaryItem.disputeCategory;
  const demandParagraph = categoryDemand[primaryCategory](primaryItem);

  // Identifying-data block(s) -- one per item, fields vary by dispute type
  const accountBlocks = items.map(buildAccountBlock).join('\n\n');

  const stateRef = userInfo.state
    ? `the ${userInfo.state} Attorney General's office`
    : `the State Attorney General's office`;

  return `${headerLines}

${date}

${bureau.name}
${bureau.addr}

RE: Formal Dispute -- ${creditor} | ${bureau.name}

${SEP}
THIS LETTER HAS BEEN SENT BY ME PERSONALLY
${SEP}

To Whom It May Concern,

THIS DOCUMENT HAS BEEN SENT BY ME PERSONALLY (${name}). I am asserting my rights under the Fair Credit Reporting Act (FCRA), 15 U.S.C. Section 1681 et seq. I am not utilizing any credit repair organization as defined under the Credit Repair Organizations Act (CROA), 15 U.S.C. Section 1679. I composed and submitted this letter myself. I am aware that no law requires me to provide a power of attorney or to prove personal authorship in order to submit a consumer dispute.

Under the FCRA and the Metro 2 data field reporting standards established by the Consumer Data Industry Association (CDIA), all furnished information must be accurate, complete, and verifiable at the time of reporting. Any deviation from these standards jeopardizes the integrity of the data and my rights as a consumer.

${accountBlocks}

${SEP}

${demandParagraph}

${SEP}
MANDATORY RESPONSE REQUIREMENT
${SEP}

Please send ALL written responses to:

  ${name}
  ${userInfo.address}
  ${cityLine}

I require written confirmation of receipt of this dispute within 14 business days of your receiving it.

${SEP}
INVESTIGATION REQUIREMENTS (15 U.S.C. Section 1681i)
${SEP}

I respectfully demand that you:

  1. Confirm receipt of this dispute in writing within 14 business days.
  2. Complete a thorough reinvestigation within 30 days of receipt.
  3. Provide written proof of the corrective actions taken.
  4. Send an updated copy of my credit report reflecting all changes.
  5. If the disputed information cannot be verified -- delete it immediately and notify me in writing.

${SEP}
NOTICE REGARDING FORM LETTER RESPONSES
${SEP}

I am aware that bureaus and furnishers sometimes respond to consumer disputes with generic form letters that do not address the specific information provided. Each dispute must be investigated on its individual merits under 15 U.S.C. Section 1681i. A form response that does not address the specific violations cited in this letter does not constitute a compliant reinvestigation and may itself constitute a willful violation of the FCRA.

Should you fail to act in full compliance with the FCRA, I reserve the right to file formal complaints with the Consumer Financial Protection Bureau (CFPB), the Federal Trade Commission (FTC), and ${stateRef}, and to seek statutory and actual damages under 15 U.S.C. Sections 1681n and 1681o.

Sincerely,

${name}

THIS LETTER WAS SENT BY ME PERSONALLY -- ${name}.

Enclosures:
  - Copy of government-issued photo identification
  - Copy of Social Security card
  - Copy of current address verification (utility bill or bank statement)`;
}
