# S3 JSON Schema Reference

Complete reference for SLO Verification Dashboard JSON format.

**Version:** 2.0
**Last Updated:** 2026-01-22
**Parser:** reportParser.ts

---

## Overview

The SLO Verification Dashboard expects JSON files with data for 6 verification modules (M1, M2, M2.1, M2.3, M3, M4). This document describes the expected structure, field names, data types, and valid values.

---

## Root Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ASIN` or `asin` | string | ✅ Yes | Amazon Standard Identification Number |
| `MSKU` or `msku` | string | No | Merchant SKU |
| `Product Profile` | object | ✅ Yes | M1 data |
| `Search Terms` | object/array | ✅ Yes | M2 data |
| `intent_themes_processed` | array | ✅ Yes | M2.1 data |
| `USPs` | array | ✅ Yes | M2.3 data |
| `Keywords` | object | ✅ Yes | M3 data |
| `Content` | object | ✅ Yes | M4 data |
| `Data from Amazon` | object | No | Fallback source for brand/product_name |

---

## M1: Product Profile

**Field Name:** `Product Profile` (Title Case with space)
**Parser Maps To:** `product_profile`

### Structure

```json
{
  "Product Profile": {
    "product_type": "MEDICATION",
    "category": ["Health & Household", "Medicine & Health Care", "Pain Relievers"],
    "key_attributes": [
      "Fast-acting pain relief",
      "200mg ibuprofen tablets",
      "Reduces inflammation"
    ],
    "initial_keyword_ideas": [
      "ibuprofen",
      "pain relief",
      "headache medicine"
    ],
    "brand": "Advil",
    "product_name": "Advil Pain Medication Ibuprofen 200mg Tablets",
    "features": [
      "Fast relief from headaches",
      "200mg ibuprofen per tablet",
      "Easy to swallow coating"
    ],
    "specifications": {
      "Active Ingredient": "Ibuprofen 200mg",
      "Count": "300 tablets",
      "Form": "Tablet"
    }
  }
}
```

### Fields

| Field | Type | Required | Description | Parser Fallback |
|-------|------|----------|-------------|-----------------|
| `product_type` | string | ✅ Yes | Product category type | None |
| `category` | array<string> | ✅ Yes | Category path | None |
| `key_attributes` | array<string> | ✅ Yes | Key product attributes | None |
| `initial_keyword_ideas` | array<string> | Recommended | Initial keywords | None |
| `brand` | string | ⚠️ Missing in samples | Brand name | Data from Amazon.attributes.brand[0].value |
| `product_name` | string | ⚠️ Missing in samples | Product title | Data from Amazon.attributes.item_name[0].value, product_summary |
| `features` | array<string> | ⚠️ Missing in samples | Product features | Uses key_attributes |
| `specifications` | object | No | Technical specs | None |

**Issues in Current Output:**
- ❌ brand, product_name, features missing from all samples
- ✅ Parser fallbacks compensate but should be added to output

---

## M2: Competitor Discovery

**Field Name:** `Search Terms` (Title Case)
**Parser Maps To:** `search_terms`

### Structure

```json
{
  "Search Terms": {
    "selected": [
      {"text": "ibuprofen", "score": 95},
      {"text": "pain relief", "score": 88}
    ],
    "generated": [
      {"text": "headache medicine", "score": 82}
    ]
  },
  "competitors": {
    "raw_list": [
      {"asin": "B001234567"},
      {"asin": "B007654321"}
    ],
    "trimmed_list": [
      {"asin": "B001234567", "relevance_score": 0.92}
    ],
    "final_list": [
      {"asin": "B001234567", "relevance_score": 0.95}
    ]
  }
}
```

### Fields

| Field | Type | Required | Description | Parser Handling |
|-------|------|----------|-------------|-----------------|
| `Search Terms` | object or array | ✅ Yes | Search terms data | Extracts .text from selected/generated arrays |
| `competitors` | object | ⚠️ Missing | Competitor ASIN lists | Returns partial M2 data without this |
| `competitors.raw_list` | array | ⚠️ Missing | Initial competitors | None |
| `competitors.trimmed_list` | array | ⚠️ Missing | Filtered competitors | None |
| `competitors.final_list` | array | ⚠️ Missing | Final competitor set | None |

**Issues in Current Output:**
- ❌ competitors field completely missing from all samples
- ✅ Parser handles missing competitors but M2 data incomplete

