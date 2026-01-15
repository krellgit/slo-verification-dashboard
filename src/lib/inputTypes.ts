// Input types for module data to be verified

// M1: Product Context Input
export interface ProductContextInput {
  product_type?: string;
  category_path?: string;
  key_attributes?: string[];
  initial_keywords?: string[];
  truth_set?: {
    brand?: string;
    product_name?: string;
    features?: string[];
    specifications?: Record<string, string>;
    [key: string]: unknown;
  };
  facts?: Array<{
    claim: string;
    source_ref?: string;
  }>;
}

// M2: Competitor Discovery Input
export interface CompetitorDiscoveryInput {
  search_terms?: string[];
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
}

// M2.1: Customer Intent Input
export interface CustomerIntentInput {
  themes?: Array<{
    id: string;
    name: string;
    score?: number;
    quotes?: string[];
    [key: string]: unknown;
  }>;
  source_reviews?: string[];
}

// Controlled vocabulary for theme names
export const VALID_THEME_NAMES = [
  'EASE_OF_USE', 'EASE_OF_CLEANING', 'DURABILITY', 'VALUE_FOR_MONEY',
  'PERFORMANCE', 'COOKING_PERFORMANCE', 'DESIGN', 'SIZE', 'CAPACITY',
  'NOISE_LEVEL', 'SAFETY', 'VERSATILITY', 'QUALITY', 'TEXTURE',
  'HYDRATION', 'RESULTS', 'SMELL', 'PACKAGING', 'SHIPPING',
  'CUSTOMER_SERVICE', 'WARRANTY', 'INGREDIENTS', 'EFFECTIVENESS'
];

export const FORBIDDEN_THEMES = ['SHIPPING', 'PACKAGING', 'CUSTOMER_SERVICE'];

// M2.3: USP Evaluation Input
export interface USPEvaluationInput {
  usps?: Array<{
    id: string;
    statement: string;
    tags?: string[];
    proof_points?: string[];
    scores?: {
      customer_relevance?: number;
      competitive_uniqueness?: number;
      market_impact?: number;
    };
    total_score?: number;
    priority?: 'Primary' | 'Secondary' | 'Tertiary';
    [key: string]: unknown;
  }>;
  truth_set_facts?: string[];
}

// M3: Keyword Intelligence Input
export interface KeywordIntelligenceInput {
  keywords?: Array<{
    keyword: string;
    keyword_canonical?: string;
    score?: number;
    tier?: 'Primary' | 'Secondary' | 'Long-tail' | 'Excluded';
    components?: {
      product_intent_relevance?: number;
      competitor_alignment_score?: number;
      search_demand_score?: number;
    };
    usp_bonus?: number;
    risk_flag?: 'none' | 'low' | 'medium' | 'high';
    linked_usp?: string;
    [key: string]: unknown;
  }>;
  usp_bundles?: Array<{
    usp_id: string;
    keywords: string[];
  }>;
  approved_usps?: Array<{ id: string }>;
}

// M4: Listing Creation Input
export interface ListingCreationInput {
  title?: string;
  bullets?: string[];
  description?: string;
  backend_terms?: string;
  primary_keywords?: string[];
  primary_usps?: Array<{ statement: string }>;
  quality_score?: number;
}

// Combined input for full verification
export interface VerificationInput {
  asin: string;
  product_name: string;
  m1?: ProductContextInput;
  m2?: CompetitorDiscoveryInput;
  m2_1?: CustomerIntentInput;
  m2_3?: USPEvaluationInput;
  m3?: KeywordIntelligenceInput;
  m4?: ListingCreationInput;
  banned_terms?: string[];
}

// Default banned terms (can be extended)
export const DEFAULT_BANNED_TERMS = [
  'best', 'guaranteed', '#1', 'number one', 'top rated', 'cure', 'heal',
  'treat', 'prevent', 'miracle', 'magic', 'revolutionary', 'breakthrough',
  'clinically proven', 'doctor recommended', 'FDA approved', 'patented',
  'wholesale', 'cheap', 'free', 'discount', 'sale', 'limited time'
];
