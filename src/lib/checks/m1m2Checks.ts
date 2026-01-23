// M1 (Product Context) and M2 (Competitor Discovery) verification checks

import { CheckResult } from '../types';
import { ProductContextInput, CompetitorDiscoveryInput, DEFAULT_BANNED_TERMS } from '../inputTypes';

// ASIN regex pattern
const ASIN_PATTERN = /^B0[A-Z0-9]{8}$/;

/**
 * Verify M1: Product Context (7 checks)
 */
export function verifyM1(input: ProductContextInput, bannedTerms?: string[]): CheckResult[] {
  const terms = bannedTerms ?? DEFAULT_BANNED_TERMS;
  const results: CheckResult[] = [];

  // M1-01: product_type not empty
  const productType = input.product_type?.trim() ?? '';
  results.push({
    id: 'M1-01',
    name: 'Product type present',
    status: productType.length > 0 ? 'PASS' : 'FAIL',
    detail: productType.length > 0 ? productType : 'Missing',
    ...(productType.length === 0 && {
      issue: {
        item: 'product_type',
        expected: 'Non-empty string',
        actual: 'Empty or undefined',
        reason: 'Product type is required for categorization'
      },
      actions: ['Add a product_type value describing the product category']
    })
  });

  // M1-02: category_path contains " > "
  const categoryPath = input.category_path ?? '';
  const hasValidPath = categoryPath.includes(' > ');
  results.push({
    id: 'M1-02',
    name: 'Category path hierarchy',
    status: hasValidPath ? 'PASS' : 'FAIL',
    detail: hasValidPath ? categoryPath : 'Invalid format',
    ...((!hasValidPath) && {
      issue: {
        item: 'category_path',
        expected: 'Path with " > " separator (e.g., "Beauty > Skincare > Serums")',
        actual: categoryPath || 'Empty',
        reason: 'Category path must include hierarchy separator'
      },
      actions: ['Format category_path as "Parent > Child > Subcategory"']
    })
  });

  // M1-03: key_attributes.length >= 3
  const keyAttributes = input.key_attributes ?? [];
  const hasEnoughAttributes = keyAttributes.length >= 3;
  results.push({
    id: 'M1-03',
    name: 'Key attributes count',
    status: hasEnoughAttributes ? 'PASS' : 'FAIL',
    detail: `Found ${keyAttributes.length} attributes`,
    ...((!hasEnoughAttributes) && {
      issue: {
        item: 'key_attributes',
        expected: 'At least 3 attributes',
        actual: `${keyAttributes.length} attributes`,
        reason: 'Minimum 3 key attributes required for product differentiation'
      },
      actions: ['Add more key_attributes to reach minimum of 3']
    })
  });

  // M1-04: initial_keywords.length >= 3
  const initialKeywords = input.initial_keywords ?? [];
  const hasEnoughKeywords = initialKeywords.length >= 3;
  results.push({
    id: 'M1-04',
    name: 'Initial keywords count',
    status: hasEnoughKeywords ? 'PASS' : 'FAIL',
    detail: `Found ${initialKeywords.length} keywords`,
    ...((!hasEnoughKeywords) && {
      issue: {
        item: 'initial_keywords',
        expected: 'At least 3 keywords',
        actual: `${initialKeywords.length} keywords`,
        reason: 'Minimum 3 initial keywords required for search foundation'
      },
      actions: ['Add more initial_keywords to reach minimum of 3']
    })
  });

  // M1-05: truth_set has brand, product_name, features
  const truthSet = input.truth_set ?? {};
  const hasBrand = Boolean(truthSet.brand?.toString().trim());
  const hasProductName = Boolean(truthSet.product_name?.toString().trim());
  const hasFeatures = Array.isArray(truthSet.features) && truthSet.features.length > 0;
  const missingFields: string[] = [];
  if (!hasBrand) missingFields.push('brand');
  if (!hasProductName) missingFields.push('product_name');
  if (!hasFeatures) missingFields.push('features');
  const truthSetComplete = missingFields.length === 0;
  results.push({
    id: 'M1-05',
    name: 'Truth set completeness',
    status: truthSetComplete ? 'PASS' : 'FAIL',
    detail: truthSetComplete ? 'All required fields present' : `Missing: ${missingFields.join(', ')}`,
    ...((!truthSetComplete) && {
      issue: {
        item: 'truth_set',
        expected: 'brand, product_name, and features fields',
        actual: `Missing: ${missingFields.join(', ')}`,
        reason: 'Truth set must contain core product identity fields'
      },
      actions: missingFields.map(field => `Add ${field} to truth_set`)
    })
  });

  // M1-06: No banned terms in truth_set
  const bannedFound: string[] = [];
  const truthSetString = JSON.stringify(truthSet).toLowerCase();
  for (const term of terms) {
    if (truthSetString.includes(term.toLowerCase())) {
      bannedFound.push(term);
    }
  }
  const noBannedTerms = bannedFound.length === 0;
  results.push({
    id: 'M1-06',
    name: 'No banned terms in truth set',
    status: noBannedTerms ? 'PASS' : 'FAIL',
    detail: noBannedTerms ? 'No banned terms found' : `Found: ${bannedFound.join(', ')}`,
    ...((!noBannedTerms) && {
      issue: {
        item: 'truth_set',
        expected: 'No banned terms',
        actual: `Found banned terms: ${bannedFound.join(', ')}`,
        reason: 'Banned terms violate compliance requirements'
      },
      actions: bannedFound.map(term => `Remove or replace "${term}" from truth_set`)
    })
  });

  // M1-07: Every fact has source_ref
  const facts = input.facts ?? [];
  const factsWithoutSource = facts.filter(f => !f.source_ref?.trim());
  const allFactsHaveSource = facts.length === 0 || factsWithoutSource.length === 0;
  results.push({
    id: 'M1-07',
    name: 'Facts have source references',
    status: allFactsHaveSource ? 'PASS' : 'FAIL',
    detail: facts.length === 0
      ? 'No facts to verify'
      : allFactsHaveSource
        ? `All ${facts.length} facts have sources`
        : `${factsWithoutSource.length}/${facts.length} facts missing source_ref`,
    ...((!allFactsHaveSource) && {
      issue: {
        item: 'facts',
        expected: 'Every fact with source_ref',
        actual: `${factsWithoutSource.length} facts without source_ref`,
        reason: 'All claims must be traceable to sources'
      },
      actions: ['Add source_ref to each fact without one']
    })
  });

  return results;
}

