// M3 (Keyword Intelligence) and M4 (Listing Creation) verification checks

import { CheckResult } from '../types';
import {
  KeywordIntelligenceInput,
  ListingCreationInput,
  DEFAULT_BANNED_TERMS,
} from '../inputTypes';

// ============================================================================
// M3: Keyword Intelligence Checks (8 checks)
// ============================================================================

/**
 * M3-01: At least 5 keywords with tier='Primary'
 */
function checkM3_01(input: KeywordIntelligenceInput): CheckResult {
  const keywords = input.keywords || [];
  const primaryKeywords = keywords.filter((kw) => kw.tier === 'Primary');
  const count = primaryKeywords.length;

  if (count >= 5) {
    return {
      id: 'M3-01',
      name: 'At least 5 primary keywords',
      status: 'PASS',
      detail: `Found ${count} primary keywords`,
    };
  }

  return {
    id: 'M3-01',
    name: 'At least 5 primary keywords',
    status: 'FAIL',
    detail: `Only ${count} primary keywords found`,
    issue: {
      item: 'Primary keyword count',
      expected: 'At least 5',
      actual: String(count),
      reason: 'Insufficient primary keywords for effective listing optimization',
    },
    actions: ['Add more high-value keywords and assign them Primary tier'],
  };
}

/**
 * M3-02: Every keyword has score
 */
function checkM3_02(input: KeywordIntelligenceInput): CheckResult {
  const keywords = input.keywords || [];
  const missingScore = keywords.filter(
    (kw) => kw.score === undefined || kw.score === null
  );

  if (missingScore.length === 0) {
    return {
      id: 'M3-02',
      name: 'Every keyword has score',
      status: 'PASS',
      detail: `All ${keywords.length} keywords have scores`,
    };
  }

  return {
    id: 'M3-02',
    name: 'Every keyword has score',
    status: 'FAIL',
    detail: `${missingScore.length} keywords missing scores`,
    issue: {
      item: 'Keywords without scores',
      expected: 'All keywords must have a score',
      actual: missingScore.map((kw) => kw.keyword).slice(0, 5).join(', '),
      reason: 'Scores are required for keyword prioritization',
    },
    actions: ['Calculate scores for all keywords using the scoring formula'],
  };
}

/**
 * M3-03: Score formula validation
 * Formula: score = 0.60*PIR + 0.20*CAS + 0.20*SDS + usp_bonus (±1 tolerance)
 */
function checkM3_03(input: KeywordIntelligenceInput): CheckResult {
  const keywords = input.keywords || [];
  const invalidScores: string[] = [];

  for (const kw of keywords) {
    if (kw.score === undefined || !kw.components) continue;

    const pir = kw.components.product_intent_relevance || 0;
    const cas = kw.components.competitor_alignment_score || 0;
    const sds = kw.components.search_demand_score || 0;
    const uspBonus = kw.usp_bonus || 0;

    const expectedScore = 0.6 * pir + 0.2 * cas + 0.2 * sds + uspBonus;
    const diff = Math.abs(kw.score - expectedScore);

    if (diff > 1) {
      invalidScores.push(
        `${kw.keyword} (expected: ${expectedScore.toFixed(2)}, actual: ${kw.score})`
      );
    }
  }

  if (invalidScores.length === 0) {
    return {
      id: 'M3-03',
      name: 'Score formula matches',
      status: 'PASS',
      detail: 'All keyword scores match the formula within tolerance',
    };
  }

  return {
    id: 'M3-03',
    name: 'Score formula matches',
    status: 'FAIL',
    detail: `${invalidScores.length} keywords have incorrect scores`,
    issue: {
      item: 'Score calculation mismatch',
      expected: 'score = 0.60*PIR + 0.20*CAS + 0.20*SDS + usp_bonus (±1)',
      actual: invalidScores.slice(0, 3).join('; '),
      reason: 'Scores must follow the standard formula for consistency',
    },
    actions: ['Recalculate scores using the correct formula'],
  };
}

/**
 * M3-04: Every keyword has exactly one tier
 */
