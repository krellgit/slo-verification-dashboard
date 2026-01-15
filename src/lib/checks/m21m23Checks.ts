import { CheckResult } from '../types';
import {
  CustomerIntentInput,
  USPEvaluationInput,
  VALID_THEME_NAMES,
  FORBIDDEN_THEMES,
  DEFAULT_BANNED_TERMS
} from '../inputTypes';

/**
 * M2.1 Customer Intent Verification
 * 7 checks validating theme extraction from customer reviews
 */
export function verifyM21(input: CustomerIntentInput): CheckResult[] {
  const results: CheckResult[] = [];
  const themes = input.themes ?? [];

  // M2.1-01: themes.length 5-10
  const themeCount = themes.length;
  results.push({
    id: 'M2.1-01',
    name: 'Theme count within range',
    status: themeCount >= 5 && themeCount <= 10 ? 'PASS' : 'FAIL',
    detail: `Found ${themeCount} themes`,
    ...(themeCount < 5 || themeCount > 10 ? {
      issue: {
        item: 'themes array',
        expected: '5-10 themes',
        actual: `${themeCount} themes`,
        reason: themeCount < 5 ? 'Too few themes extracted' : 'Too many themes extracted'
      },
      actions: themeCount < 5
        ? ['Extract additional themes from reviews', 'Lower similarity threshold for theme clustering']
        : ['Consolidate similar themes', 'Remove low-confidence themes']
    } : {})
  });

  // M2.1-02: No duplicate theme IDs
  const themeIds = themes.map(t => t.id);
  const uniqueIds = new Set(themeIds);
  const hasDuplicates = uniqueIds.size !== themeIds.length;
  const duplicateIds = themeIds.filter((id, idx) => themeIds.indexOf(id) !== idx);
  results.push({
    id: 'M2.1-02',
    name: 'No duplicate theme IDs',
    status: hasDuplicates ? 'FAIL' : 'PASS',
    detail: hasDuplicates ? `Duplicates: ${[...new Set(duplicateIds)].join(', ')}` : 'All IDs unique',
    ...(hasDuplicates ? {
      issue: {
        item: 'theme IDs',
        expected: 'All unique IDs',
        actual: `Duplicate IDs: ${[...new Set(duplicateIds)].join(', ')}`,
        reason: 'Theme ID collision detected'
      },
      actions: ['Regenerate unique IDs for duplicate themes', 'Merge themes with same ID']
    } : {})
  });

  // M2.1-03: All theme names in VALID_THEME_NAMES
  const invalidNames = themes
    .map(t => t.name)
    .filter(name => !VALID_THEME_NAMES.includes(name));
  results.push({
    id: 'M2.1-03',
    name: 'Theme names in controlled vocabulary',
    status: invalidNames.length === 0 ? 'PASS' : 'FAIL',
    detail: invalidNames.length === 0
      ? 'All names valid'
      : `Invalid: ${invalidNames.join(', ')}`,
    ...(invalidNames.length > 0 ? {
      issue: {
        item: 'theme names',
        expected: `Names from: ${VALID_THEME_NAMES.slice(0, 5).join(', ')}...`,
        actual: `Invalid names: ${invalidNames.join(', ')}`,
        reason: 'Theme names must use controlled vocabulary'
      },
      actions: ['Map invalid names to closest valid theme', 'Review VALID_THEME_NAMES list']
    } : {})
  });

  // M2.1-04: All theme scores 0-100
  const invalidScores = themes.filter(t => {
    const score = t.score;
    return score === undefined || score < 0 || score > 100;
  });
  results.push({
    id: 'M2.1-04',
    name: 'Theme scores within 0-100',
    status: invalidScores.length === 0 ? 'PASS' : 'FAIL',
    detail: invalidScores.length === 0
      ? 'All scores valid'
      : `Invalid scores on themes: ${invalidScores.map(t => t.id).join(', ')}`,
    ...(invalidScores.length > 0 ? {
      issue: {
        item: 'theme scores',
        expected: 'Scores between 0 and 100',
        actual: invalidScores.map(t => `${t.id}: ${t.score ?? 'undefined'}`).join(', '),
        reason: 'Theme scores must be normalized to 0-100 range'
      },
      actions: ['Recalculate theme scores', 'Apply min-max normalization']
    } : {})
  });

  // M2.1-05: Each theme has 3-10 quotes
  const themesWithBadQuotes = themes.filter(t => {
    const quoteCount = t.quotes?.length ?? 0;
    return quoteCount < 3 || quoteCount > 10;
  });
  results.push({
    id: 'M2.1-05',
    name: 'Theme quote count 3-10',
    status: themesWithBadQuotes.length === 0 ? 'PASS' : 'FAIL',
    detail: themesWithBadQuotes.length === 0
      ? 'All themes have valid quote counts'
      : `Themes with invalid quote counts: ${themesWithBadQuotes.map(t => `${t.id}(${t.quotes?.length ?? 0})`).join(', ')}`,
    ...(themesWithBadQuotes.length > 0 ? {
      issue: {
        item: 'theme quotes',
        expected: '3-10 quotes per theme',
        actual: themesWithBadQuotes.map(t => `${t.id}: ${t.quotes?.length ?? 0} quotes`).join(', '),
        reason: 'Each theme needs sufficient supporting evidence'
      },
      actions: [
        'Add more supporting quotes for under-quoted themes',
        'Consolidate or trim excessive quotes',
        'Remove themes with insufficient evidence'
      ]
    } : {})
  });

  // M2.1-06: Quotes found in source_reviews (if provided)
  if (input.source_reviews && input.source_reviews.length > 0) {
    const allQuotes = themes.flatMap(t => t.quotes ?? []);
    const unmatchedQuotes = allQuotes.filter(quote =>
      !input.source_reviews!.some(review => review.includes(quote))
    );
    results.push({
      id: 'M2.1-06',
      name: 'Quotes traceable to source reviews',
      status: unmatchedQuotes.length === 0 ? 'PASS' : 'FAIL',
      detail: unmatchedQuotes.length === 0
        ? 'All quotes found in sources'
        : `${unmatchedQuotes.length} unmatched quotes`,
      ...(unmatchedQuotes.length > 0 ? {
        issue: {
          item: 'quote traceability',
          expected: 'All quotes in source_reviews',
          actual: `${unmatchedQuotes.length} quotes not found in sources`,
          reason: 'Quotes must be verifiable from source material'
        },
        actions: [
          'Verify quote extraction logic',
          'Remove or replace unverifiable quotes',
          'Check for text normalization issues'
        ]
      } : {})
    });
  } else {
    results.push({
      id: 'M2.1-06',
      name: 'Quotes traceable to source reviews',
      status: 'REVIEW',
      detail: 'No source_reviews provided for verification'
    });
  }

  // M2.1-07: No themes with names in FORBIDDEN_THEMES
  const forbiddenThemes = themes.filter(t => FORBIDDEN_THEMES.includes(t.name));
  results.push({
    id: 'M2.1-07',
    name: 'No forbidden theme types',
    status: forbiddenThemes.length === 0 ? 'PASS' : 'FAIL',
    detail: forbiddenThemes.length === 0
      ? 'No forbidden themes'
      : `Forbidden themes found: ${forbiddenThemes.map(t => t.name).join(', ')}`,
    ...(forbiddenThemes.length > 0 ? {
      issue: {
        item: 'forbidden themes',
        expected: `No themes from: ${FORBIDDEN_THEMES.join(', ')}`,
        actual: `Found: ${forbiddenThemes.map(t => t.name).join(', ')}`,
        reason: 'These themes are not relevant to product listing optimization'
      },
      actions: [
        'Remove forbidden themes from output',
        'Update theme extraction to exclude these categories'
      ]
    } : {})
  });

  return results;
}