/**
 * Verify M2: Competitor Discovery (6 checks)
 * Note: raw_list checks removed - only trimmed_list and final_list are validated
 */
export function verifyM2(input: CompetitorDiscoveryInput): CheckResult[] {
  const results: CheckResult[] = [];

  // M2-01: search_terms.length === 5
  const searchTerms = input.search_terms ?? [];
  const hasExactSearchTerms = searchTerms.length === 5;
  results.push({
    id: 'M2-01',
    name: 'Search terms count',
    status: hasExactSearchTerms ? 'PASS' : 'FAIL',
    detail: `Found ${searchTerms.length} search terms`,
    ...((!hasExactSearchTerms) && {
      issue: {
        item: 'search_terms',
        expected: 'Exactly 5 search terms',
        actual: `${searchTerms.length} search terms`,
        reason: 'Protocol requires exactly 5 search terms for competitor discovery'
      },
      actions: searchTerms.length < 5
        ? [`Add ${5 - searchTerms.length} more search terms`]
        : [`Remove ${searchTerms.length - 5} search terms to have exactly 5`]
    })
  });

  // M2-02: trimmed_list.length 15-20
  const trimmedList = input.trimmed_list ?? [];
  const trimmedInRange = trimmedList.length >= 15 && trimmedList.length <= 20;
  results.push({
    id: 'M2-02',
    name: 'Trimmed list count',
    status: trimmedInRange ? 'PASS' : 'FAIL',
    detail: `Found ${trimmedList.length} items`,
    ...((!trimmedInRange) && {
      issue: {
        item: 'trimmed_list',
        expected: '15-20 items',
        actual: `${trimmedList.length} items`,
        reason: 'Trimmed list must contain 15-20 filtered competitors'
      },
      actions: trimmedList.length < 15
        ? [`Add ${15 - trimmedList.length} more items to reach minimum of 15`]
        : [`Remove ${trimmedList.length - 20} items to stay within maximum of 20`]
    })
  });

  // M2-03: Every trimmed item has relevance_score
  const trimmedWithoutScore = trimmedList.filter(item =>
    item.relevance_score === undefined || item.relevance_score === null
  );
  const allTrimmedHaveScore = trimmedList.length === 0 || trimmedWithoutScore.length === 0;
  results.push({
    id: 'M2-03',
    name: 'Trimmed items have relevance scores',
    status: allTrimmedHaveScore ? 'PASS' : 'FAIL',
    detail: trimmedList.length === 0
      ? 'No trimmed items to verify'
      : allTrimmedHaveScore
        ? `All ${trimmedList.length} items have scores`
        : `${trimmedWithoutScore.length}/${trimmedList.length} missing relevance_score`,
    ...((!allTrimmedHaveScore) && {
      issue: {
        item: 'trimmed_list',
        expected: 'Every item with relevance_score',
        actual: `${trimmedWithoutScore.length} items without relevance_score`,
        reason: 'Relevance scores required for ranking and filtering'
      },
      actions: ['Add relevance_score to each trimmed_list item']
    })
  });

  // M2-04: final_list.length 5-10
  const finalList = input.final_list ?? [];
  const finalInRange = finalList.length >= 5 && finalList.length <= 10;
  results.push({
    id: 'M2-04',
    name: 'Final list count',
    status: finalInRange ? 'PASS' : 'FAIL',
    detail: `Found ${finalList.length} items`,
    ...((!finalInRange) && {
      issue: {
        item: 'final_list',
        expected: '5-10 items',
        actual: `${finalList.length} items`,
        reason: 'Final list must contain 5-10 top competitors'
      },
      actions: finalList.length < 5
        ? [`Add ${5 - finalList.length} more items to reach minimum of 5`]
        : [`Remove ${finalList.length - 10} items to stay within maximum of 10`]
    })
  });

  // M2-05: All final ASINs exist in trimmed
  const trimmedAsins = new Set(trimmedList.map(item => item.asin));
  const finalAsins = finalList.map(item => item.asin);
  const finalNotInTrimmed = finalAsins.filter(asin => !trimmedAsins.has(asin));
  const allFinalInTrimmed = finalNotInTrimmed.length === 0;
  results.push({
    id: 'M2-05',
    name: 'Final ASINs exist in trimmed list',
    status: allFinalInTrimmed ? 'PASS' : 'FAIL',
    detail: allFinalInTrimmed
      ? `All ${finalList.length} final ASINs found in trimmed list`
      : `${finalNotInTrimmed.length} ASINs not in trimmed list`,
    ...((!allFinalInTrimmed) && {
      issue: {
        item: 'final_list',
        expected: 'All ASINs present in trimmed_list',
        actual: `Missing from trimmed: ${finalNotInTrimmed.slice(0, 5).join(', ')}${finalNotInTrimmed.length > 5 ? '...' : ''}`,
        reason: 'Final list must be subset of trimmed list'
      },
      actions: ['Ensure all final_list ASINs come from trimmed_list']
    })
  });

  // M2-06: All ASINs in trimmed and final lists match /^B0[A-Z0-9]{8}$/
  const allAsins = [
    ...trimmedList.map(item => item.asin),
    ...finalAsins
  ];
  const invalidAsins = allAsins.filter(asin => !ASIN_PATTERN.test(asin));
  const allAsinsValid = invalidAsins.length === 0;
  results.push({
    id: 'M2-06',
    name: 'Valid ASIN format',
    status: allAsinsValid ? 'PASS' : 'FAIL',
    detail: allAsinsValid
      ? `All ${allAsins.length} ASINs match pattern`
      : `${invalidAsins.length} invalid ASINs`,
    ...((!allAsinsValid) && {
      issue: {
        item: 'ASINs',
        expected: 'Format: B0XXXXXXXX (B0 + 8 alphanumeric)',
        actual: `Invalid: ${Array.from(new Set(invalidAsins)).slice(0, 5).join(', ')}${invalidAsins.length > 5 ? '...' : ''}`,
        reason: 'All ASINs must match Amazon ASIN format'
      },
      actions: ['Fix or remove ASINs that do not match pattern /^B0[A-Z0-9]{8}$/']
    })
  });

  return results;
}