function checkM3_04(input: KeywordIntelligenceInput): CheckResult {
  const keywords = input.keywords || [];
  const validTiers = ['Primary', 'Secondary', 'Long-tail', 'Excluded'];
  const invalidKeywords = keywords.filter(
    (kw) => !kw.tier || !validTiers.includes(kw.tier)
  );

  if (invalidKeywords.length === 0) {
    return {
      id: 'M3-04',
      name: 'Every keyword has exactly one tier',
      status: 'PASS',
      detail: `All ${keywords.length} keywords have valid tiers`,
    };
  }

  return {
    id: 'M3-04',
    name: 'Every keyword has exactly one tier',
    status: 'FAIL',
    detail: `${invalidKeywords.length} keywords have invalid or missing tiers`,
    issue: {
      item: 'Keywords with invalid tiers',
      expected: 'One of: Primary, Secondary, Long-tail, Excluded',
      actual: invalidKeywords.map((kw) => `${kw.keyword}: ${kw.tier || 'none'}`).slice(0, 5).join(', '),
      reason: 'Each keyword must be assigned to exactly one tier',
    },
    actions: ['Assign a valid tier to each keyword'],
  };
}

/**
 * M3-05: No duplicate keyword_canonical
 */
function checkM3_05(input: KeywordIntelligenceInput): CheckResult {
  const keywords = input.keywords || [];
  const canonicalMap = new Map<string, number>();
  const duplicates: string[] = [];

  for (const kw of keywords) {
    const canonical = kw.keyword_canonical || kw.keyword;
    const count = (canonicalMap.get(canonical) || 0) + 1;
    canonicalMap.set(canonical, count);
    if (count === 2) {
      duplicates.push(canonical);
    }
  }

  if (duplicates.length === 0) {
    return {
      id: 'M3-05',
      name: 'No duplicate keyword_canonical',
      status: 'PASS',
      detail: `All ${keywords.length} canonical keywords are unique`,
    };
  }

  return {
    id: 'M3-05',
    name: 'No duplicate keyword_canonical',
    status: 'FAIL',
    detail: `${duplicates.length} duplicate canonical keywords found`,
    issue: {
      item: 'Duplicate canonical keywords',
      expected: 'All keyword_canonical values must be unique',
      actual: duplicates.slice(0, 5).join(', '),
      reason: 'Duplicate keywords waste space and reduce listing quality',
    },
    actions: ['Remove or merge duplicate keywords'],
  };
}

/**
 * M3-06: Every approved USP has a bundle in usp_bundles
 */
function checkM3_06(input: KeywordIntelligenceInput): CheckResult {
  const approvedUsps = input.approved_usps || [];
  const uspBundles = input.usp_bundles || [];
  const bundleUspIds = new Set(uspBundles.map((b) => b.usp_id));
  const missingBundles = approvedUsps.filter((usp) => !bundleUspIds.has(usp.id));

  if (missingBundles.length === 0) {
    return {
      id: 'M3-06',
      name: 'Every approved USP has a bundle',
      status: 'PASS',
      detail: `All ${approvedUsps.length} approved USPs have keyword bundles`,
    };
  }

  return {
    id: 'M3-06',
    name: 'Every approved USP has a bundle',
    status: 'FAIL',
    detail: `${missingBundles.length} approved USPs missing bundles`,
    issue: {
      item: 'USPs without keyword bundles',
      expected: 'Every approved USP should have a keyword bundle',
      actual: missingBundles.map((usp) => usp.id).join(', '),
      reason: 'USPs need associated keywords for effective listing optimization',
    },
    actions: ['Create keyword bundles for each approved USP'],
  };
}

/**
 * M3-07: No keywords with risk_flag='high' in bundles
 */
function checkM3_07(input: KeywordIntelligenceInput): CheckResult {
  const keywords = input.keywords || [];
  const uspBundles = input.usp_bundles || [];

  // Build a set of all keywords in bundles
  const bundleKeywords = new Set<string>();
  for (const bundle of uspBundles) {
    for (const kw of bundle.keywords) {
      bundleKeywords.add(kw.toLowerCase());
    }
  }

  // Find high-risk keywords that are in bundles
  const highRiskInBundles = keywords.filter(
    (kw) =>
      kw.risk_flag === 'high' &&
      (bundleKeywords.has(kw.keyword.toLowerCase()) ||
        bundleKeywords.has((kw.keyword_canonical || '').toLowerCase()))
  );

  if (highRiskInBundles.length === 0) {
    return {
      id: 'M3-07',
      name: 'No high-risk keywords in bundles',
      status: 'PASS',
      detail: 'No high-risk keywords found in USP bundles',
    };
  }

  return {
    id: 'M3-07',
    name: 'No high-risk keywords in bundles',
    status: 'FAIL',
    detail: `${highRiskInBundles.length} high-risk keywords found in bundles`,
    issue: {
      item: 'High-risk keywords in bundles',
      expected: 'No keywords with risk_flag=high in bundles',
      actual: highRiskInBundles.map((kw) => kw.keyword).slice(0, 5).join(', '),
      reason: 'High-risk keywords may cause listing suppression or policy violations',
    },
    actions: ['Remove high-risk keywords from USP bundles or reassess their risk level'],
  };
}