**Parser Behavior:**
```typescript
// Extracts search terms from object structure
const selected = stObj.selected || stObj.generated || [];
searchTerms = selected.map(item => item.text || item.term || String(item));
```

---

## M2.1: Customer Intent

**Field Name:** `intent_themes_processed`
**Alternative:** `intent_themes`

### Structure

```json
{
  "intent_themes_processed": [
    {
      "name": "RESULTS",
      "importance_score": 85,
      "desires": [
        "Fast pain relief",
        "Long-lasting effectiveness"
      ],
      "questions": [
        "How fast does it work?",
        "Will it help with my headache?"
      ],
      "pains": [
        "Slow-acting pain relief",
        "Short duration"
      ],
      "features": [
        "Fast-acting formula",
        "8-hour relief"
      ]
    }
  ]
}
```

### Fields per Theme

| Field | Type | Required | Valid Values | Parser Handling |
|-------|------|----------|--------------|-----------------|
| `name` | string | ✅ Yes | See VALID_THEME_NAMES | Normalizes to valid names |
| `importance_score` | number | ✅ Yes | 0-100 | Uses as score |
| `desires` | array<string> | Recommended | Customer desires | Maps to quotes |
| `quotes` | array<string> | Alternative | Customer quotes | Primary quotes field |
| `questions` | array<string> | No | Customer questions | Fallback for quotes |
| `pains` | array<string> | No | Customer pain points | Ignored |
| `features` | array<string> | No | Related features | Ignored |

**VALID_THEME_NAMES:**
```
EASE_OF_USE, EASE_OF_CLEANING, DURABILITY, VALUE_FOR_MONEY,
PERFORMANCE, COOKING_PERFORMANCE, DESIGN, SIZE, CAPACITY,
NOISE_LEVEL, SAFETY, VERSATILITY, QUALITY, TEXTURE,
HYDRATION, RESULTS, SMELL, PACKAGING, SHIPPING,
CUSTOMER_SERVICE, WARRANTY, INGREDIENTS, EFFECTIVENESS
```

**FORBIDDEN_THEMES (Will be rejected):**
```
SHIPPING, PACKAGING, CUSTOMER_SERVICE, WARRANTY
```

**Issues in Current Output:**
- ❌ Invalid theme names: USAGE, VALUE, COMPATIBILITY, APPEARANCE, MAINTENANCE, SENSITIVITY
- ✅ Parser normalizes these to valid names automatically

**Theme Name Normalization:**
```
USAGE → EASE_OF_USE
VALUE → VALUE_FOR_MONEY
COMPATIBILITY → VERSATILITY
APPEARANCE → DESIGN
MAINTENANCE → EASE_OF_CLEANING
SENSITIVITY → QUALITY
```

---

## M2.3: USP Evaluation

**Field Name:** `USPs` (Title Case, plural)
**Alternative:** `usps`, `usp_evaluation`

### Structure

```json
{
  "USPs": [
    {
      "usp_id": 1,
      "point": "Fast-acting pain relief in as little as 20 minutes",
      "themes": ["RESULTS", "EFFECTIVENESS"],
      "customer_relevance_score": 88,
      "competitive_uniqueness_score": 72,
      "market_impact_potential": 85,
      "total_usp_score": 82,
      "priority_type": "Primary",
      "proof_points": [
        "Clinical studies show relief in 20-30 minutes",
        "Contains 200mg ibuprofen per tablet"
      ]
    }
  ]
}
```

### Fields per USP

| Field | Type | Required | Valid Values | Parser Handling |
|-------|------|----------|--------------|-----------------|
| `usp_id` | number/string | ✅ Yes | Unique ID | Generates `usp_${id}` |
| `point` | string | ✅ Yes | USP statement | Maps to statement |
| `themes` | array<string> | Recommended | Theme names | Maps to tags |
| `customer_relevance_score` | number | ✅ Yes | 0-100 | Extracts to scores |
| `competitive_uniqueness_score` | number | ✅ Yes | 0-100 | Extracts to scores |
| `market_impact_potential` | number | ✅ Yes | 0-100 | Extracts to scores |
| `total_usp_score` | number | ✅ Yes | 0-100 | Extracts as total_score |
| `priority_type` | string | ✅ Yes | Primary/Secondary/Tertiary | Normalizes including Custom |
| `proof_points` | array<string> | No | Supporting evidence | Extracts if present |

