// Diagnostic harness for src/lib/openai.ts's two-call pipeline.
//
// Isolates whether negativeItems-count variance comes from Call 1
// (extraction reconstructing the flattened 3-column PDF text) or Call 2
// (the five-pass rule engine making inconsistent judgment calls on otherwise
// identical facts). Not part of the production app -- run with:
//
//   npx tsx scripts/run-pipeline.ts extract-only
//   npx tsx scripts/run-pipeline.ts analyze-only --inventory scripts/output/<file>.json
//   npx tsx scripts/run-pipeline.ts full
//
// Reads APP_OPENAI_KEY from .env.local (no dotenv dependency -- this is
// throwaway/internal tooling). Every run's raw output is dumped to
// scripts/output/ (gitignored) for diffing between runs.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const FIXTURE_PATH = join(__dirname, 'fixtures', 'sample-report.txt');
const OUTPUT_DIR = join(__dirname, 'output');

function loadEnvLocal(): void {
  const envPath = join(ROOT, '.env.local');
  if (!existsSync(envPath)) {
    throw new Error(`.env.local not found at ${envPath}`);
  }
  const lines = readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
  if (!process.env.APP_OPENAI_KEY) {
    throw new Error('APP_OPENAI_KEY not found in .env.local');
  }
}

loadEnvLocal();

/* eslint-disable @typescript-eslint/no-var-requires */
const { __test__ } = require(join(ROOT, 'src', 'lib', 'openai'));
const { extractReportData, runAnalysisCall, formatInventory, computeMinimumExpectedItems, getClient } = __test__;

const SYNTHETIC_USER_INFO = {
  first: 'Chad',
  last: 'Nicely',
  dob: '1976-01-24',
  ssn: '000-00-0000',
  address: '376 Santa Candida St',
  city: 'Las Vegas',
  state: 'NV',
  zip: '89138',
};

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function dump(label: string, data: unknown): string {
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  const path = join(OUTPUT_DIR, `${timestamp()}__${label}.json`);
  writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(`[dump] ${label} -> ${path}`);
  return path;
}

function summarizeItems(items: any[]): string[] {
  return items.map((i) => `${i.creditor} | ${i.disputeCategory} | bureaus=${(i.bureaus ?? []).join(',')}`);
}

async function runExtractOnly(): Promise<void> {
  const client = getClient();
  const pdfText = readFileSync(FIXTURE_PATH, 'utf-8');
  const extraction = await extractReportData(
    client,
    pdfText,
    `${SYNTHETIC_USER_INFO.first} ${SYNTHETIC_USER_INFO.last}`,
    `${SYNTHETIC_USER_INFO.address}, ${SYNTHETIC_USER_INFO.city}, ${SYNTHETIC_USER_INFO.state} ${SYNTHETIC_USER_INFO.zip}`,
  );
  const dofdValues = extraction.accounts.map((a: any) => a.dofd).filter((d: unknown) => d !== null);
  console.log(`accounts: ${extraction.accounts.length}`);
  console.log(`personalInfoItems: ${extraction.personalInfoItems.length}`);
  console.log(`hardInquiries: ${extraction.hardInquiries.length}`);
  console.log(`non-null dofd count: ${dofdValues.length} ${dofdValues.length > 0 ? `(VALUES: ${JSON.stringify(dofdValues)})` : ''}`);
  dump('extraction', extraction);
}

async function runAnalyzeOnly(inventoryPath: string): Promise<void> {
  const client = getClient();
  let inventory: string;
  if (inventoryPath.endsWith('.json')) {
    const extraction = JSON.parse(readFileSync(inventoryPath, 'utf-8'));
    inventory = formatInventory(extraction);
  } else {
    inventory = readFileSync(inventoryPath, 'utf-8');
  }
  const result = await runAnalysisCall(
    client,
    inventory,
    `${SYNTHETIC_USER_INFO.first} ${SYNTHETIC_USER_INFO.last}`,
    `${SYNTHETIC_USER_INFO.address}, ${SYNTHETIC_USER_INFO.city}, ${SYNTHETIC_USER_INFO.state} ${SYNTHETIC_USER_INFO.zip}`,
    42,
  );
  console.log(`negativeItems: ${result.negativeItems.length}`);
  for (const line of summarizeItems(result.negativeItems)) console.log(`  - ${line}`);
  dump('analysis', result);
}

async function runFull(): Promise<void> {
  const pdfText = readFileSync(FIXTURE_PATH, 'utf-8');
  // Mirror analyzeReport()'s logic directly (rather than importing it) so we
  // can log which attempt (first vs retry) was kept and why.
  const client = getClient();
  const fullName = `${SYNTHETIC_USER_INFO.first} ${SYNTHETIC_USER_INFO.last}`;
  const fullAddress = `${SYNTHETIC_USER_INFO.address}, ${SYNTHETIC_USER_INFO.city}, ${SYNTHETIC_USER_INFO.state} ${SYNTHETIC_USER_INFO.zip}`;

  const t0 = Date.now();
  const extraction = await extractReportData(client, pdfText, fullName, fullAddress);
  const t1 = Date.now();
  console.log(`[timing] extraction (Call 1): ${t1 - t0}ms`);
  const inventory = formatInventory(extraction);
  const minimumExpected = computeMinimumExpectedItems(extraction);
  console.log(`minimumExpected (code-side floor): ${minimumExpected}`);

  const [firstResult, retryResult] = await Promise.all([
    runAnalysisCall(client, inventory, fullName, fullAddress, 42),
    runAnalysisCall(client, inventory, fullName, fullAddress, 99),
  ]);
  const t2 = Date.now();
  console.log(`[timing] Call 2 raced (${firstResult.negativeItems.length} vs ${retryResult.negativeItems.length} items): ${t2 - t1}ms`);

  const usedRetry = retryResult.negativeItems.length >= firstResult.negativeItems.length;
  const kept = usedRetry ? retryResult : firstResult;
  if (firstResult.negativeItems.length < minimumExpected && retryResult.negativeItems.length < minimumExpected) {
    console.log(`Both attempts below floor (${minimumExpected})`);
  }
  console.log(`[timing] TOTAL: ${Date.now() - t0}ms`);

  console.log(`KEPT: ${usedRetry ? 'retry' : 'first'} attempt -- ${kept.negativeItems.length} items`);
  for (const line of summarizeItems(kept.negativeItems)) console.log(`  - ${line}`);
  dump('full', { minimumExpected, usedRetry, result: kept });
}

async function main(): Promise<void> {
  const [mode, ...rest] = process.argv.slice(2);
  if (mode === 'extract-only') {
    await runExtractOnly();
  } else if (mode === 'analyze-only') {
    const idx = rest.indexOf('--inventory');
    const inventoryPath = idx !== -1 ? rest[idx + 1] : undefined;
    if (!inventoryPath) throw new Error('analyze-only requires --inventory <path>');
    await runAnalyzeOnly(inventoryPath);
  } else if (mode === 'full') {
    await runFull();
  } else {
    console.error('Usage: npx tsx scripts/run-pipeline.ts <extract-only|analyze-only --inventory <path>|full>');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