/**
 * M3-08: Each bundle has at least 3 keywords
 */
function checkM3_08(input: KeywordIntelligenceInput): CheckResult {
  const uspBundles = input.usp_bundles || [];
  const smallBundles = uspBundles.filter((b) => b.keywords.length < 3);

  if (smallBundles.length === 0) {
    return {
      id: 'M3-08',
      name: 'Each bundle has at least 3 keywords',
      status: 'PASS',
      detail: `All ${uspBundles.length} bundles have sufficient keywords`,
    };
  }

  return {
    id: 'M3-08',
    name: 'Each bundle has at least 3 keywords',
    status: 'FAIL',
    detail: `${smallBundles.length} bundles have fewer than 3 keywords`,
    issue: {
      item: 'Bundles with insufficient keywords',
      expected: 'At least 3 keywords per bundle',
      actual: smallBundles.map((b) => `${b.usp_id}: ${b.keywords.length} keywords`).join(', '),
      reason: 'Bundles need enough keywords for effective coverage',
    },
    actions: ['Add more relevant keywords to small bundles'],
  };
}

/**
 * Run all M3 (Keyword Intelligence) verification checks
 */
export function verifyM3(input: KeywordIntelligenceInput): CheckResult[] {
  return [
    checkM3_01(input),
    checkM3_02(input),
    checkM3_03(input),
    checkM3_04(input),
    checkM3_05(input),
    checkM3_06(input),
    checkM3_07(input),
    checkM3_08(input),
  ];
}

// ============================================================================
// M4: Listing Creation Checks (10 checks)
// ============================================================================

/**
 * M4-01: title.length <= 200
 */
function checkM4_01(input: ListingCreationInput): CheckResult {
  const title = input.title || '';
  const length = title.length;

  if (length <= 200) {
    return {
      id: 'M4-01',
      name: 'Title length <= 200',
      status: 'PASS',
      detail: `Title length: ${length} characters`,
    };
  }

  return {
    id: 'M4-01',
    name: 'Title length <= 200',
    status: 'FAIL',
    detail: `Title is ${length - 200} characters over limit`,
    issue: {
      item: 'Title length',
      expected: 'Maximum 200 characters',
      actual: `${length} characters`,
      reason: 'Amazon truncates titles that exceed the character limit',
    },
    actions: ['Shorten the title to 200 characters or less'],
  };
}

/**
 * M4-02: bullets.length === 5
 */
function checkM4_02(input: ListingCreationInput): CheckResult {
  const bullets = input.bullets || [];
  const count = bullets.length;

  if (count === 5) {
    return {
      id: 'M4-02',
      name: 'Exactly 5 bullets',
      status: 'PASS',
      detail: 'Listing has exactly 5 bullet points',
    };
  }

  return {
    id: 'M4-02',
    name: 'Exactly 5 bullets',
    status: 'FAIL',
    detail: `Found ${count} bullets instead of 5`,
    issue: {
      item: 'Bullet count',
      expected: 'Exactly 5 bullets',
      actual: `${count} bullets`,
      reason: 'Amazon listings should have exactly 5 bullet points for optimal display',
    },
    actions: count < 5 ? ['Add more bullet points'] : ['Remove excess bullet points'],
  };
}

/**
 * M4-03: Every bullet.length <= 500
 */
function checkM4_03(input: ListingCreationInput): CheckResult {
  const bullets = input.bullets || [];
  const longBullets = bullets
    .map((b, i) => ({ index: i + 1, length: b.length }))
    .filter((b) => b.length > 500);

  if (longBullets.length === 0) {
    return {
      id: 'M4-03',
      name: 'Every bullet <= 500 characters',
      status: 'PASS',
      detail: 'All bullets are within character limit',
    };
  }

  return {
    id: 'M4-03',
    name: 'Every bullet <= 500 characters',
    status: 'FAIL',
    detail: `${longBullets.length} bullets exceed 500 characters`,
    issue: {
      item: 'Bullet length',
      expected: 'Maximum 500 characters per bullet',
      actual: longBullets.map((b) => `Bullet ${b.index}: ${b.length} chars`).join(', '),
      reason: 'Long bullets may be truncated or rejected by Amazon',
    },
    actions: ['Shorten bullets that exceed 500 characters'],
  };
}

/**
 * M4-04: description.length <= 2000
 */
