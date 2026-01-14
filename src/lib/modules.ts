import { ModuleDefinition } from './types';

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    id: 'M1',
    name: 'Product Context',
    shortName: 'Product',
    dependsOn: [],
    checks: [
      { id: 'M1-01', name: 'Product type present', rule: 'product_type not empty', failMessage: 'Missing product type' },
      { id: 'M1-02', name: 'Category path valid', rule: 'Contains " > " separator', failMessage: 'Invalid category format' },
      { id: 'M1-03', name: 'Minimum attributes', rule: '≥3 key attributes', failMessage: 'Not enough attributes identified' },
      { id: 'M1-04', name: 'Initial keywords exist', rule: '≥3 keywords', failMessage: 'Need at least 3 keywords' },
      { id: 'M1-05', name: 'Truth set complete', rule: 'All required fields populated', failMessage: 'Truth set incomplete' },
      { id: 'M1-06', name: 'No banned terms', rule: 'Zero matches against banned_terms', failMessage: 'Banned term found' },
      { id: 'M1-07', name: 'Source traceability', rule: 'Every fact has source_ref', failMessage: 'Fact without source' },
    ]
  },
  {
    id: 'M2',
    name: 'Competitor Discovery',
    shortName: 'Competitors',
    dependsOn: ['M1'],
    checks: [
      { id: 'M2-01', name: 'Search terms count', rule: 'Exactly 5 terms', failMessage: 'Need exactly 5 search terms' },
      { id: 'M2-02', name: 'Raw list size', rule: '40-50 items', failMessage: 'Raw list size out of range' },
      { id: 'M2-03', name: 'No duplicates', rule: 'All ASINs unique', failMessage: 'Duplicate ASIN found' },
      { id: 'M2-04', name: 'Trimmed list size', rule: '15-20 items', failMessage: 'Trimmed list size out of range' },
      { id: 'M2-05', name: 'All have scores', rule: 'Every item has relevance_score', failMessage: 'Missing score' },
      { id: 'M2-06', name: 'Final list size', rule: '5-10 items', failMessage: 'Final list size out of range' },
      { id: 'M2-07', name: 'Final from trimmed', rule: 'All final items exist in trimmed', failMessage: 'Selection not in trimmed list' },
      { id: 'M2-08', name: 'ASINs valid format', rule: 'All match B0[A-Z0-9]{8}', failMessage: 'Invalid ASIN format' },
    ]
  },
  {
    id: 'M2.1',
    name: 'Customer Intent',
    shortName: 'Intent',
    dependsOn: ['M1', 'M2'],
    checks: [
      { id: 'M2.1-01', name: 'Themes count', rule: '5-10 themes', failMessage: 'Theme count out of range' },
      { id: 'M2.1-02', name: 'Unique theme IDs', rule: 'No duplicates', failMessage: 'Duplicate theme ID' },
      { id: 'M2.1-03', name: 'Theme names valid', rule: 'From controlled vocabulary', failMessage: 'Invalid theme name' },
      { id: 'M2.1-04', name: 'Scores in range', rule: 'All scores 0-100', failMessage: 'Score out of range' },
      { id: 'M2.1-05', name: 'Sample quotes exist', rule: 'Each theme has 3-10 quotes', failMessage: 'Not enough quotes' },
      { id: 'M2.1-06', name: 'Quotes traceable', rule: 'Quotes found in source reviews', failMessage: 'Quote not found in sources' },
      { id: 'M2.1-07', name: 'No forbidden topics', rule: 'No shipping/packaging themes', failMessage: 'Forbidden topic found' },
    ]
  },
  {
    id: 'M2.3',
    name: 'USP Evaluation',
    shortName: 'USPs',
    dependsOn: ['M1', 'M2', 'M2.1'],
    checks: [
      { id: 'M2.3-01', name: 'Minimum USPs', rule: '≥3 approved', failMessage: 'Not enough USPs' },
      { id: 'M2.3-02', name: 'All have tags', rule: 'Each USP has ≥1 tag', failMessage: 'USP has no tags' },
      { id: 'M2.3-03', name: 'Proof points valid', rule: 'All exist in Product Truth Set', failMessage: 'Proof point not in Truth Set' },
      { id: 'M2.3-04', name: 'Scores correct', rule: 'Formula matches ±2 points', failMessage: 'Score calculation error' },
      { id: 'M2.3-05', name: 'No banned terms', rule: 'Zero matches in USP statements', failMessage: 'Banned term in USP' },
      { id: 'M2.3-06', name: 'Priority assigned', rule: 'Every USP has priority', failMessage: 'Missing priority' },
      { id: 'M2.3-07', name: 'Primary USPs exist', rule: '≥2 with priority=Primary', failMessage: 'Not enough Primary USPs' },
    ]
  },
  {
    id: 'M3',
    name: 'Keyword Intelligence',
    shortName: 'Keywords',
    dependsOn: ['M1', 'M2', 'M2.1', 'M2.3'],
    checks: [
      { id: 'M3-01', name: 'Primary keywords', rule: '≥5 in Primary tier', failMessage: 'Not enough Primary keywords' },
      { id: 'M3-02', name: 'All keywords scored', rule: 'Every keyword has score', failMessage: 'Keyword missing score' },
      { id: 'M3-03', name: 'Score formula correct', rule: 'Base + bonus = final ±1', failMessage: 'Score error' },
      { id: 'M3-04', name: 'All tiered', rule: 'Every keyword in exactly one tier', failMessage: 'Keyword in multiple tiers' },
      { id: 'M3-05', name: 'No duplicates', rule: 'keyword_canonical unique', failMessage: 'Duplicate keyword' },
      { id: 'M3-06', name: 'USP bundles complete', rule: 'Every USP has a bundle', failMessage: 'Missing bundle' },
      { id: 'M3-07', name: 'No risk-high in bundles', rule: 'risk_flag=high excluded', failMessage: 'High-risk keyword in bundle' },
      { id: 'M3-08', name: 'Coverage adequate', rule: 'Each bundle has ≥3 keywords', failMessage: 'Insufficient keywords' },
    ]
  },
  {
    id: 'M4',
    name: 'Listing Creation',
    shortName: 'Listing',
    dependsOn: ['M1', 'M2.3', 'M3'],
    checks: [
      { id: 'M4-01', name: 'Title length', rule: '≤200 characters', failMessage: 'Title too long' },
      { id: 'M4-02', name: 'Bullet count', rule: 'Exactly 5', failMessage: 'Wrong bullet count' },
      { id: 'M4-03', name: 'Bullet lengths', rule: 'Each ≤500 characters', failMessage: 'Bullet too long' },
      { id: 'M4-04', name: 'Description length', rule: '≤2000 characters', failMessage: 'Description too long' },
      { id: 'M4-05', name: 'Backend size', rule: '≤249 bytes', failMessage: 'Backend too large' },
      { id: 'M4-06', name: 'No banned terms', rule: 'Zero matches in any section', failMessage: 'Banned term found' },
      { id: 'M4-07', name: 'Keyword coverage', rule: '≥80% must-include used', failMessage: 'Keyword coverage low' },
      { id: 'M4-08', name: 'USP coverage', rule: 'All Primary USPs mentioned', failMessage: 'Missing USP' },
      { id: 'M4-09', name: 'No ALL CAPS', rule: 'No all-caps words', failMessage: 'ALL CAPS word found' },
      { id: 'M4-10', name: 'Quality score', rule: '≥80', failMessage: 'Quality score too low' },
    ]
  },
];

export const getModuleById = (id: string): ModuleDefinition | undefined => {
  return MODULE_DEFINITIONS.find(m => m.id === id);
};

export const getModuleDependencies = (id: string): string[] => {
  const module = getModuleById(id);
  return module?.dependsOn || [];
};
