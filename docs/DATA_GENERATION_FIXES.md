# SLO Verification Dashboard - Data Generation Fix Guide

**Document Version:** 1.0
**Date:** January 22, 2026
**Purpose:** Quick reference for fixing JSON output errors causing dashboard verification failures

---

## PRIORITY 1: CRITICAL FIXES

### 1. Add Competitors Field with ASIN Lists

**Location to Fix:** Root level of JSON output
**Current Status:** ❌ Field missing (causes M2-02, M2-04, M2-06 failures)

**What's Missing:**
```json
"competitors": {
  "raw_list": [{"asin": "B001234567"}, {"asin": "B007654321"}, ...],
  "trimmed_list": [{"asin": "B001234567", "relevance_score": 0.92}, ...],
  "final_list": [{"asin": "B001234567", "relevance_score": 0.95}, ...]
}
```

**Requirements:**
- `raw_list`: 40-50 competitor product ASINs
- `trimmed_list`: 15-20 filtered competitors with relevance scores (0-1)
- `final_list`: 5-10 top competitors with relevance scores (0-1)

**Verification Checks:**
- M2-02 checks: `40 <= raw_list.length <= 50`
- M2-04 checks: `15 <= trimmed_list.length <= 20`
- M2-06 checks: `5 <= final_list.length <= 10`

**Code Reference:** `src/lib/checks/m1m2Checks.ts:196-305`

---

## PRIORITY 2: HIGH IMPACT FIXES

### 2.1 Ensure ≥5 Primary Keywords

**Location to Fix:** `Keywords.enriched[].tier_notes` field
**Current Status:** ⚠️ May have <5 keywords marked as Primary (causes M3-01 failure)

**Requirement:**
- Minimum 5 keywords must have tier_notes containing text like:
  - "primary"
  - "tier 1" or "tier-1"
  - "high priority"
  - "core keyword"
  - "main keyword"
  - "essential"

**Example:**
```json
{
  "keyword_text": "ibuprofen",
  "tier_notes": "Primary search term with high demand",
  "keyword_strength_score": 95
}
```

**Verification Check:** M3-01 requires `keywords.filter(k => k.tier === 'Primary').length >= 5`
**Code Reference:** `src/lib/checks/m3m4Checks.ts:17-44`

**Parser Note:** Parser extracts tier from tier_notes text using pattern matching

---

### 2.2 Add Quality Score to Content

**Location to Fix:** `Content.quality_score` field
**Current Status:** ❌ Missing (causes M4-10 failure)

**Requirement:**
```json
"Content": {
  "title": "...",
  "bullet_points": [...],
  "description": "...",
  "backend_search_terms": "...",
  "quality_score": 85
}
```

**Rules:**
- Type: Number (integer or decimal)
- Minimum value: 80
- Recommended: 85-95 for high-quality listings

**Verification Check:** M4-10 requires `quality_score >= 80`
**Code Reference:** `src/lib/checks/m3m4Checks.ts:691-726`

---

### 2.3 Remove ALL CAPS Words from Listing Content

**Location to Fix:** `Content.title`, `Content.bullet_points[]`, `Content.description`
**Current Status:** ⚠️ Contains ALL CAPS words (causes M4-09 failure)

**Problem Words:** ANY word with 3+ consecutive uppercase letters
**Examples to FIX:**
- FAST → Fast
- PREMIUM → Premium
- ALL → All
- BEST → Best
- NEW → New

**Allowed Abbreviations (Keep as-is):**
USB, LED, LCD, FDA, BPA, UV, AC, DC, HD, USA, UK

**Verification Check:** M4-09 scans for `/\b[A-Z]{3,}\b/` pattern
**Code Reference:** `src/lib/checks/m3m4Checks.ts:647-686`

**Fix:** Use Title Case or sentence case throughout listing content

---

## PRIORITY 3: MODERATE IMPACT FIXES

### 3.1 Fix USP Total Score Formula

**Location to Fix:** `USPs[].total_usp_score` field
**Current Status:** ⚠️ Doesn't match formula (causes M2.3-04 failure)

**Required Formula:**
```
total_usp_score = (0.45 × customer_relevance_score) +
                  (0.25 × competitive_uniqueness_score) +
                  (0.30 × market_impact_potential)
```

**Tolerance:** ±2 points

**Example:**
```json
{
  "customer_relevance_score": 88,
  "competitive_uniqueness_score": 72,
  "market_impact_potential": 85,
  "total_usp_score": 82
}
```

**Calculation:** (0.45 × 88) + (0.25 × 72) + (0.30 × 85) = 39.6 + 18 + 25.5 = 83.1 ✓ (within ±2 of 82)

**Verification Check:** M2.3-04 validates `|calculated - total_usp_score| <= 2`
**Code Reference:** `src/lib/checks/m21m23Checks.ts:277-315`

---

### 3.2 Remove Banned Terms from USP Statements

**Location to Fix:** `USPs[].point` field
**Current Status:** ⚠️ Contains banned terms (causes M2.3-05 failure)

**Banned Terms (Partial List):**
- best, #1, number 1, number one
- guaranteed, guarantee
- miracle, miraculous
- revolutionary, breakthrough
- ultimate, perfect, flawless
- cure, cures, treat, treats
- FDA approved, clinically proven (unless actually certified)

**Full List Location:** `src/lib/inputTypes.ts` (DEFAULT_BANNED_TERMS constant)