function checkM4_04(input: ListingCreationInput): CheckResult {
  const description = input.description || '';
  const length = description.length;

  if (length <= 2000) {
    return {
      id: 'M4-04',
      name: 'Description <= 2000 characters',
      status: 'PASS',
      detail: `Description length: ${length} characters`,
    };
  }

  return {
    id: 'M4-04',
    name: 'Description <= 2000 characters',
    status: 'FAIL',
    detail: `Description is ${length - 2000} characters over limit`,
    issue: {
      item: 'Description length',
      expected: 'Maximum 2000 characters',
      actual: `${length} characters`,
      reason: 'Amazon truncates descriptions that exceed the character limit',
    },
    actions: ['Shorten the description to 2000 characters or less'],
  };
}

/**
 * M4-05: backend_terms byte size <= 249
 */
function checkM4_05(input: ListingCreationInput): CheckResult {
  const backendTerms = input.backend_terms || '';
  const byteSize = new TextEncoder().encode(backendTerms).length;

  if (byteSize <= 249) {
    return {
      id: 'M4-05',
      name: 'Backend terms <= 249 bytes',
      status: 'PASS',
      detail: `Backend terms: ${byteSize} bytes`,
    };
  }

  return {
    id: 'M4-05',
    name: 'Backend terms <= 249 bytes',
    status: 'FAIL',
    detail: `Backend terms is ${byteSize - 249} bytes over limit`,
    issue: {
      item: 'Backend terms byte size',
      expected: 'Maximum 249 bytes',
      actual: `${byteSize} bytes`,
      reason: 'Amazon rejects backend terms that exceed the byte limit',
    },
    actions: ['Remove low-value keywords to reduce byte size'],
  };
}

/**
 * M4-06: No banned terms in title, bullets, description
 */
