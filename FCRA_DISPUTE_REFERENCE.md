# FCRA Dispute Reference Guide

A practical, legally-grounded reference for what makes a credit dispute letter effective, what every disputable violation category requires, and what to avoid. Compiled from the Fair Credit Reporting Act (FCRA), FDCPA, CFPB guidance, and CDIA Metro 2 standards — current as of June 2026.

---

## 1. The Core Statutes

| Section | Title | What It Requires |
|---|---|---|
| **15 U.S.C. § 1681b** | Permissible purposes of consumer reports | A report (or any portion, including an inquiry) may only be pulled for a permissible purpose (credit application, employment with consent, account review, court order, etc.). No permissible purpose = unauthorized inquiry. |
| **15 U.S.C. § 1681c** | Requirements relating to information contained in consumer reports | Most adverse information must be removed after **7 years**. For collections/charge-offs, the clock starts **180 days after the original delinquency date** (Date of First Delinquency), giving roughly 7.5 years total. The clock does **not** reset when a debt is sold or a partial payment is made. |
| **15 U.S.C. § 1681c-1** | Identity theft prevention; fraud alerts | Consumers may place fraud alerts; furnishers/CRAs must take extra verification steps and may be required to block fraudulent information. |
| **15 U.S.C. § 1681e(b)** | Compliance procedures | CRAs must follow "reasonable procedures to assure maximum possible accuracy" of the information in a report. This is the baseline accuracy standard cited in nearly every dispute. |
| **15 U.S.C. § 1681i** | Procedure in case of disputed accuracy | The core reinvestigation statute (see Section 2 below — timelines). |
| **15 U.S.C. § 1681s-2(a)** | Furnisher duty: accuracy | Furnishers must not report information they know or have reasonable cause to believe is inaccurate. § 1681s-2(a)(5) specifically prohibits re-aging — reporting a delinquency date that is not the true original delinquency date. |
| **15 U.S.C. § 1681s-2(b)** | Furnisher duty: investigate disputes | Once notified of a dispute by a CRA, the furnisher must investigate, review all relevant information, report results to the CRA, and modify/delete/permanently block the information if it is found inaccurate or incomplete. |
| **15 U.S.C. § 1681n** | Civil liability — willful noncompliance | Statutory damages of **$100–$1,000** per violation (no need to prove actual harm), plus punitive damages and attorney's fees, if the violation was willful (intentional, knowing, or reckless disregard of FCRA duties — confirmed as the standard by the Supreme Court). |
| **15 U.S.C. § 1681o** | Civil liability — negligent noncompliance | Actual damages plus attorney's fees and costs (no statutory damages) for non-willful violations. |

**FDCPA § 1692g** (separate statute, applies to third-party debt collectors only, not original creditors or CRAs):
- Collector must send a written validation notice within 5 days of first contact, naming the creditor, amount, and the consumer's 30-day right to dispute.
- If the consumer disputes in writing within 30 days, the collector **must cease all collection activity** (including continued credit reporting in some interpretations) until it provides verification — an account statement, chain-of-assignment documentation, or the original creditor's name/address.
- Use this alongside FCRA § 1681s-2(b) for **collection account** disputes specifically — it adds a second, independent legal basis.

---

## 2. Reinvestigation Timeline (§ 1681i)

| Step | Deadline |
|---|---|
| CRA notifies the furnisher of the dispute | within **5 business days** of receiving the consumer's dispute |
| CRA completes reinvestigation, records current status or deletes the item | within **30 days** of receiving the dispute |
| Extension if consumer submits new relevant info during the 30-day window | up to **+15 days** (45 days total) |
| CRA sends written results of the reinvestigation to the consumer | within **5 business days** after the reinvestigation is complete |

**Practical note (2026 case law trend):** courts increasingly hold that if a disputed inaccuracy is not "objectively and readily verifiable" from the furnisher's own records, the furnisher/CRA may not be liable for failing to catch it through a standard reinvestigation. This means a strong dispute letter should make the inaccuracy as concrete and independently verifiable as possible — cite exact dates, exact counts, exact balances, not vague claims of "incorrect information."

---

## 3. CFPB Circular 2022-07 — What "Reasonable Investigation" Actually Means

