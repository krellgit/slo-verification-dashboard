const fs = require('fs');
const path = require('path');

// Import parser - adjust path based on build output
let parseReport;
try {
  // Try compiled version first
  const parser = require('../.next/server/chunks/src_lib_reportParser_ts.js');
  parseReport = parser.parseReport;
} catch {
  try {
    // Try direct import (development)
    const parser = require('../src/lib/reportParser.ts');
    parseReport = parser.parseReport;
  } catch {
    console.error('Could not load reportParser. Make sure to build the project first with: npm run build');
    process.exit(1);
  }
}

// Test all samples
const sampleFiles = [
  'B0006SW71G_Alice@keplercommerce.com_Test40_20260121_093330.json',
  'B0007P5G8Y_hauleeyang@keplercommerce.com_Test11_20260121_031347.json',
  'B000HQIX2O_hauleeyang@keplercommerce.com_Test12a_20260121_084119.json',
  'B000I09B3Y_Alice@keplercommerce.com_Test41_20260122_091659.json',
  'B002VWK3X4_hauleeyang@keplercommerce.com_Test30_20260121_071942.json',
];

const samplesDir = path.join(__dirname, '../Output samples/');

console.log('='.repeat(80));
console.log('SLO VERIFICATION DASHBOARD - PARSER TEST');
console.log('='.repeat(80));
console.log(`Testing ${sampleFiles.length} sample JSON files\n`);

sampleFiles.forEach((file, index) => {
  console.log(`\n[${ index + 1}/${sampleFiles.length}] Testing: ${file}`);
  console.log('-'.repeat(80));

  try {
    const filePath = path.join(samplesDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(`  ❌ File not found: ${filePath}`);
      return;
    }

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const parsed = parseReport(raw);

    // Basic Info
    console.log(`  ASIN: ${parsed.asin}`);
    console.log(`  Product: ${parsed.product_name}`);
    console.log('');

    // Module Status
    console.log('  Module Status:');
    console.log(`    M1 (Product Context):      ${parsed.m1 ? '✅ Present' : '❌ Missing'}`);
    console.log(`    M2 (Competitor Discovery): ${parsed.m2 ? '✅ Present' : '❌ Missing'}`);
    console.log(`    M2.1 (Customer Intent):    ${parsed.m2_1 ? `✅ ${parsed.m2_1.themes?.length || 0} themes` : '❌ Missing'}`);
    console.log(`    M2.3 (USP Evaluation):     ${parsed.m2_3 ? `✅ ${parsed.m2_3.usps?.length || 0} USPs` : '❌ Missing'}`);
    console.log(`    M3 (Keyword Intelligence): ${parsed.m3 ? `✅ ${parsed.m3.keywords?.length || 0} keywords` : '❌ Missing'}`);
    console.log(`    M4 (Listing Creation):     ${parsed.m4 ? '✅ Present' : '❌ Missing'}`);
    console.log('');

    // M1 Details
    if (parsed.m1) {
      console.log('  M1 Details:');
      console.log(`    Brand: ${parsed.m1.truth_set?.brand || '⚠️  Missing'}`);
      console.log(`    Product Name: ${parsed.m1.truth_set?.product_name ? '✅' : '⚠️  Missing'}`);
      console.log(`    Features: ${parsed.m1.truth_set?.features?.length || 0} items`);
      console.log('');
    }

    // M2 Details
    if (parsed.m2) {
      console.log('  M2 Details:');
      console.log(`    Search Terms: ${parsed.m2.search_terms?.length || 0} items`);
      console.log(`    Raw Competitors: ${parsed.m2.raw_list?.length || '⚠️  Missing'}`);
      console.log(`    Trimmed Competitors: ${parsed.m2.trimmed_list?.length || '⚠️  Missing'}`);
      console.log(`    Final Competitors: ${parsed.m2.final_list?.length || '⚠️  Missing'}`);
      console.log('');
    }

    // M2.1 Theme Names
    if (parsed.m2_1?.themes) {
      console.log('  M2.1 Theme Names:');
      const themeNames = parsed.m2_1.themes.map(t => t.name).join(', ');
      console.log(`    ${themeNames}`);
      console.log('');
    }

    // M2.3 USP Priorities
    if (parsed.m2_3?.usps) {
      console.log('  M2.3 USP Priorities:');
      const priorities = {
        Primary: 0,
        Secondary: 0,
        Tertiary: 0,
        undefined: 0
      };
      parsed.m2_3.usps.forEach(u => {
        priorities[u.priority || 'undefined']++;
      });
      console.log(`    Primary: ${priorities.Primary}, Secondary: ${priorities.Secondary}, Tertiary: ${priorities.Tertiary}, Undefined: ${priorities.undefined}`);
      console.log('');
    }

    // M3 Keyword Tiers (CRITICAL TEST)
    if (parsed.m3?.keywords) {
      console.log('  M3 Keyword Tiers (CRITICAL):');
      const tiersCount = {
        Primary: 0,
        Secondary: 0,
        'Long-tail': 0,
        Excluded: 0,
        undefined: 0
      };
      parsed.m3.keywords.forEach(k => {
        tiersCount[k.tier || 'undefined']++;
      });
      console.log(`    Primary: ${tiersCount.Primary}`);
      console.log(`    Secondary: ${tiersCount.Secondary}`);
      console.log(`    Long-tail: ${tiersCount['Long-tail']}`);
      console.log(`    Excluded: ${tiersCount.Excluded}`);
      console.log(`    Undefined: ${tiersCount.undefined} ${tiersCount.undefined > 0 ? '❌ FAIL - Keywords missing tier!' : '✅ PASS'}`);
      console.log('');
    }

    // M4 Listing Details
    if (parsed.m4) {
      console.log('  M4 Listing Details:');
      console.log(`    Title: ${parsed.m4.title ? '✅ Present' : '❌ Missing'}`);
      console.log(`    Bullets: ${parsed.m4.bullets?.length || 0} items`);
      console.log(`    Description: ${parsed.m4.description ? '✅ Present' : '❌ Missing'}`);
      console.log(`    Backend Terms: ${parsed.m4.backend_terms ? '✅ Present' : '❌ Missing'}`);
    }

    console.log('');
    console.log(`  ✅ Parsing completed successfully for ${file}`);

  } catch (error) {
    console.error(`  ❌ ERROR parsing ${file}:`, error.message);
  }
});

console.log('\n' + '='.repeat(80));
console.log('TEST COMPLETE');
console.log('='.repeat(80));
