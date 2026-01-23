# JIRA TICKET: SLO JSON Output Data Quality Fixes

**Project:** SLO Verification Dashboard
**Ticket Type:** Bug
**Priority:** High
**Assignee:** Yehor
**Reporter:** Krell
**Created:** 2026-01-22

---

## Summary

Fix JSON output format inconsistencies causing 13 verification check failures in SLO Verification Dashboard

---

## Description

The SLO Verification Dashboard is receiving JSON files from S3 that have structural inconsistencies causing verification failures. Analysis of 5 sample files revealed 13 distinct error types across all verification modules (M1-M4).

**Current Impact:**
- M2 module completely blocked (no competitor ASINs)
- M2.1 errors: Theme count, invalid names, quote issues
- M2.3 errors: Proof points, score formula, banned terms
- M3 errors: Insufficient primary keywords
- M4 errors: ALL CAPS words, missing quality score

**Dashboard:** https://slovd.krell.works

**Reference Doc:** See DATA_GENERATION_FIXES.docx for complete details

---

## Root Cause

JSON output generation uses different field names/structures than dashboard verification expects:

1. Missing competitors field entirely (expected: root-level object with ASIN lists)
2. Keywords use tier_notes (string) instead of priority_tier (enum)
3. Themes use invalid names (USAGE, VALUE, etc.)
4. Missing quality_score in Content
5. ALL CAPS words in listing content
6. USP score formula doesn't match required calculation

---

## Tasks

### Priority 1 (Critical - Blocks M2 Module)

**1.1** Add `competitors` field to JSON root level with structure:
```json
"competitors": {
  "raw_list": [{"asin": "B001..."}, ...],     // 40-50 items
  "trimmed_list": [{"asin": "B001...", "relevance_score": 0.85}, ...],  // 15-20 items
  "final_list": [{"asin": "B001...", "relevance_score": 0.90}, ...]     // 5-10 items
}
```

**Fixes:** M2-02, M2-04, M2-06
**Location:** Root level (alongside Product Profile, Keywords, etc.)
**Note:** Keywords.competitors exists but contains keyword data, not ASIN lists

---

### Priority 2 (High - Quality Gates)

**2.1** Ensure ≥5 keywords have tier_notes text containing "primary"
- **Fixes:** M3-01
- **Location:** Keywords.enriched[].tier_notes
- **Patterns:** Include text like "primary", "tier 1", "high priority", "core keyword"

**2.2** Add quality_score field to Content
- **Fixes:** M4-10
- **Location:** Content.quality_score
- **Requirement:** Number ≥ 80
- **Recommended:** 85-95 range

**2.3** Remove ALL CAPS words from listing content
- **Fixes:** M4-09
- **Location:** Content.title, Content.bullet_points[], Content.description
- **Remove:** FAST → Fast, PREMIUM → Premium, ALL → All, BEST → Best
- **Keep:** USB, LED, LCD, FDA, BPA, UV, AC, DC, HD, USA, UK (allowed abbreviations)

---

### Priority 3 (Moderate - Formula & Content Quality)

**3.1** Fix USP total_score formula
- **Fixes:** M2.3-04
- **Location:** USPs[].total_usp_score
- **Formula:** `(0.45 × customer_relevance_score) + (0.25 × competitive_uniqueness_score) + (0.30 × market_impact_potential)`
- **Tolerance:** ±2 points

**3.2** Remove banned terms from USP statements
- **Fixes:** M2.3-05
- **Location:** USPs[].point
- **Remove:** "best", "#1", "guaranteed", "miracle", "revolutionary", "cure", etc.
- **Replacements:** "best" → "effective", "#1" → "popular", "guaranteed" → "reliable"
- **Full list:** See DEFAULT_BANNED_TERMS in dashboard code or reference doc

**3.3** Match USP proof_points to truth_set
- **Fixes:** M2.3-03
- **Location:** USPs[].proof_points[]
- **Requirement:** Each proof point string must EXACTLY match a string in Product Profile.features[] or key_attributes[]
- **Solution:** Copy proof points directly from features array

**3.4** Add source_reviews for quote traceability
- **Fixes:** M2.1-06
- **Location:** Add to intent_themes_processed[] or separate field
- **Requirement:** Array of original customer review texts
- **Validation:** Each quote/desire must appear as substring in at least one review

---

## Acceptance Criteria