**Valid Priority Values:**
- `Primary` or `primary` or `1` or `high`
- `Secondary` or `secondary` or `2` or `medium` or `custom` or `standard`
- `Tertiary` or `tertiary` or `3` or `low`

**Issues in Current Output:**
- ⚠️ Some USPs have priority_type = 'Custom' (1 sample)
- ⚠️ Some USPs have empty themes array (1 sample)
- ✅ Parser normalizes Custom → Secondary

---

## M3: Keyword Intelligence

**Field Name:** `Keywords` (Title Case)
**Alternative:** `keywords`, `keyword_intelligence`

### Structure

```json
{
  "Keywords": {
    "enriched": [
      {
        "keyword_text": "ibuprofen",
        "keyword_canonical": "ibuprofen",
        "keyword_strength_score": 95,
        "priority_tier": "Primary",
        "product_intent_relevance": 98,
        "competitor_alignment_score": 92,
        "search_demand_score": 88,
        "usp_bonus": 5,
        "risk_flag": "none",
        "linked_usp": "usp_1"
      }
    ],
    "bundles": [
      {
        "usp_id": 1,
        "keywords": ["ibuprofen", "pain relief", "fast acting"]
      }
    ]
  }
}
```

### Fields per Keyword

| Field | Type | Required | Valid Values | Parser Handling |
|-------|------|----------|--------------|-----------------|
| `keyword_text` | string | ✅ Yes | Keyword phrase | Primary keyword field |
| `keyword_canonical` | string | No | Canonical form | Extracts if present |
| `keyword_strength_score` | number | ✅ Yes | 0-100 | Maps to score |
| `priority_tier` | string | ⚠️ Missing | Primary/Secondary/Long-tail/Excluded | **MISSING - Uses tier_notes** |
| `tier` | string | Alternative | Same as priority_tier | Alternative field name |
| `tier_notes` | string | ⚠️ Current format | Text description | **Extracts tier from text** |
| `demand_tier` | unknown | No | Unknown structure | Not used |
| `product_intent_relevance` | number | No | 0-100 | Component score |
| `competitor_alignment_score` | number | No | 0-100 | Component score |
| `search_demand_score` | number | No | 0-100 | Component score |
| `usp_bonus` | number | No | Bonus points | Extracts if present |
| `risk_flag` | string | No | none/low/medium/high | Normalizes |
| `linked_usp` | string | No | USP ID reference | Extracts if present |
| `primary_usp_id` | number | No | USP ID | Converts to usp_${id} |

**Valid Tier Values:**
- `Primary` - High-priority main keywords
- `Secondary` - Supporting keywords
- `Long-tail` - Niche/specific keywords
- `Excluded` - Keywords to avoid

**Issues in Current Output:**
- ❌ All samples use tier_notes (string) instead of priority_tier (enum)
- ✅ Parser extracts tier from tier_notes text automatically

**Parser Tier Extraction Patterns:**
```
Primary: "primary", "tier 1", "high priority", "core keyword"
Secondary: "secondary", "tier 2", "medium priority", "supporting"
Long-tail: "long-tail", "tier 3", "niche", "low volume"
Excluded: "exclude", "filter", "remove", "negative"
Default: Secondary (for unrecognized)
```

---

## M4: Listing Creation

**Field Name:** `Content` (Title Case)
**Parser Maps To:** `listing_creation`
**Alternative:** `listing`

### Structure

```json
{
  "Content": {
    "title": "Advil Pain Medication Ibuprofen 200mg Tablets, 300 Count - Fast Relief",
    "bullet_points": [
      "Fast-acting pain relief for headaches, muscle aches, and minor arthritis",
      "Contains 200mg of ibuprofen per tablet for effective pain management",
      "Easy-to-swallow film-coated tablets",
      "Reduces fever and inflammation",
      "Trusted brand recommended by doctors for over 35 years"
    ],
    "description": "Advil provides fast, effective relief from pain and fever...",
    "backend_search_terms": "ibuprofen pain relief headache fever anti-inflammatory"
  }
}
```

### Fields

| Field | Type | Required | Description | Parser Handling |
|-------|------|----------|-------------|-----------------|
| `title` | string | ✅ Yes | Product title (max 200 chars) | Direct extract |
| `bullet_points` | array<string> | ✅ Yes | Bullet points (5 max) | **Maps to bullets** |
| `bullets` | array<string> | Alternative | Preferred field name | Primary field name |
| `description` | string | ✅ Yes | Product description | Direct extract |
| `backend_search_terms` | string | ✅ Yes | Search terms (max 250 bytes) | **Maps to backend_terms** |
| `backend_terms` | string | Alternative | Preferred field name | Primary field name |
| `metadata` | object | No | Generation metadata | Ignored |