This CFPB circular is the most consumer-favorable interpretive guidance currently in force and is safe to cite directly in a letter:

- A CRA or furnisher **cannot create extra preconditions** to investigating a dispute — e.g., demanding a specific form, notarized statement, or police report before they'll investigate. Doing so is itself a violation.
- The investigation duty **can extend to legal questions, not just factual ones** — e.g., whether a debt is time-barred, not just whether a number is typed correctly.
- A furnisher **cannot simply re-confirm its own internal records** when the dispute is exactly that those records are wrong. Mechanically verifying against the same source that produced the error is not a "reasonable" investigation.
- Any dispute forwarded by a CRA to a furnisher is presumed **not frivolous** and must be investigated — furnishers cannot wave it off as a duplicate or generic complaint.

---

## 4. Metro 2 Format — Why It Matters in a Dispute Letter

Metro 2 is the CDIA's standardized format that furnishers use to electronically report tradeline data to the bureaus. Citing the specific Metro 2 field affected by an error signals that the dispute is grounded in the furnisher's own technical reporting standard, not just a layperson's complaint. Key fields to reference by category:

| Metro 2 Field | What It Controls | Relevant Dispute Categories |
|---|---|---|
| Account Status Code | Open / Closed / Charge-off / Collection / etc. | Balance/Status Error, Account Closed/Paid Incorrectly, Cross-Bureau Inconsistency |
| Payment Rating / Payment History Profile | Monthly on-time vs. late grid | Late Payment Error |
| Current Balance | Dollar balance at time of reporting | Balance/Status Error |
| Date of First Delinquency (DOFD) | Anchors the 7-year obsolescence clock | Re-Aged Account, Obsolete (Past Reporting Limit) |
| Date Closed | When the account was closed | Account Closed/Paid Incorrectly |
| Special Comment | Free-text remarks (e.g., "settled," "disputed by consumer") | Collection Not Validated, Cross-Bureau Inconsistency |
| Account Number | Furnisher's unique identifier per tradeline | Duplicate Entry |
| Consumer Name / Address segment | Identity fields tied to the file | Personal Information Error, Not Mine (mixed file risk) |
| Inquiry Type / Permissible Purpose code | Why an inquiry was made | Unauthorized Inquiry |

The authoritative source for exact field definitions and valid status codes is CDIA's **Credit Reporting Resource Guide (CRRG)**, updated annually — cite "Metro 2 / CDIA reporting standards" generically rather than quoting CRRG field codes verbatim, since exact codes are licensed content.

---

## 5. Complete Dispute Category Catalog

Each entry: legal basis, what concrete evidence the letter must cite, and the exact remedy to demand (never a vague "please fix this").

### Not Mine
- **Basis:** § 1681i (right to accurate file); § 1681c-1 (fraud alert / identity theft rights if applicable)
- **Evidence needed:** consumer has no knowledge of the account; no application, signature, or transaction history exists
- **Remedy:** Delete entirely. Demand the furnisher produce the original signed application as proof of authorization — if none exists, deletion is mandatory.

### Inaccurate Information
- **Basis:** § 1681e(b) (maximum possible accuracy) + § 1681s-2(b) (furnisher duty to investigate)
- **Evidence needed:** the specific field that's wrong and what it should say instead, citing the inventory/report data
- **Remedy:** Correct to the verified value, or delete if unverifiable.

### Balance/Status Error
- **Basis:** § 1681e(b) + § 1681s-2(a)(1)
- **Evidence needed:** the exact reported balance and status, and why they're contradictory or wrong (e.g., "Closed" status with a non-zero balance still showing)
- **Remedy:** Correct — demand current account statements as proof, not an internal system summary.

### Obsolete (Past Reporting Limit)
- **Basis:** § 1681c(a)(4)
- **Evidence needed:** the DOFD and the calculated 7-year-plus-180-day deletion date
- **Remedy:** Delete immediately — no reinvestigation needed once the date math shows the item is past the legal limit.

### Unverifiable Debt
- **Basis:** § 1681i(a)(5)(A)
- **Evidence needed:** absence of any document trail tying the consumer to the debt amount/terms
- **Remedy:** Delete if the furnisher cannot produce original source documentation within the statutory window.