function checkM4_06(input: ListingCreationInput, bannedTerms: string[]): CheckResult {
  const title = (input.title || '').toLowerCase();
  const bullets = (input.bullets || []).join(' ').toLowerCase();
  const description = (input.description || '').toLowerCase();
  const allContent = `${title} ${bullets} ${description}`;

  const foundBanned: string[] = [];
  for (const term of bannedTerms) {
    const regex = new RegExp(`\\b${term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(allContent)) {
      foundBanned.push(term);
    }
  }

  if (foundBanned.length === 0) {
    return {
      id: 'M4-06',
      name: 'No banned terms',
      status: 'PASS',
      detail: 'No banned terms found in listing content',
    };
  }

  return {
    id: 'M4-06',
    name: 'No banned terms',
    status: 'FAIL',
    detail: `${foundBanned.length} banned terms found`,
    issue: {
      item: 'Banned terms in content',
      expected: 'No banned or restricted terms',
      actual: foundBanned.slice(0, 5).join(', '),
      reason: 'Banned terms may cause listing suppression or policy violations',
    },
    actions: ['Remove or replace banned terms with compliant alternatives'],
  };
}

/**
 * M4-07: At least 80% of primary_keywords appear in title+bullets
 */
function checkM4_07(input: ListingCreationInput): CheckResult {
  const primaryKeywords = input.primary_keywords || [];
  if (primaryKeywords.length === 0) {
    return {
      id: 'M4-07',
      name: 'Primary keyword coverage >= 80%',
      status: 'PASS',
      detail: 'No primary keywords defined',
    };
  }

  const title = (input.title || '').toLowerCase();
  const bullets = (input.bullets || []).join(' ').toLowerCase();
  const searchContent = `${title} ${bullets}`;

  let foundCount = 0;
  const missingKeywords: string[] = [];

  for (const keyword of primaryKeywords) {
    const regex = new RegExp(`\\b${keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(searchContent)) {
      foundCount++;
    } else {
      missingKeywords.push(keyword);
    }
  }

  const coverage = (foundCount / primaryKeywords.length) * 100;

  if (coverage >= 80) {
    return {
      id: 'M4-07',
      name: 'Primary keyword coverage >= 80%',
      status: 'PASS',
      detail: `${coverage.toFixed(1)}% of primary keywords found (${foundCount}/${primaryKeywords.length})`,
    };
  }

  return {
    id: 'M4-07',
    name: 'Primary keyword coverage >= 80%',
    status: 'FAIL',
    detail: `Only ${coverage.toFixed(1)}% coverage (${foundCount}/${primaryKeywords.length})`,
    issue: {
      item: 'Primary keyword coverage',
      expected: 'At least 80% of primary keywords in title+bullets',
      actual: `${coverage.toFixed(1)}% (missing: ${missingKeywords.slice(0, 5).join(', ')})`,
      reason: 'Primary keywords must appear in visible content for SEO',
    },
    actions: ['Add missing primary keywords to title or bullets'],
  };
}

/**
 * M4-08: All primary USP statements mentioned in bullets
 */
function checkM4_08(input: ListingCreationInput): CheckResult {
  const primaryUsps = input.primary_usps || [];
  if (primaryUsps.length === 0) {
    return {
      id: 'M4-08',
      name: 'All primary USPs in bullets',
      status: 'PASS',
      detail: 'No primary USPs defined',
    };
  }

  const bullets = (input.bullets || []).join(' ').toLowerCase();
  const missingUsps: string[] = [];

  for (const usp of primaryUsps) {
    // Check if key words from USP statement appear in bullets
    const statement = usp.statement.toLowerCase();
    const keyWords = statement
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .slice(0, 3);

    const found = keyWords.some((word) => bullets.includes(word));
    if (!found) {
      missingUsps.push(usp.statement);
    }
  }

  if (missingUsps.length === 0) {
    return {
      id: 'M4-08',
      name: 'All primary USPs in bullets',
      status: 'PASS',
      detail: `All ${primaryUsps.length} primary USPs mentioned in bullets`,
    };
  }

  return {
    id: 'M4-08',
    name: 'All primary USPs in bullets',
    status: 'FAIL',
    detail: `${missingUsps.length} USPs not mentioned in bullets`,
    issue: {
      item: 'Missing USP statements',
      expected: 'All primary USPs should be mentioned in bullets',
      actual: missingUsps.slice(0, 3).join('; '),
      reason: 'USPs are key selling points that should be highlighted',
    },
    actions: ['Add bullet points that address missing USP statements'],
  };
}

/**
 * M4-09: No ALL CAPS words (3+ consecutive uppercase letters)
 */
function checkM4_09(input: ListingCreationInput): CheckResult {
  const title = input.title || '';
  const bullets = (input.bullets || []).join(' ');
  const description = input.description || '';
  const allContent = `${title} ${bullets} ${description}`;

  // Find words with 3+ consecutive uppercase letters
  const allCapsRegex = /\b[A-Z]{3,}\b/g;
  const matches = allContent.match(allCapsRegex) || [];

  // Filter out common acceptable abbreviations
  const acceptableAbbreviations = ['USB', 'LED', 'LCD', 'FDA', 'BPA', 'UV', 'AC', 'DC', 'HD', 'USA', 'UK'];
  const violations = matches.filter((m) => !acceptableAbbreviations.includes(m));

  if (violations.length === 0) {
    return {
      id: 'M4-09',
      name: 'No ALL CAPS words',
      status: 'PASS',
      detail: 'No inappropriate ALL CAPS words found',
    };
  }

  // Deduplicate
  const uniqueViolations = [...new Set(violations)];

  return {
    id: 'M4-09',
    name: 'No ALL CAPS words',
    status: 'FAIL',
    detail: `${uniqueViolations.length} ALL CAPS words found`,
    issue: {
      item: 'ALL CAPS violations',
      expected: 'No words with 3+ consecutive uppercase letters',
      actual: uniqueViolations.slice(0, 5).join(', '),
      reason: 'Amazon prohibits ALL CAPS words as they appear promotional',
    },
    actions: ['Convert ALL CAPS words to proper title case or lowercase'],
  };
}

/**
 * M4-10: quality_score >= 80
 */
function checkM4_10(input: ListingCreationInput): CheckResult {
  const qualityScore = input.quality_score;

  if (qualityScore === undefined || qualityScore === null) {
    return {
      id: 'M4-10',
      name: 'Quality score >= 80',
      status: 'REVIEW',
      detail: 'No quality score provided',
      actions: ['Calculate and provide quality score'],
    };
  }

  if (qualityScore >= 80) {
    return {
      id: 'M4-10',
      name: 'Quality score >= 80',
      status: 'PASS',
      detail: `Quality score: ${qualityScore}`,
    };
  }

  return {
    id: 'M4-10',
    name: 'Quality score >= 80',
    status: 'FAIL',
    detail: `Quality score ${qualityScore} is below threshold`,
    issue: {
      item: 'Quality score',
      expected: 'Minimum score of 80',
      actual: String(qualityScore),
      reason: 'Low quality scores indicate potential listing issues',
    },
    actions: ['Review and improve listing content to increase quality score'],
  };
}

/**
 * Run all M4 (Listing Creation) verification checks
 */
export function verifyM4(
  input: ListingCreationInput,
  bannedTerms: string[] = DEFAULT_BANNED_TERMS
): CheckResult[] {
  return [
    checkM4_01(input),
    checkM4_02(input),
    checkM4_03(input),
    checkM4_04(input),
    checkM4_05(input),
    checkM4_06(input, bannedTerms),
    checkM4_07(input),
    checkM4_08(input),
    checkM4_09(input),
    checkM4_10(input),
  ];
}