**Issues in Current Output:**
- ✅ All samples use bullet_points (parser has fallback)
- ✅ All samples use backend_search_terms (parser has fallback)
- ✅ No errors - working as expected

**Recommendation:**
Standardize to use `bullets` and `backend_terms` for consistency.

---

## Complete Example JSON

```json
{
  "ASIN": "B0006SW71G",
  "MSKU": "Test40",

  "Product Profile": {
    "product_type": "MEDICATION",
    "category": ["Health & Household", "Medicine & Health Care", "Pain Relievers"],
    "key_attributes": ["Fast-acting", "200mg ibuprofen", "Easy to swallow"],
    "initial_keyword_ideas": ["ibuprofen", "pain relief", "headache"],
    "brand": "Advil",
    "product_name": "Advil Pain Medication Ibuprofen 200mg Tablets",
    "features": ["Fast relief", "Reduces inflammation", "Fever reducer"],
    "specifications": {
      "Active Ingredient": "Ibuprofen 200mg"
    }
  },

  "Search Terms": {
    "selected": [
      {"text": "ibuprofen", "score": 95},
      {"text": "pain relief", "score": 88}
    ],
    "generated": [
      {"text": "headache medicine", "score": 82}
    ]
  },

  "competitors": {
    "raw_list": [
      {"asin": "B001234567"},
      {"asin": "B007654321"}
    ],
    "trimmed_list": [
      {"asin": "B001234567", "relevance_score": 0.92}
    ],
    "final_list": [
      {"asin": "B001234567", "relevance_score": 0.95}
    ]
  },

  "intent_themes_processed": [
    {
      "name": "RESULTS",
      "importance_score": 85,
      "desires": ["Fast pain relief", "Long-lasting effectiveness"]
    },
    {
      "name": "EASE_OF_USE",
      "importance_score": 72,
      "desires": ["Easy to swallow", "Convenient dosing"]
    }
  ],

  "USPs": [
    {
      "usp_id": 1,
      "point": "Fast-acting pain relief in as little as 20 minutes",
      "themes": ["RESULTS", "EFFECTIVENESS"],
      "customer_relevance_score": 88,
      "competitive_uniqueness_score": 72,
      "market_impact_potential": 85,
      "total_usp_score": 82,
      "priority_type": "Primary",
      "proof_points": ["Clinical studies", "200mg ibuprofen"]
    }
  ],

  "Keywords": {
    "enriched": [
      {
        "keyword_text": "ibuprofen",
        "keyword_canonical": "ibuprofen",
        "keyword_strength_score": 95,
        "priority_tier": "Primary",
        "product_intent_relevance": 98,
        "competitor_alignment_score": 92,
        "search_demand_score": 88,
        "usp_bonus": 5,
        "risk_flag": "none",
        "linked_usp": "usp_1"
      }
    ],
    "bundles": [
      {
        "usp_id": 1,
        "keywords": ["ibuprofen", "pain relief"]
      }
    ]
  },

  "Content": {
    "title": "Advil Pain Medication Ibuprofen 200mg Tablets, 300 Count",
    "bullets": [
      "Fast-acting pain relief for headaches and muscle aches",
      "Contains 200mg of ibuprofen per tablet",
      "Easy-to-swallow film-coated tablets",
      "Reduces fever and inflammation",
      "Trusted brand recommended by doctors"
    ],
    "description": "Advil provides fast, effective relief...",
    "backend_terms": "ibuprofen pain relief headache fever"
  },

  "Data from Amazon": {
    "attributes": {
      "brand": [{"value": "Advil"}],
      "item_name": [{"value": "Advil Pain Medication Ibuprofen 200mg Tablets"}]
    }
  }
}
```

---

## Field Name Mappings

### S3 Title Case → Parser Internal Names

| S3 Field Name | Parser Internal Name | Module |
|---------------|---------------------|--------|
| `Product Profile` | `product_profile` | M1 |
| `Search Terms` | `search_terms` | M2 |
| `intent_themes_processed` | `customer_intent` | M2.1 |
| `USPs` | `usp_evaluation` | M2.3 |
| `Keywords` | `keyword_intelligence` | M3 |
| `Content` | `listing_creation` | M4 |