### Re-Aged Account
- **Basis:** § 1681s-2(a)(5); § 1681c(a)
- **Evidence needed:** the DOFD reported now vs. what the original creditor's records would show — re-aging means a furnisher reported a delinquency date later than the true original one to extend the reporting clock
- **Remedy:** Delete as an unlawfully re-aged entry; demand original creditor DOFD documentation
- **Case law:** *Richardson v. Fleet Bank of Massachusetts*, 190 F. Supp. 2d 81 (D. Mass. 2000)

### Duplicate Entry
- **Basis:** § 1681e(b)
- **Evidence needed:** two or more tradelines referencing the same underlying debt, different account numbers/creditor names
- **Remedy:** Delete the duplicate(s), retain one accurate entry only.

### Account Closed/Paid Incorrectly
- **Basis:** § 1681s-2(a)(1); § 1681s-2(b)
- **Evidence needed:** proof the account was closed/paid (e.g., consumer's own payoff records) vs. what's being reported
- **Remedy:** Correct status and closure date to match actual account records.

### Unauthorized Inquiry
- **Basis:** § 1681b(f) (no permissible purpose)
- **Evidence needed:** no known relationship or application with the inquiring company
- **Remedy:** Delete — demand written proof of permissible purpose; if none provided, removal is mandatory.
- **Case law:** *Dalton v. Capital Associated Industries, Inc.*, 257 F.3d 409 (4th Cir. 2001)

### Late Payment Error
- **Basis:** § 1681e(b); § 1681s-2(a)(1)
- **Evidence needed:** the specific late tier (30/60/90-day) and count reported, cross-checked against the consumer's actual payment records
- **Remedy:** Correct — demand original payment ledger, not an internal system query.
- **Case law:** *Johnson v. MBNA America Bank, N.A.*, 357 F.3d 426 (4th Cir. 2004) — furnisher's duty to investigate requires reviewing original account documents.

### Collection Not Validated
- **Basis:** § 1681s-2(b) (FCRA) **and** § 1692g (FDCPA, if a third-party collector)
- **Evidence needed:** absence of a debt validation response, or absence of chain-of-assignment documentation
- **Remedy:** Delete — demand (1) the assignment/purchase agreement showing legal standing to collect, and (2) signed validation confirming the amount owed.

### Personal Information Error
- **Basis:** § 1681e(b); § 1681i
- **Evidence needed:** a name or address on file with **no plausible connection** to the consumer — not simply a prior address in the same metro area, which is normal and should not be disputed
- **Remedy:** Correct the identifier; request a mixed-file audit of the rest of the file as a precaution.

### Cross-Bureau Inconsistency
- **Basis:** § 1681e(b); § 1681i(a)(4); CFPB Circular 2022-07 (uniform reporting duty)
- **Evidence needed:** the same account reported with **materially different**, quoted values across two bureaus — not cosmetic wording differences ("Closed" vs. "Account Closed By Credit Grantor" mean the same thing and should not be flagged)
- **Remedy:** Correct at all bureaus the furnisher reports to, so one accurate record exists everywhere.

---

## 6. Dispute Letter Best Practices

### Structure that works
1. **Consumer identification** — full name, address, last-4 SSN only (never the full SSN in any letter that could be intercepted), DOB
2. **Personal-authorship declaration** — state the letter was written and sent by the consumer personally, not a credit repair organization (CROA, 15 U.S.C. § 1679). This blocks the most common stall tactic: bureaus dismissing letters that look templated.
3. **Specific, quoted evidence per item** — exact account numbers, exact dates, exact dollar amounts, exact bureau names. Generic phrasing ("this is wrong," "please investigate") is the single biggest reason disputes get auto-rejected or form-lettered.
4. **The exact remedy demanded** — delete, correct, or reinvestigate, stated explicitly per item. Don't make the bureau guess what outcome you want.
5. **A response deadline with a receipt-confirmation ask** — request written confirmation of receipt within a specific number of business days. This creates a provable timeline if the bureau goes silent.
6. **Escalation notice** — name CFPB, FTC, and the state Attorney General specifically as where complaints will be filed if the FCRA isn't followed; cite §§ 1681n/1681o damages.
7. **Enclosures list** — ID, SSN card, proof of address (copies, never originals).
8. **Certified mail with return receipt** — the CFPB and FTC both recommend this; the return receipt date is what starts the legal 30-day clock and is your proof of when the bureau received it.

### What actually helps
- Citing **real case law** (1–2 directly relevant cases, not a long list) signals the consumer has done legal research and raises the credibility of the dispute.
- Citing the **specific Metro 2 field** affected, not just "Metro 2 generally."
- Quoting **CFPB Circular 2022-07** directly when a furnisher is likely to just re-verify its own broken record.
- One letter per creditor per bureau, with one paragraph per distinct disputable fact — bureaus and furnishers are required to investigate each disputed fact individually; bundling everything into one vague paragraph makes it easier to dismiss as one generic complaint.

### What to avoid
- **Inventing or estimating damages** (e.g., listing "$1,000 per category" for six unrelated harms) — that is not how FCRA statutory damages work; damages are $100–$1,000 per *violation*, decided by a court, not self-assessed in a letter. Including a fake damages tally undermines credibility.
- **Citing identity theft / 18 U.S.C. § 1028A** for an ordinary reporting error — that's a criminal identity-fraud statute, not a tool for disputing a late payment or balance error. Misapplying it can make the entire letter look frivolous.
- **Naming specific past CFPB enforcement actions/fines against the bureau** — these are factually volatile, easy to fact-check as outdated, and read as boilerplate copied from a template site.
- **"No law requires power of attorney" boilerplate** — unnecessary unless someone is challenging your right to dispute on your own behalf; including it preemptively signals templated content.
- **Vague claims with no underlying data** — if you can't cite a real date, count, or balance from the actual report, the dispute likely shouldn't be sent at all; CRAs are increasingly protected when an error isn't "objectively and readily verifiable."
- **Disputing a prior address as "unrecognized"** — credit reports routinely list addresses going back 7+ years; only flag an address with no plausible geographic connection to the consumer.

---

## 7. Sources

- [15 U.S. Code § 1681i - Procedure in case of disputed accuracy](https://www.law.cornell.edu/uscode/text/15/1681i)
- [Fair Credit Reporting Act 15 U.S.C § 1681 — FTC, March 2026](https://www.ftc.gov/system/files/ftc_gov/pdf/fcra-march-2026.pdf)
- [Consumer Financial Protection Circular 2022-07: Reasonable Investigation of Consumer Reporting Disputes](https://www.consumerfinance.gov/compliance/circulars/consumer-financial-protection-circular-2022-07-reasonable-investigation-of-consumer-reporting-disputes/)
- [Most Common Fair Credit Reporting Act Violations — Nolo](https://www.nolo.com/legal-encyclopedia/most-common-violations-the-fcra.html)
- [Metro 2® Format for Credit Reporting — CDIA](https://www.cdiaonline.org/resources/furnishers-of-data-overview/metro2-information/)
- [15 U.S. Code § 1681c - Requirements relating to information contained in consumer reports](https://www.law.cornell.edu/uscode/text/15/1681c)
- [Re-Aged Debt Disputes: Fix an Incorrect Date of Delinquency — Consumer Litigation Associates](https://clalegal.com/re-aged-debt-disputes-fix-an-incorrect-date-of-delinquency-fast/)
- [SAMPLE LETTER: Credit report dispute — CFPB](https://files.consumerfinance.gov/f/documents/092016_cfpb__CreditReportingSampleLetter.pdf)
- [Disputing Errors in a Credit Report — National Consumer Law Center](https://www.nclc.org/wp-content/uploads/2022/09/cf_disputing-errors-in-a-credit-report.pdf)
- [15 U.S. Code § 1681n - Civil liability for willful noncompliance](https://www.law.cornell.edu/uscode/text/15/1681n)
- [15 U.S. Code § 1681o - Civil liability for negligent noncompliance](https://www.law.cornell.edu/uscode/text/15/1681o)
- [15 U.S. Code § 1692g - Validation of debts](https://www.law.cornell.edu/uscode/text/15/1692g)
- [§ 1006.34 Notice for validation of debts — CFPB](https://www.consumerfinance.gov/rules-policy/regulations/1006/34/)
