// Report Parser: Transforms raw SLO pipeline JSON to VerificationInput format

import {
  VerificationInput,
  ProductContextInput,
  CompetitorDiscoveryInput,
  CustomerIntentInput,
  USPEvaluationInput,
  KeywordIntelligenceInput,
  ListingCreationInput,
} from './inputTypes';

/**
 * Raw report structure from SLO pipeline
 * This interface documents the expected shape of incoming JSON reports
 */
export interface RawSLOReport {
  // Metadata
  asin?: string;
  product_name?: string;

  // M1: Product Profile data
  product_profile?: {
    product_type?: string;
    category?: string[];
    key_attributes?: string[];
    initial_keyword_ideas?: string[];
    brand?: string;
    product_name?: string;
    features?: string[];
    specifications?: Record<string, string>;
    [key: string]: unknown;
  };

  // M2: Search terms and competitors
  search_terms?: string[];
  competitors?: {
    raw_list?: Array<{
      asin: string;
      [key: string]: unknown;
    }>;
    trimmed_list?: Array<{
      asin: string;
      relevance_score?: number;
      [key: string]: unknown;
    }>;
    final_list?: Array<{
      asin: string;
      relevance_score?: number;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };

  // M2.1: Intent themes (can be at root or nested)
  intent_themes?: RawIntentTheme[];
  intent_themes_processed?: RawIntentTheme[];

  // M2.3: USPs
  usps?: RawUSP[];

  // M3: Keywords
  keywords?: {
    enriched?: RawKeyword[];
    bundles?: Array<{
      usp_id: string | number;
      keywords: string[];
    }>;
    [key: string]: unknown;
  };

  // M4: Listing
  listing?: {
    title?: string;
    bullets?: string[];
    bullet_points?: string[]; // Alternative field name
    description?: string;
    backend_terms?: string;
    backend_search_terms?: string; // Alternative field name
    [key: string]: unknown;
  };

  // Allow additional fields
  [key: string]: unknown;
}

interface RawIntentTheme {
  name?: string;
  theme_name?: string;
  importance_score?: number;
  score?: number;
  desires?: string[];
  quotes?: string[];
  [key: string]: unknown;
}

interface RawUSP {
  usp_id?: string | number;
  id?: string;
  point?: string;
  statement?: string;
  themes?: string[];
  tags?: string[];
  customer_relevance_score?: number;
  competitive_uniqueness_score?: number;
  market_impact_potential?: number;
  total_usp_score?: number;
  total_score?: number;
  priority_type?: string;
  priority?: string;
  proof_points?: string[];
  [key: string]: unknown;
}

interface RawKeyword {
  keyword_text?: string;
  keyword?: string;
  keyword_canonical?: string;
  keyword_strength_score?: number;
  score?: number;
  priority_tier?: string;
  tier?: string;
  tier_notes?: string;
  demand_tier?: unknown;
  product_intent_relevance?: number;
  competitor_alignment_score?: number;
  search_demand_score?: number;
  usp_bonus?: number;
  risk_flag?: string;
  primary_usp_id?: string | number;
  linked_usp?: string;
  [key: string]: unknown;
}

/**
 * Normalize S3 format to expected format
 * Maps Title Case with spaces to snake_case
 */
function normalizeS3Format(raw: any): RawSLOReport {
  const normalized: any = { ...raw };

  // Map S3 Title Case keys to snake_case
  const keyMappings: Record<string, string> = {
    'Product Profile': 'product_profile',
    'Search Terms': 'search_terms',
    'intent_themes_processed': 'customer_intent',
    'USPs': 'usp_evaluation',
    'Keywords': 'keyword_intelligence',
    'Content': 'listing_creation',
    'ASIN': 'asin',
    'MSKU': 'msku',
  };

  for (const [oldKey, newKey] of Object.entries(keyMappings)) {
    if (raw[oldKey] !== undefined) {
      normalized[newKey] = raw[oldKey];
    }
  }

  return normalized;
}

/**
 * Parse raw JSON report content to VerificationInput format
 * Handles field name variations from the SLO pipeline
 */
export function parseReport(raw: unknown, fileAsin?: string): VerificationInput {
  // Normalize S3 format if needed
  const normalizedRaw = normalizeS3Format(raw);
  const report = normalizedRaw as RawSLOReport;

  // Extract ASIN from various possible locations
  const asin = extractAsin(report, fileAsin);

  // Extract product name
  const productName = extractProductName(report);

  return {
    asin,
    product_name: productName,
    m1: parseProductContext(report),
    m2: parseCompetitorDiscovery(report),
    m2_1: parseCustomerIntent(report),
    m2_3: parseUSPEvaluation(report),
    m3: parseKeywordIntelligence(report),
    m4: parseListingCreation(report),
  };
}

/**
 * Extract ASIN from report or filename
 */
function extractAsin(report: RawSLOReport, fileAsin?: string): string {
  // Try direct field (lowercase)
  if (report.asin) {
    return report.asin;
  }

  // Try uppercase ASIN field (S3 format)
  const rawReport = report as any;
  if (rawReport.ASIN) {
    return rawReport.ASIN;
  }

  // Try product_profile
  if (report.product_profile?.asin) {
    return report.product_profile.asin as string;
  }

  // Fall back to filename-derived ASIN
  if (fileAsin) {
    return fileAsin;
  }

  return 'UNKNOWN';
}

/**
 * Extract product name from various locations
 */
function extractProductName(report: RawSLOReport): string {
  // Direct field
  if (report.product_name) {
    return report.product_name;
  }

  // From Data from Amazon (S3 format)
  const amazonData = (report as any)['Data from Amazon'];
  if (amazonData?.attributes?.item_name?.[0]?.value) {
    return amazonData.attributes.item_name[0].value;
  }

  // From product_profile
  const profile = report.product_profile;
  if (profile) {
    if (profile.product_name) {
      return profile.product_name;
    }
    // Construct from brand + product_type
    if (profile.brand && profile.product_type) {
      return `${profile.brand} ${profile.product_type}`;
    }
    if (profile.product_type) {
      return profile.product_type;
    }
  }

  // From listing title
  if (report.listing?.title) {
    return report.listing.title;
  }

  return 'Unknown Product';
}

/**
 * Parse M1: Product Context
 */
function parseProductContext(report: RawSLOReport): ProductContextInput | undefined {
  const profile = report.product_profile;
  if (!profile) {
    return undefined;
  }

  const result: ProductContextInput = {};

  if (profile.product_type) {
    result.product_type = profile.product_type;
  }

  if (profile.category) {
    result.category_path = Array.isArray(profile.category)
      ? profile.category.join(' > ')
      : String(profile.category);
  }

  if (profile.key_attributes && Array.isArray(profile.key_attributes)) {
    result.key_attributes = profile.key_attributes;
  }

  if (profile.initial_keyword_ideas && Array.isArray(profile.initial_keyword_ideas)) {
    result.initial_keywords = profile.initial_keyword_ideas;
  }

  // Build truth_set from profile data and Data from Amazon
  const truthSet: ProductContextInput['truth_set'] = {};

  // Extract brand from profile or Data from Amazon
  if (profile.brand) {
    truthSet.brand = profile.brand;
  } else {
    // Try Data from Amazon (S3 format)
    const amazonData = (report as any)['Data from Amazon'];
    if (amazonData?.attributes?.brand?.[0]?.value) {
      truthSet.brand = amazonData.attributes.brand[0].value;
    }
  }

  // Extract product_name from profile or Data from Amazon
  if (profile.product_name) {
    truthSet.product_name = profile.product_name;
  } else {
    // Try Data from Amazon (S3 format)
    const amazonData = (report as any)['Data from Amazon'];
    if (amazonData?.attributes?.item_name?.[0]?.value) {
      truthSet.product_name = amazonData.attributes.item_name[0].value;
    } else if (profile.product_summary && typeof profile.product_summary === 'string') {
      // Fallback to product_summary if available
      truthSet.product_name = profile.product_summary.substring(0, 100);
    }
  }

  // Extract features
  if (profile.features) {
    truthSet.features = profile.features;
  } else if (profile.key_attributes && Array.isArray(profile.key_attributes)) {
    // Use key_attributes as features (S3 format)
    truthSet.features = profile.key_attributes;
  }

  // Extract specifications if available
  if (profile.specifications) {
    truthSet.specifications = profile.specifications;
  }

  // Warn if brand is missing
  if (!truthSet.brand) {
    const asin = (report as any).ASIN || (report as any).asin || 'unknown';
    console.warn(`[M1 Parser] No brand found for ASIN ${asin} - checked Product Profile and Data from Amazon`);
  }

  if (Object.keys(truthSet).length > 0) {
    result.truth_set = truthSet;
  }

  // Extract facts if present
  if (report.facts && Array.isArray(report.facts)) {
    result.facts = report.facts.map((f: unknown) => {
      const fact = f as { claim?: string; source_ref?: string };
      return {
        claim: fact.claim || String(f),
        source_ref: fact.source_ref,
      };
    });
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Parse M2: Competitor Discovery
 */
function parseCompetitorDiscovery(report: RawSLOReport): CompetitorDiscoveryInput | undefined {
  // Handle S3 format where search_terms is an object with selected/generated arrays
  let searchTerms: string[] | undefined;
  if (report.search_terms) {
    if (Array.isArray(report.search_terms)) {
      // Already an array of strings
      searchTerms = report.search_terms;
    } else if (typeof report.search_terms === 'object') {
      // S3 format: { selected: [{text, score}], generated: [{text, score}] }
      const stObj = report.search_terms as any;
      const selected = stObj.selected || stObj.generated || [];
      searchTerms = selected.map((item: any) =>
        typeof item === 'string' ? item : item.text || item.term || String(item)
      );
    }
  }

  const hasSearchTerms = searchTerms && searchTerms.length > 0;
  const hasCompetitors = report.competitors && (
    report.competitors.raw_list ||
    report.competitors.trimmed_list ||
    report.competitors.final_list
  );

  if (!hasSearchTerms && !hasCompetitors) {
    return undefined;
  }

  // Warn if competitors field is missing
  if (!report.competitors) {
    const asin = (report as any).ASIN || (report as any).asin || 'unknown';
    console.warn(`[M2 Parser] Missing competitors field for ASIN ${asin} - CompetitorDiscoveryInput will be incomplete`);
  }

  const result: CompetitorDiscoveryInput = {};

  if (hasSearchTerms) {
    result.search_terms = searchTerms;
  }

  if (report.competitors) {
    if (report.competitors.raw_list) {
      result.raw_list = report.competitors.raw_list;
    }
    if (report.competitors.trimmed_list) {
      result.trimmed_list = report.competitors.trimmed_list;
    }
    if (report.competitors.final_list) {
      result.final_list = report.competitors.final_list;
    }
  }

  return result;
}

/**
 * Normalize theme names to match VALID_THEME_NAMES
 * Maps common variations to standard names
 */
function normalizeThemeName(name: string): string {
  if (!name) return 'QUALITY';  // Safe default

  const normalized = name.toUpperCase().trim();

  // Valid theme names that pass through directly
  const validThemes = [
    'EASE_OF_USE', 'EASE_OF_CLEANING', 'DURABILITY', 'VALUE_FOR_MONEY',
    'PERFORMANCE', 'COOKING_PERFORMANCE', 'DESIGN', 'SIZE', 'CAPACITY',
    'NOISE_LEVEL', 'SAFETY', 'VERSATILITY', 'QUALITY', 'TEXTURE',
    'HYDRATION', 'RESULTS', 'SMELL', 'PACKAGING', 'SHIPPING',
    'CUSTOMER_SERVICE', 'WARRANTY', 'INGREDIENTS', 'EFFECTIVENESS'
  ];

  if (validThemes.includes(normalized)) {
    return normalized;
  }

  // Common mappings for invalid theme names
  const mappings: Record<string, string> = {
    'USAGE': 'EASE_OF_USE',
    'VALUE': 'VALUE_FOR_MONEY',
    'COMPATIBILITY': 'VERSATILITY',
    'APPEARANCE': 'DESIGN',
    'MAINTENANCE': 'EASE_OF_CLEANING',
    'SENSITIVITY': 'QUALITY',
    'COMFORT': 'QUALITY',
    'AESTHETICS': 'DESIGN',
    'PRICE': 'VALUE_FOR_MONEY',
    'LONGEVITY': 'DURABILITY',
    'CLEANING': 'EASE_OF_CLEANING',
    'FIT': 'SIZE',
    'EASE': 'EASE_OF_USE',
    'CONVENIENCE': 'EASE_OF_USE',
    'RELIABILITY': 'DURABILITY',
    'EFFICACY': 'EFFECTIVENESS',
    'EFFICIENCY': 'PERFORMANCE',
    'STYLE': 'DESIGN',
    'LOOK': 'DESIGN',
  };

  // Return mapped value or original if no mapping exists
  return mappings[normalized] || normalized;
}

/**
 * Parse M2.1: Customer Intent
 */
function parseCustomerIntent(report: RawSLOReport): CustomerIntentInput | undefined {
  // Check multiple possible field names
  const themes = report.intent_themes_processed || report.intent_themes;

  if (!themes || !Array.isArray(themes) || themes.length === 0) {
    return undefined;
  }

  return {
    themes: themes.map((t: RawIntentTheme, idx: number) => ({
      id: `theme_${idx + 1}`,
      name: normalizeThemeName(t.name || t.theme_name || `Theme ${idx + 1}`),
      score: t.importance_score ?? t.score,
      quotes: t.desires || t.quotes || (t as any).questions || [],
    })),
  };
}

/**
 * Parse M2.3: USP Evaluation
 */
function parseUSPEvaluation(report: RawSLOReport): USPEvaluationInput | undefined {
  // Check both normalized and original field names
  const usps = report.usp_evaluation || report.usps || (report as any).USPs;

  if (!usps || !Array.isArray(usps) || usps.length === 0) {
    return undefined;
  }

  const result: USPEvaluationInput = {
    usps: usps.map((u: RawUSP) => {
      const id = u.id || (u.usp_id ? `usp_${u.usp_id}` : `usp_${Math.random().toString(36).substr(2, 9)}`);

      const scores: {
        customer_relevance?: number;
        competitive_uniqueness?: number;
        market_impact?: number;
      } = {};

      if (u.customer_relevance_score !== undefined) {
        scores.customer_relevance = u.customer_relevance_score;
      }
      if (u.competitive_uniqueness_score !== undefined) {
        scores.competitive_uniqueness = u.competitive_uniqueness_score;
      }
      if (u.market_impact_potential !== undefined) {
        scores.market_impact = u.market_impact_potential;
      }

      return {
        id,
        statement: u.point || u.statement || '',
        tags: u.themes || u.tags,
        proof_points: u.proof_points,
        scores: Object.keys(scores).length > 0 ? scores : undefined,
        total_score: u.total_usp_score ?? u.total_score,
        priority: normalizePriority(u.priority_type || u.priority),
      };
    }),
  };

  // Extract truth_set_facts if available
  const profile = report.product_profile;
  if (profile?.features) {
    result.truth_set_facts = profile.features;
  }

  return result;
}

/**
 * Normalize priority string to expected enum values
 */
function normalizePriority(priority?: string): 'Primary' | 'Secondary' | 'Tertiary' | undefined {
  if (!priority) return 'Secondary';  // Default to Secondary instead of undefined

  const normalized = priority.toLowerCase();
  if (normalized.includes('primary') || normalized === '1' || normalized === 'high') {
    return 'Primary';
  }
  if (normalized.includes('secondary') || normalized === '2' || normalized === 'medium' ||
      normalized === 'custom' || normalized === 'standard') {
    return 'Secondary';
  }
  if (normalized.includes('tertiary') || normalized === '3' || normalized === 'low') {
    return 'Tertiary';
  }

  // Default to Secondary for unrecognized values
  return 'Secondary';
}

/**
 * Parse M3: Keyword Intelligence
 */
function parseKeywordIntelligence(report: RawSLOReport): KeywordIntelligenceInput | undefined {
  // Check normalized and original field names
  const keywordsData = report.keyword_intelligence || report.keywords || (report as any).Keywords;

  if (!keywordsData?.enriched || !Array.isArray(keywordsData.enriched)) {
    return undefined;
  }

  const result: KeywordIntelligenceInput = {
    keywords: keywordsData.enriched.map((k: RawKeyword) => {
      const components: {
        product_intent_relevance?: number;
        competitor_alignment_score?: number;
        search_demand_score?: number;
      } = {};

      if (k.product_intent_relevance !== undefined) {
        components.product_intent_relevance = k.product_intent_relevance;
      }
      if (k.competitor_alignment_score !== undefined) {
        components.competitor_alignment_score = k.competitor_alignment_score;
      }
      if (k.search_demand_score !== undefined) {
        components.search_demand_score = k.search_demand_score;
      }

      return {
        keyword: k.keyword_text || k.keyword || '',
        keyword_canonical: k.keyword_canonical,
        score: k.keyword_strength_score ?? k.score,
        tier: normalizeTier(k.priority_tier || k.tier) || extractTierFromNotes((k as any).tier_notes),
        components: Object.keys(components).length > 0 ? components : undefined,
        usp_bonus: k.usp_bonus,
        risk_flag: normalizeRiskFlag(k.risk_flag),
        linked_usp: k.linked_usp || (k.primary_usp_id ? `usp_${k.primary_usp_id}` : undefined),
      };
    }),
  };

  // Parse USP bundles if present
  if (keywordsData.bundles && Array.isArray(keywordsData.bundles)) {
    result.usp_bundles = keywordsData.bundles.map((b: any) => ({
      usp_id: `usp_${b.usp_id}`,
      keywords: b.keywords,
    }));
  }

  // Extract approved USPs from the report
  const usps = report.usps;
  if (usps && Array.isArray(usps)) {
    result.approved_usps = usps.map((u: RawUSP) => ({
      id: u.id || (u.usp_id ? `usp_${u.usp_id}` : ''),
    }));
  }

  return result;
}

/**
 * Normalize tier string to expected enum values
 */
function normalizeTier(tier?: string): 'Primary' | 'Secondary' | 'Long-tail' | 'Excluded' | undefined {
  if (!tier) return undefined;

  const normalized = tier.toLowerCase();
  if (normalized.includes('primary') || normalized === '1' || normalized === 'high') {
    return 'Primary';
  }
  if (normalized.includes('secondary') || normalized === '2' || normalized === 'medium') {
    return 'Secondary';
  }
  if (normalized.includes('long') || normalized.includes('tail') || normalized === '3') {
    return 'Long-tail';
  }
  if (normalized.includes('exclude') || normalized === '4' || normalized === 'none') {
    return 'Excluded';
  }

  return undefined;
}

/**
 * Normalize risk flag to expected enum values
 */
function normalizeRiskFlag(flag?: string): 'none' | 'low' | 'medium' | 'high' | undefined {
  if (!flag) return 'none';

  const normalized = flag.toLowerCase();
  if (normalized === 'none' || normalized === 'no' || normalized === '0') {
    return 'none';
  }
  if (normalized === 'low' || normalized === '1') {
    return 'low';
  }
  if (normalized === 'medium' || normalized === 'med' || normalized === '2') {
    return 'medium';
  }
  if (normalized === 'high' || normalized === '3') {
    return 'high';
  }

  return 'none';
}

/**
 * Extract tier from tier_notes string description
 * Used when priority_tier and tier fields are missing
 */
function extractTierFromNotes(tierNotes?: string): 'Primary' | 'Secondary' | 'Long-tail' | 'Excluded' | undefined {
  if (!tierNotes || typeof tierNotes !== 'string') {
    return undefined;
  }

  const notes = tierNotes.toLowerCase();

  // Primary tier patterns
  if (notes.includes('primary') || notes.includes('tier 1') || notes.includes('tier-1') ||
      notes.includes('tier1') || notes.includes('high priority') || notes.includes('core keyword') ||
      notes.includes('main keyword') || notes.includes('essential')) {
    return 'Primary';
  }

  // Secondary tier patterns
  if (notes.includes('secondary') || notes.includes('tier 2') || notes.includes('tier-2') ||
      notes.includes('tier2') || notes.includes('medium priority') || notes.includes('supporting') ||
      notes.includes('supplementary') || notes.includes('moderate')) {
    return 'Secondary';
  }

  // Long-tail tier patterns
  if (notes.includes('long-tail') || notes.includes('longtail') || notes.includes('long tail') ||
      notes.includes('tier 3') || notes.includes('tier-3') || notes.includes('tier3') ||
      notes.includes('niche') || notes.includes('low volume') || notes.includes('specific')) {
    return 'Long-tail';
  }

  // Excluded tier patterns
  if (notes.includes('exclude') || notes.includes('excluded') || notes.includes('filter') ||
      notes.includes('remove') || notes.includes('negative') || notes.includes('blocked')) {
    return 'Excluded';
  }

  // Default to Secondary for unrecognized notes
  return 'Secondary';
}

/**
 * Parse M4: Listing Creation
 */
function parseListingCreation(report: RawSLOReport): ListingCreationInput | undefined {
  // Check normalized and original field names
  const listing = report.listing_creation || report.listing || (report as any).Content;

  if (!listing) {
    return undefined;
  }

  const result: ListingCreationInput = {};

  if (listing.title) {
    result.title = listing.title;
  }

  // Handle both "bullets" and "bullet_points" field names
  if (listing.bullets && Array.isArray(listing.bullets)) {
    result.bullets = listing.bullets;
  } else if (listing.bullet_points && Array.isArray(listing.bullet_points)) {
    result.bullets = listing.bullet_points;
  }

  if (listing.description) {
    result.description = listing.description;
  }

  // Handle both "backend_terms" and "backend_search_terms" field names
  if (listing.backend_terms) {
    result.backend_terms = listing.backend_terms;
  } else if (listing.backend_search_terms) {
    result.backend_terms = listing.backend_search_terms;
  }

  // Extract primary keywords from M3 data
  const keywords = report.keywords?.enriched;
  if (keywords && Array.isArray(keywords)) {
    const primaryKeywords = keywords
      .filter((k: RawKeyword) => {
        const tier = k.priority_tier || k.tier;
        return tier && tier.toLowerCase().includes('primary');
      })
      .map((k: RawKeyword) => k.keyword_text || k.keyword || '')
      .filter(Boolean);

    if (primaryKeywords.length > 0) {
      result.primary_keywords = primaryKeywords;
    }
  }

  // Extract primary USPs
  const usps = report.usps;
  if (usps && Array.isArray(usps)) {
    const primaryUSPs = usps
      .filter((u: RawUSP) => {
        const priority = u.priority_type || u.priority;
        return priority && priority.toLowerCase().includes('primary');
      })
      .map((u: RawUSP) => ({
        statement: u.point || u.statement || '',
      }));

    if (primaryUSPs.length > 0) {
      result.primary_usps = primaryUSPs;
    }
  }

  // Quality score if present
  if (typeof listing.quality_score === 'number') {
    result.quality_score = listing.quality_score;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Validate that a parsed report has minimum required data
 */
export function validateParsedReport(input: VerificationInput): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!input.asin || input.asin === 'UNKNOWN') {
    errors.push('Missing ASIN');
  }

  if (!input.product_name || input.product_name === 'Unknown Product') {
    warnings.push('Missing product name');
  }

  // Check for at least some module data
  const hasModuleData = input.m1 || input.m2 || input.m2_1 || input.m2_3 || input.m3 || input.m4;
  if (!hasModuleData) {
    errors.push('No module data found in report');
  }

  // Module-specific warnings
  if (!input.m1) {
    warnings.push('M1 (Product Context) data not found');
  }

  if (!input.m2_1) {
    warnings.push('M2.1 (Customer Intent) data not found');
  } else if (!input.m2_1.themes || input.m2_1.themes.length === 0) {
    warnings.push('M2.1 has no themes');
  }

  if (!input.m2_3) {
    warnings.push('M2.3 (USP Evaluation) data not found');
  } else if (!input.m2_3.usps || input.m2_3.usps.length === 0) {
    warnings.push('M2.3 has no USPs');
  }

  if (!input.m3) {
    warnings.push('M3 (Keyword Intelligence) data not found');
  } else if (!input.m3.keywords || input.m3.keywords.length === 0) {
    warnings.push('M3 has no keywords');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Parse multiple reports and return summary
 */
export function parseReports(
  reports: Array<{ content: unknown; asin?: string }>
): Array<{
  asin: string;
  input: VerificationInput;
  validation: ReturnType<typeof validateParsedReport>;
}> {
  return reports.map(({ content, asin }) => {
    const input = parseReport(content, asin);
    const validation = validateParsedReport(input);
    return { asin: input.asin, input, validation };
  });
}