---

## Common Errors and Fixes

### Error 1: "Keywords have undefined tier"

**Cause:** Missing `priority_tier` or `tier` field
**Current:** Keywords use `tier_notes` string
**Fix:** Add `priority_tier` enum field
**Workaround:** Parser extracts from tier_notes

### Error 2: "Invalid theme name"

**Cause:** Theme name not in VALID_THEME_NAMES
**Current:** USAGE, VALUE, COMPATIBILITY, etc.
**Fix:** Use only valid theme names
**Workaround:** Parser normalizes to valid names

### Error 3: "Missing brand"

**Cause:** Brand not in Product Profile
**Current:** Only in Data from Amazon
**Fix:** Add brand to Product Profile
**Workaround:** Parser uses Data from Amazon fallback

### Error 4: "Missing competitors"

**Cause:** No competitors field
**Current:** Field doesn't exist
**Fix:** Add competitors object with lists
**Workaround:** M2 data incomplete (only search_terms)

### Error 5: "USP priority undefined"

**Cause:** Priority value 'Custom' not recognized
**Current:** Uses 'Custom' value
**Fix:** Use Primary/Secondary/Tertiary only
**Workaround:** Parser maps Custom → Secondary

---

## Data Type Reference

### String Fields
- ASIN: 10 characters (B followed by 9 alphanumeric)
- Theme names: UPPERCASE_WITH_UNDERSCORES
- Priority: Primary/Secondary/Tertiary
- Tier: Primary/Secondary/Long-tail/Excluded

### Number Fields
- Scores: 0-100 (percentage or points)
- Counts: Non-negative integers

### Array Fields
- Minimum: Usually empty array allowed
- Maximum: Varies by field (bullets: 5, themes: ~15, keywords: ~200)

### Object Fields
- Must have at least one expected subfield
- Unknown fields ignored by parser

---

## Validation Rules

### M1 Product Context
- ✅ Must have product_type
- ✅ Must have category array
- ✅ Must have key_attributes array
- ⚠️ Should have brand (uses fallback if missing)
- ⚠️ Should have product_name (uses fallback if missing)

### M2 Competitor Discovery
- ✅ Must have search_terms (array or object)
- ⚠️ Should have competitors object with lists

### M2.1 Customer Intent
- ✅ Must have themes array (min 1 theme)
- ✅ Theme names must be in VALID_THEME_NAMES (parser normalizes)
- ✅ Each theme must have importance_score
- ⚠️ Should have desires or quotes (fallback to questions)

### M2.3 USP Evaluation
- ✅ Must have usps array (min 1 USP)
- ✅ Each USP must have usp_id and point
- ✅ Must have relevance/uniqueness/impact scores
- ⚠️ Should have themes array (empty allowed)
- ⚠️ Priority should be Primary/Secondary/Tertiary (parser defaults)

### M3 Keyword Intelligence
- ✅ Must have keywords.enriched array (min 1 keyword)
- ✅ Each keyword must have keyword_text and score
- ⚠️ Should have priority_tier (parser extracts from tier_notes)
- ⚠️ Risk flag defaults to 'none' if missing

### M4 Listing Creation
- ✅ Must have title
- ✅ Must have bullets/bullet_points (min 3, max 5)
- ✅ Must have description
- ✅ Must have backend_terms/backend_search_terms

---

## Testing Your JSON

### Quick Validation Checklist

1. **Root level:**
   - [ ] Has ASIN field
   - [ ] Has all 6 module sections

2. **Product Profile:**
   - [ ] Has product_type
   - [ ] Has category array
   - [ ] Has brand and product_name

3. **Search Terms:**
   - [ ] Has search terms data
   - [ ] Has competitors object

4. **Intent Themes:**
   - [ ] All theme names are valid
   - [ ] All themes have desires/quotes

5. **USPs:**
   - [ ] All have usp_id and point
   - [ ] Priorities are Primary/Secondary/Tertiary
   - [ ] All have themes array

6. **Keywords:**
   - [ ] All have keyword_text and score
   - [ ] All have priority_tier field

7. **Content:**
   - [ ] Has title, bullets, description, backend_terms

---

## Change Log

**2026-01-22:**
- Added tier_notes and demand_tier to keyword schema
- Added theme name normalization mappings
- Added USP priority 'Custom' handling
- Documented all missing fields from sample analysis
- Added fallback field names (bullet_points, backend_search_terms)