/**
 * M2.3 USP Evaluation Verification
 * 7 checks validating USP scoring and categorization
 */
export function verifyM23(input: USPEvaluationInput, bannedTerms?: string[]): CheckResult[] {
  const results: CheckResult[] = [];
  const usps = input.usps ?? [];
  const truthSetFacts = input.truth_set_facts ?? [];
  const banned = bannedTerms ?? DEFAULT_BANNED_TERMS;

  // M2.3-01: usps.length >= 3
  results.push({
    id: 'M2.3-01',
    name: 'Minimum USP count',
    status: usps.length >= 3 ? 'PASS' : 'FAIL',
    detail: `Found ${usps.length} USPs`,
    ...(usps.length < 3 ? {
      issue: {
        item: 'USP count',
        expected: 'At least 3 USPs',
        actual: `${usps.length} USPs`,
        reason: 'Insufficient USPs for effective differentiation'
      },
      actions: [
        'Generate additional USPs from customer themes',
        'Review competitor gaps for USP opportunities'
      ]
    } : {})
  });

  // M2.3-02: Every USP has tags.length >= 1
  const uspsWithoutTags = usps.filter(u => !u.tags || u.tags.length < 1);
  results.push({
    id: 'M2.3-02',
    name: 'All USPs have tags',
    status: uspsWithoutTags.length === 0 ? 'PASS' : 'FAIL',
    detail: uspsWithoutTags.length === 0
      ? 'All USPs tagged'
      : `USPs missing tags: ${uspsWithoutTags.map(u => u.id).join(', ')}`,
    ...(uspsWithoutTags.length > 0 ? {
      issue: {
        item: 'USP tags',
        expected: 'At least 1 tag per USP',
        actual: `${uspsWithoutTags.length} USPs without tags`,
        reason: 'Tags required for keyword mapping and categorization'
      },
      actions: ['Add relevant tags to untagged USPs', 'Auto-generate tags from USP statement']
    } : {})
  });

  // M2.3-03: All proof_points in truth_set_facts
  const allProofPoints = usps.flatMap(u => u.proof_points ?? []);
  const unmatchedProofs = allProofPoints.filter(pp => !truthSetFacts.includes(pp));
  if (truthSetFacts.length > 0) {
    results.push({
      id: 'M2.3-03',
      name: 'Proof points in truth set',
      status: unmatchedProofs.length === 0 ? 'PASS' : 'FAIL',
      detail: unmatchedProofs.length === 0
        ? 'All proof points verified'
        : `${unmatchedProofs.length} unverified proof points`,
      ...(unmatchedProofs.length > 0 ? {
        issue: {
          item: 'proof points',
          expected: 'All proof points in truth_set_facts',
          actual: `Unverified: ${unmatchedProofs.slice(0, 3).join('; ')}${unmatchedProofs.length > 3 ? '...' : ''}`,
          reason: 'USP claims must be backed by verified facts'
        },
        actions: [
          'Add missing proof points to truth set',
          'Remove unverifiable claims from USPs',
          'Verify proof point accuracy'
        ]
      } : {})
    });
  } else {
    results.push({
      id: 'M2.3-03',
      name: 'Proof points in truth set',
      status: 'REVIEW',
      detail: 'No truth_set_facts provided for verification'
    });
  }

  // M2.3-04: Score formula validation
  const uspsWithScoreMismatch = usps.filter(u => {
    if (!u.scores || u.total_score === undefined) return false;
    const { customer_relevance = 0, competitive_uniqueness = 0, market_impact = 0 } = u.scores;
    const calculated = 0.45 * customer_relevance + 0.25 * competitive_uniqueness + 0.30 * market_impact;
    return Math.abs(calculated - u.total_score) > 2;
  });
  const uspsWithMissingScores = usps.filter(u => !u.scores || u.total_score === undefined);

  if (uspsWithMissingScores.length === usps.length && usps.length > 0) {
    results.push({
      id: 'M2.3-04',
      name: 'Score formula correct',
      status: 'REVIEW',
      detail: 'No scores provided for validation'
    });
  } else {
    results.push({
      id: 'M2.3-04',
      name: 'Score formula correct',
      status: uspsWithScoreMismatch.length === 0 ? 'PASS' : 'FAIL',
      detail: uspsWithScoreMismatch.length === 0
        ? 'All scores match formula'
        : `Mismatched scores on: ${uspsWithScoreMismatch.map(u => u.id).join(', ')}`,
      ...(uspsWithScoreMismatch.length > 0 ? {
        issue: {
          item: 'USP total_score',
          expected: '0.45*customer_relevance + 0.25*competitive_uniqueness + 0.30*market_impact (±2)',
          actual: uspsWithScoreMismatch.map(u => {
            const { customer_relevance = 0, competitive_uniqueness = 0, market_impact = 0 } = u.scores!;
            const calc = 0.45 * customer_relevance + 0.25 * competitive_uniqueness + 0.30 * market_impact;
            return `${u.id}: expected ${calc.toFixed(1)}, got ${u.total_score}`;
          }).join('; '),
          reason: 'Total score must follow weighted formula'
        },
        actions: ['Recalculate total_score using correct formula', 'Verify component scores']
      } : {})
    });
  }

  // M2.3-05: No banned terms in USP statements
  const uspsWithBannedTerms = usps.filter(u => {
    const statement = u.statement.toLowerCase();
    return banned.some(term => statement.includes(term.toLowerCase()));
  });
  const foundBannedTerms = uspsWithBannedTerms.map(u => {
    const statement = u.statement.toLowerCase();
    const found = banned.filter(term => statement.includes(term.toLowerCase()));
    return { id: u.id, terms: found };
  });
  results.push({
    id: 'M2.3-05',
    name: 'No banned terms in statements',
    status: uspsWithBannedTerms.length === 0 ? 'PASS' : 'FAIL',
    detail: uspsWithBannedTerms.length === 0
      ? 'No banned terms found'
      : `Banned terms in: ${foundBannedTerms.map(f => `${f.id}(${f.terms.join(',')})`).join('; ')}`,
    ...(uspsWithBannedTerms.length > 0 ? {
      issue: {
        item: 'USP statements',
        expected: 'No banned terms',
        actual: foundBannedTerms.map(f => `${f.id}: ${f.terms.join(', ')}`).join('; '),
        reason: 'Banned terms may violate platform policies or be misleading'
      },
      actions: [
        'Rephrase USP statements to remove banned terms',
        'Review banned terms list for applicability'
      ]
    } : {})
  });

  // M2.3-06: Every USP has priority
  const uspsWithoutPriority = usps.filter(u => !u.priority);
  results.push({
    id: 'M2.3-06',
    name: 'All USPs have priority',
    status: uspsWithoutPriority.length === 0 ? 'PASS' : 'FAIL',
    detail: uspsWithoutPriority.length === 0
      ? 'All USPs prioritized'
      : `USPs missing priority: ${uspsWithoutPriority.map(u => u.id).join(', ')}`,
    ...(uspsWithoutPriority.length > 0 ? {
      issue: {
        item: 'USP priority',
        expected: 'Priority set (Primary/Secondary/Tertiary)',
        actual: `${uspsWithoutPriority.length} USPs without priority`,
        reason: 'Priority required for listing placement decisions'
      },
      actions: ['Assign priority based on total_score ranking', 'Review USP importance manually']
    } : {})
  });

  // M2.3-07: At least 2 USPs with priority='Primary'
  const primaryUsps = usps.filter(u => u.priority === 'Primary');
  results.push({
    id: 'M2.3-07',
    name: 'Minimum primary USPs',
    status: primaryUsps.length >= 2 ? 'PASS' : 'FAIL',
    detail: `${primaryUsps.length} Primary USPs`,
    ...(primaryUsps.length < 2 ? {
      issue: {
        item: 'Primary USP count',
        expected: 'At least 2 Primary USPs',
        actual: `${primaryUsps.length} Primary USPs`,
        reason: 'Listings need multiple primary differentiators'
      },
      actions: [
        'Promote high-scoring USPs to Primary',
        'Review USP evaluation criteria',
        'Generate additional strong USPs'
      ]
    } : {})
  });

  return results;
}
