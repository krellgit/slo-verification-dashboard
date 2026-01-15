// Test script for verification engine
import * as fs from 'fs';
import * as path from 'path';
import { verify } from '../src/lib/verificationEngine';
import { VerificationInput } from '../src/lib/inputTypes';

// Path to test data
const testFilePath = '/mnt/c/Users/Krell/Documents/Imps/Gits/saas-listing-optimization/Test1-B0DQ196WLW.txt';

function parseTestFile(filePath: string): VerificationInput {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Find section indices
  const sections: Record<string, number> = {};
  const sectionNames = [
    'Product Profile',
    'Search Terms',
    'intent_themes_processed',
    'USPs',
    'Keywords',
    'Bundles'
  ];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (sectionNames.includes(trimmed)) {
      sections[trimmed] = idx;
    }
  });

  console.log('Found sections at lines:', sections);

  // Extract Product Profile (M1)
  let m1Data: any = null;
  if (sections['Product Profile']) {
    const startLine = sections['Product Profile'] + 1;
    const endLine = sections['Search Terms'] || lines.length;
    const jsonStr = lines.slice(startLine, endLine).join('\n').trim();
    try {
      m1Data = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse Product Profile:', e);
    }
  }

  // Extract Intent Themes (M2.1)
  let m21Data: any = null;
  if (sections['intent_themes_processed']) {
    const startLine = sections['intent_themes_processed'] + 1;
    const endLine = sections['USPs'] || lines.length;
    const jsonStr = lines.slice(startLine, endLine).join('\n').trim();
    try {
      m21Data = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse Intent Themes:', e);
    }
  }

  // Extract USPs (M2.3)
  let m23Data: any = null;
  if (sections['USPs']) {
    const startLine = sections['USPs'] + 1;
    const endLine = sections['Keywords'] || lines.length;
    const jsonStr = lines.slice(startLine, endLine).join('\n').trim();
    try {
      m23Data = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse USPs:', e);
    }
  }

  // Extract Keywords (M3)
  let m3Data: any = null;
  if (sections['Keywords']) {
    const startLine = sections['Keywords'] + 1;
    const endLine = sections['Bundles'] || lines.length;
    const jsonStr = lines.slice(startLine, endLine).join('\n').trim();
    try {
      m3Data = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse Keywords:', e);
    }
  }

  // Transform to VerificationInput format
  const input: VerificationInput = {
    asin: 'B0DQ196WLW',
    product_name: 'OBSBOT Meet SE 1080P Webcam',
    m1: m1Data ? {
      product_type: m1Data.product_type,
      category_path: m1Data.category?.join(' > '),
      key_attributes: m1Data.key_attributes,
      initial_keywords: m1Data.initial_keyword_ideas,
      truth_set: {
        brand: 'OBSBOT',
        product_name: 'OBSBOT Meet SE',
        features: m1Data.key_attributes
      }
    } : undefined,
    m2_1: m21Data ? {
      themes: m21Data.map((t: any, idx: number) => ({
        id: `theme_${idx + 1}`,
        name: t.name,
        score: t.importance_score,
        quotes: t.desires || []
      }))
    } : undefined,
    m2_3: m23Data ? {
      usps: m23Data.map((u: any) => ({
        id: `usp_${u.usp_id}`,
        statement: u.point,
        tags: u.themes,
        scores: {
          customer_relevance: u.customer_relevance_score,
          competitive_uniqueness: u.competitive_uniqueness_score,
          market_impact: u.market_impact_potential
        },
        total_score: u.total_usp_score,
        priority: u.priority_type
      }))
    } : undefined,
    m3: m3Data?.enriched ? {
      keywords: m3Data.enriched.map((k: any) => ({
        keyword: k.keyword_text,
        keyword_canonical: k.keyword_canonical,
        score: k.keyword_strength_score,
        tier: k.priority_tier,
        components: {
          product_intent_relevance: k.product_intent_relevance,
          competitor_alignment_score: k.competitor_alignment_score,
          search_demand_score: k.search_demand_score
        },
        usp_bonus: k.usp_bonus,
        risk_flag: k.risk_flag || 'none',
        linked_usp: k.primary_usp_id ? `usp_${k.primary_usp_id}` : undefined
      }))
    } : undefined
  };

  return input;
}

async function runTest() {
  console.log('='.repeat(60));
  console.log('SLOVD Verification Engine Test');
  console.log('='.repeat(60));
  console.log();

  try {
    const input = parseTestFile(testFilePath);

    console.log('Parsed input summary:');
    console.log(`  ASIN: ${input.asin}`);
    console.log(`  Product: ${input.product_name}`);
    console.log(`  M1 (Product Context): ${input.m1 ? 'Present' : 'Missing'}`);
    console.log(`  M2.1 (Customer Intent): ${input.m2_1 ? `${input.m2_1.themes?.length || 0} themes` : 'Missing'}`);
    console.log(`  M2.3 (USP Evaluation): ${input.m2_3 ? `${input.m2_3.usps?.length || 0} USPs` : 'Missing'}`);
    console.log(`  M3 (Keywords): ${input.m3 ? `${input.m3.keywords?.length || 0} keywords` : 'Missing'}`);
    console.log();

    // Run verification
    console.log('Running verification...');
    console.log();

    const result = verify(input);

    // Display results
    console.log('='.repeat(60));
    console.log('VERIFICATION RESULTS');
    console.log('='.repeat(60));
    console.log();
    console.log(`Run ID: ${result.runId}`);
    console.log(`Overall Status: ${result.status}`);
    console.log(`Total Checks: ${result.summary.totalChecks}`);
    console.log(`  Passed: ${result.summary.passed}`);
    console.log(`  Failed: ${result.summary.failed}`);
    console.log(`  Review: ${result.summary.review}`);
    console.log(`  Blocked: ${result.summary.blocked}`);
    console.log();

    // Show each module's results
    for (const mod of result.modules) {
      console.log(`\n${mod.id}: ${mod.name}`);
      console.log(`  Status: ${mod.status}`);
      console.log(`  Passed: ${mod.checksPassed}/${mod.checksTotal}`);

      // Show failures and reviews
      mod.checks.filter(c => c.status !== 'PASS').forEach(check => {
        console.log(`  [${check.status}] ${check.id}: ${check.name}`);
        if (check.detail) console.log(`    Detail: ${check.detail}`);
        if (check.issue) {
          console.log(`    Issue: ${check.issue.reason}`);
        }
      });
    }

    console.log();
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest();
