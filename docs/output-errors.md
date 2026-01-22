# Output Errors - Data Generation Issues

This document lists structural and data quality issues found in S3 JSON output that require fixes in the data generation pipeline.

**Last Updated:** 2026-01-22
**Samples Analyzed:** 5 files from Output Samples folder

---

## Priority 1: Critical - Blocks Verification

### 1.1 Missing Competitors Field

**Status:** ❌ CRITICAL
**Affects:** M2 (Competitor Discovery Module)
**Files:** ALL 5 samples (100%)

**Problem:**
The `competitors` field is completely missing from all JSON outputs.

**Expected Structure:**
```json
{
  "competitors": {
    "raw_list": [
      {"asin": "B001234567", "title": "Competitor Product 1"},
      {"asin": "B007654321", "title": "Competitor Product 2"}
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

**Impact:**
- M2 CompetitorDiscoveryInput incomplete (only has search_terms)
- Cannot verify competitor analysis quality
- M2 verification checks will fail or show incomplete data

**Fix Required:**
Add competitors data structure to JSON output with all three lists populated.

---

### 1.2 Invalid Theme Names

**Status:** ❌ CRITICAL
**Affects:** M2.1 (Customer Intent Module)
**Files:** ALL 5 samples (100%)

**Problem:**
Intent themes use names NOT in the controlled vocabulary (VALID_THEME_NAMES).

**Invalid Theme Names Found:**
- `USAGE` - Found in 4/5 files → Should be `EASE_OF_USE`
- `VALUE` - Found in 2/5 files → Should be `VALUE_FOR_MONEY`
- `COMPATIBILITY` - Found in 2/5 files → Should be `VERSATILITY`
- `APPEARANCE` - Found in 2/5 files → Should be `DESIGN`
- `MAINTENANCE` - Found in 3/5 files → Should be `EASE_OF_CLEANING`
- `SENSITIVITY` - Found in 1/5 files → Should be `QUALITY`

**Valid Theme Names (Complete List):**
```
EASE_OF_USE, EASE_OF_CLEANING, DURABILITY, VALUE_FOR_MONEY,
PERFORMANCE, COOKING_PERFORMANCE, DESIGN, SIZE, CAPACITY,
NOISE_LEVEL, SAFETY, VERSATILITY, QUALITY, TEXTURE,
HYDRATION, RESULTS, SMELL, PACKAGING, SHIPPING,
CUSTOMER_SERVICE, WARRANTY, INGREDIENTS, EFFECTIVENESS
```

**Impact:**
- Dashboard M2.1 verification rejects invalid theme names
- Theme-based validation checks fail
- Inconsistent theme categorization across products

**Fix Required:**
Update theme generation to use only names from VALID_THEME_NAMES.

**Temporary Workaround:**
Parser now includes normalizeThemeName() function to map invalid names to valid ones.

---

## Priority 2: High - Reduces Accuracy

### 2.1 Missing Brand and Product Name in Product Profile

**Status:** ⚠️ HIGH
**Affects:** M1 (Product Context Module)
**Files:** ALL 5 samples (100%)

**Problem:**
Product Profile object is missing `brand` and `product_name` fields.

**Expected:**
```json
{
  "Product Profile": {
    "brand": "Advil",
    "product_name": "Advil Pain Medication Ibuprofen 200mg Tablets",
    "product_type": "MEDICATION",
    "category": ["Health & Household", "..."]
  }
}
```

**Actual:**
```json
{
  "Product Profile": {
    "product_type": "MEDICATION",
    "category": ["Health & Household", "..."]
    // brand and product_name MISSING
  }
}
```

**Current Fallback:**
Parser extracts from `Data from Amazon.attributes.brand[0].value` and `item_name[0].value`.

**Why This Matters:**
- Product Profile should be self-contained
- Fallback relies on separate data structure
- Extra parsing complexity
- Fragile if Data from Amazon structure changes

**Fix Required:**
Include brand and product_name directly in Product Profile during generation.

---

### 2.2 Keywords Missing Tier Field

**Status:** ⚠️ HIGH
**Affects:** M3 (Keyword Intelligence Module)
**Files:** ALL 5 samples (100%)

**Problem:**
Keywords have `tier_notes` (string description) instead of `priority_tier` or `tier` (enum).

**Expected:**
```json
{
  "keyword_text": "ibuprofen",
  "priority_tier": "Primary",
  "keyword_strength_score": 95
}
```

**Actual:**
```json
{
  "keyword_text": "ibuprofen",
  "tier_notes": "Primary search term with high demand",
  "demand_tier": {...}
}
```

**Impact:**
- All keywords had `tier: undefined` before parser fix
- Cannot properly categorize Primary/Secondary/Long-tail keywords
- M3 verification depends on tier classification

**Fix Required:**
Add `priority_tier` field with enum value: "Primary", "Secondary", "Long-tail", or "Excluded".

**Temporary Workaround:**
Parser now extracts tier from tier_notes text using pattern matching.

---

### 2.3 USP Priority 'Custom' Value

**Status:** ⚠️ MODERATE
**Affects:** M2.3 (USP Evaluation Module)
**Files:** B002VWK3X4 (1/5 files)

**Problem:**
Some USPs use `priority_type: 'Custom'` which is not a valid enum value.

**Valid Priority Values:**
- `Primary` or `primary` or `1` or `high`
- `Secondary` or `secondary` or `2` or `medium`
- `Tertiary` or `tertiary` or `3` or `low`

**Impact:**
- USP priority becomes undefined (before parser fix)
- Loses prioritization information

**Fix Required:**
Use only Primary, Secondary, or Tertiary for priority_type.

**Temporary Workaround:**
Parser now maps 'Custom' → 'Secondary' and defaults unrecognized values to 'Secondary'.

---

### 2.4 Empty USP Themes Arrays

**Status:** ⚠️ MODERATE
**Affects:** M2.3 (USP Evaluation Module)
**Files:** B002VWK3X4 (1/5 files, specific USPs)

**Problem:**
Some USPs have empty or missing `themes` arrays.

**Expected:**
```json
{
  "usp_id": 1,
  "point": "Fast pain relief in 20 minutes",
  "themes": ["RESULTS", "EFFECTIVENESS"],
  "customer_relevance_score": 85
}
```

**Actual:**
```json
{
  "usp_id": 1,
  "point": "...",
  "themes": [],  // EMPTY
  "customer_relevance_score": 85
}
```

**Impact:**
- Loses USP-to-theme categorization
- Cannot verify USP alignment with customer intent themes

**Fix Required:**
Populate themes array for all USPs during generation.

---

## Priority 3: Low - Has Workarounds

### 3.1 Missing Features Field in Product Profile

**Status:** ✅ LOW (Has Fallback)
**Affects:** M1 (Product Context Module)
**Files:** ALL 5 samples (100%)

**Problem:**
Product Profile missing `features` array.

**Parser Fallback:**
Uses `key_attributes` as features.

**Impact:**
- May result in duplicate data (key_attributes extracted separately)
- truth_set.features = key_attributes

**Fix Recommended:**
Add separate `features` array distinct from `key_attributes`.

**Workaround Status:**
✅ Parser handles this automatically - no dashboard errors.

---

### 3.2 Content Field Name Variations

**Status:** ✅ LOW (Has Fallback)
**Affects:** M4 (Listing Creation Module)
**Files:** ALL 5 samples (100%)

**Problem:**
Content object uses different field names:
- `bullet_points` instead of `bullets`
- `backend_search_terms` instead of `backend_terms`

**Parser Fallback:**
Lines 612-627 handle both field name variations.

**Impact:**
None - parser extracts correctly via fallbacks.

**Fix Recommended:**
Standardize to use `bullets` and `backend_terms` for consistency.

**Workaround Status:**
✅ Parser handles this automatically - no dashboard errors.

---

## Summary Statistics

**Total Errors Found:** 10 distinct error types
**Critical Errors:** 2 (Competitors, Theme Names)
**High Priority:** 3 (Brand/Name, Keyword Tiers, USP Priority)
**Moderate Priority:** 1 (Empty USP Themes)
**Low Priority (Has Fallbacks):** 2 (Features, Field Names)

**Files Requiring Fixes:** 5/5 (100%)

**Parser Workarounds Implemented:** 7/10 errors

**Remaining Output Errors:** 3 (Competitors, Theme Names, Brand/Product Name in Profile)

---

## Recommended Actions for Data Team

### Immediate (Critical)

1. **Add competitors field** to all outputs with proper structure
2. **Fix theme name generation** to use only VALID_THEME_NAMES

### High Priority

3. **Add brand and product_name** to Product Profile section
4. **Add priority_tier enum field** to keywords (Primary/Secondary/Long-tail/Excluded)
5. **Restrict USP priority_type** to Primary/Secondary/Tertiary only

### Nice to Have

6. Populate USP themes arrays
7. Add separate features field to Product Profile
8. Standardize Content field names (bullets, backend_terms)

---

## Testing Recommendations

After fixing output errors:

1. Generate new JSON with fixes
2. Test with parser to verify all fields extracted correctly
3. Upload to dashboard and verify:
   - All modules show correct status
   - No verification errors
   - Stats aggregate properly
4. Compare before/after verification results