1. ✅ All 5 sample files pass M2 checks (competitors field present with correct counts)
2. ✅ M3-01 passes (≥5 keywords marked as Primary)
3. ✅ M4-09 passes (no ALL CAPS words except allowed abbreviations)
4. ✅ M4-10 passes (quality_score ≥ 80)
5. ✅ M2.3-04 passes (score formula within ±2 tolerance)
6. ✅ M2.3-05 passes (no banned terms in USP statements)
7. ✅ M2.3-03 passes (all proof points match truth set)
8. ✅ M2.1-06 passes (quotes traceable to sources)
9. ✅ Upload test files to dashboard at https://slovd.krell.works
10. ✅ Verify pass rate improves from current ~30% to >70%

---

## Testing Instructions

**1. Generate updated JSON files**
   - Apply all fixes to data generation pipeline
   - Generate new test files for all 5 ASINs

**2. Validate structure**
   ```bash
   # Check competitors field exists
   jq '.competitors | keys' updated_file.json
   # Should show: ["raw_list", "trimmed_list", "final_list"]

   # Check competitor counts
   jq '.competitors.raw_list | length' updated_file.json  # Should be 40-50
   jq '.competitors.trimmed_list | length' updated_file.json  # Should be 15-20
   jq '.competitors.final_list | length' updated_file.json  # Should be 5-10

   # Check primary keywords
   jq '[.Keywords.enriched[] | select(.tier_notes | contains("primary"))] | length' updated_file.json
   # Should be ≥5
   ```

**3. Upload to dashboard**
   - Go to https://slovd.krell.works/admin
   - Configure S3/GitHub connection
   - Upload updated files
   - Check verification results

**4. Verify fixes**
   - All M2 checks should PASS
   - M3-01 should PASS
   - M4-09, M4-10 should PASS
   - M2.3-03, M2.3-04, M2.3-05 should PASS
   - M2.1-06 should PASS
   - Overall pass rate should increase significantly

---

## Reference Files

**Documentation:**
- `/docs/DATA_GENERATION_FIXES.docx` - Complete fix guide
- `/docs/output-errors.md` - Prioritized error list
- `/docs/s3-json-schema.md` - Expected JSON structure
- `/docs/parser-improvements.md` - Parser workarounds already implemented

**Sample Files (Current Issues):**
- `/Output samples/B0006SW71G_Alice@keplercommerce.com_Test40_20260121_093330.json`
- `/Output samples/B0007P5G8Y_hauleeyang@keplercommerce.com_Test11_20260121_031347.json`
- `/Output samples/B000HQIX2O_hauleeyang@keplercommerce.com_Test12a_20260121_084119.json`
- `/Output samples/B000I09B3Y_Alice@keplercommerce.com_Test41_20260122_091659.json`
- `/Output samples/B002VWK3X4_hauleeyang@keplercommerce.com_Test30_20260121_071942.json`

**Dashboard Repo:** https://github.com/krellgit/slo-verification-dashboard

---

## Notes

**Parser Workarounds Implemented:**
- ✅ Theme name normalization (USAGE→EASE_OF_USE, VALUE→VALUE_FOR_MONEY, etc.)
- ✅ Keyword tier extraction from tier_notes
- ✅ USP priority 'Custom' mapped to 'Secondary'
- ✅ Themes trimmed to top 10 by importance_score
- ✅ Quotes limited to max 10 per theme

**Still Requires Output Fixes:**
- ❌ Competitors field (cannot be extracted, doesn't exist)
- ❌ quality_score (missing from Content)
- ❌ ALL CAPS words (need text transformation at generation)
- ❌ Score formula (needs recalculation)
- ❌ Banned terms (need filtering at generation)
- ❌ Proof points matching (need exact string copy)
- ❌ source_reviews (need to include review sources)

**Timeline:**
- Parser fixes already deployed (dashboard updated 2026-01-22)
- Data generation fixes needed for full compliance
- Historical tracking active (will show improvement trends once fixes deployed)

---

## Labels

`data-quality` `slo-verification` `json-structure` `P2-high` `backend`

---

## Story Points

**Estimate:** 8 points

**Breakdown:**
- Competitors field implementation: 3 points
- Quality score addition: 1 point
- ALL CAPS removal: 1 point
- Formula fixes: 1 point
- Banned term filtering: 1 point
- Testing & validation: 1 point