**Verification Check:** M2.3-05 scans USP statement for any banned term
**Code Reference:** `src/lib/checks/m21m23Checks.ts:317-346`

**Fix:** Replace or remove banned terms:
- "best pain relief" → "effective pain relief"
- "#1 choice" → "popular choice"
- "guaranteed results" → "reliable results"

---

### 3.3 Match Proof Points to Truth Set Facts

**Location to Fix:** `USPs[].proof_points[]` field
**Current Status:** ⚠️ Strings don't match truth_set (causes M2.3-03 failure)

**Requirement:** Every string in proof_points must EXACTLY match a string in truth_set_facts

**Example:**
```json
"Product Profile": {
  "features": [
    "Fast relief from headaches",
    "200mg ibuprofen per tablet",
    "Easy to swallow coating"
  ]
},
"USPs": [{
  "proof_points": [
    "200mg ibuprofen per tablet",
    "Easy to swallow coating"
  ]
}]
```

**Verification Check:** M2.3-03 validates all proof_points exist in truth_set_facts (exact string match)
**Code Reference:** `src/lib/checks/m21m23Checks.ts:243-275`

**Parser Mapping:** truth_set_facts comes from Product Profile.features or key_attributes

**Fix:** Copy proof_point strings directly from features/key_attributes

---

### 3.4 Add Source Reviews for Quote Traceability

**Location to Fix:** M2.1 section (new field)
**Current Status:** ❌ Missing (causes M2.1-06 failure)

**Requirement:** Add source_reviews array containing original customer review text

**Structure:**
```json
"intent_themes_processed": [{
  "name": "RESULTS",
  "desires": ["Fast pain relief", "Long-lasting effectiveness"],
  "source_reviews": [
    "This product provides fast pain relief within 20 minutes",
    "I love the long-lasting effectiveness of this medication"
  ]
}]
```

**Verification Check:** M2.1-06 validates each quote/desire appears as substring in at least one source_review
**Code Reference:** `src/lib/checks/m21m23Checks.ts:131-165`

**Fix:** Include source_reviews array at theme level or M2.1 input level

---

## QUICK REFERENCE TABLE

| Priority | Error ID | Issue | Location | Requirement | Code Ref |
|----------|----------|-------|----------|-------------|----------|
| P1 | M2-02 | No raw competitor list | Root `competitors.raw_list` | 40-50 ASINs | m1m2Checks:196 |
| P1 | M2-04 | No trimmed list | Root `competitors.trimmed_list` | 15-20 ASINs | m1m2Checks:240 |
| P1 | M2-06 | No final list | Root `competitors.final_list` | 5-10 ASINs | m1m2Checks:286 |
| P2 | M3-01 | Few primary keywords | `Keywords.enriched[].tier_notes` | ≥5 with "primary" | m3m4Checks:17 |
| P2 | M4-10 | No quality score | `Content.quality_score` | ≥80 | m3m4Checks:691 |
| P2 | M4-09 | ALL CAPS words | Content fields | No 3+ caps | m3m4Checks:647 |
| P3 | M2.3-04 | Score formula | `USPs[].total_usp_score` | 0.45CR+0.25CU+0.30MI | m21m23Checks:277 |
| P3 | M2.3-05 | Banned terms | `USPs[].point` | Remove banned | m21m23Checks:317 |
| P3 | M2.3-03 | Proof points | `USPs[].proof_points` | Match features | m21m23Checks:243 |
| P3 | M2.1-06 | Quote sources | M2.1 `source_reviews` | Add reviews | m21m23Checks:131 |

---

## FILES ALREADY FIXED

✅ **Parser handles these automatically (no JSON changes needed):**
- M2.1-03: Invalid theme names (normalized)
- M2.1-01: Too many themes (trimmed to 10)
- M2.1-05: Too many quotes (limited to 10)
- Theme structure (desires/questions mapped to quotes)
- Field name variations (bullet_points, backend_search_terms)
- USP priority 'Custom' (mapped to Secondary)
- Keyword tiers (extracted from tier_notes)

---

## TESTING CHECKLIST

After implementing fixes, verify:

**M2 Competitor Discovery:**
- [ ] competitors field exists at root level
- [ ] raw_list has 40-50 items with asin field
- [ ] trimmed_list has 15-20 items with asin and relevance_score
- [ ] final_list has 5-10 items with asin and relevance_score

**M2.1 Customer Intent:**
- [ ] 5-10 themes generated (parser trims if >10)
- [ ] All theme names from VALID_THEME_NAMES list
- [ ] Each theme has 3-10 desires/quotes
- [ ] source_reviews array present

**M2.3 USP Evaluation:**
- [ ] total_usp_score matches formula (±2)
- [ ] No banned terms in point/statement
- [ ] proof_points match features exactly

**M3 Keyword Intelligence:**
- [ ] At least 5 keywords have tier_notes with "primary"

**M4 Listing Creation:**
- [ ] quality_score field present with value ≥80
- [ ] No ALL CAPS words (except USB, LED, LCD, FDA, BPA, UV, AC, DC, HD, USA, UK)
- [ ] Use Title Case or sentence case

---

## CONTACT & SUPPORT

**Parser Source:** `/src/lib/reportParser.ts`
**Check Implementations:** `/src/lib/checks/`
**Documentation:** `/docs/` folder
**Test Script:** `/scripts/test-parser.js`

**Dashboard URL:** https://slovd.krell.works

For questions about specific validation logic, refer to the code references provided for each error.
