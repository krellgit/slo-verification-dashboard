# SLOVD Future Improvements & Proposed Buildouts

## Pending Data Requirements (Blocked by SLO Pipeline)

### 1. M2.1-06: Quote Traceability Validation

**Current Status:** Check exists but always returns REVIEW (no data to validate)

**Required Field:** `source_reviews` array in M2.1 output

**What needs to happen:**
1. Update SLO pipeline M2.1 module to include `source_reviews` field
2. Add to "Listing Optimization Modules.md" Section 3 (Intent Packaging and Output):
   ```
   7. Source Reviews (for Verification)
      - Array of full review texts used during analysis
      - Enables quote traceability validation
      - Prevents fabricated quotes from AI
   ```
3. Output format:
   ```json
   {
     "m2_1": {
       "themes": [...],
       "source_reviews": [
         "Full text of review 1...",
         "Full text of review 2..."
       ]
     }
   }
   ```

**Impact:** Prevents AI from fabricating customer quotes, ensures all quotes are authentic

**Priority:** Medium - Quality assurance feature, not blocking deployment

---

### 2. M2.3-03: USP Proof Point Validation

**Current Status:** Check exists but returns REVIEW when truth_set_facts missing

**Required Fields:**
- `proof_points` array in each USP
- `truth_set_facts` array in M2.3 output

**What needs to happen:**
1. Update M2.3 (USP Evaluation) module specification to require proof_points
2. Each USP must document which Product Truth Set features support its claims
3. Output format:
   ```json
   {
     "usps": [
       {
         "statement": "Clinically tested formula",
         "proof_points": ["Clinical study reference", "Dermatologist tested"]
       }
     ],
     "truth_set_facts": [
       "Clinical study reference",
       "Dermatologist tested",
       "FDA approved ingredients"
     ]
   }
   ```

**Impact:** Prevents unverifiable USP claims, ensures compliance-safe marketing

**Priority:** High - Compliance risk if USPs aren't backed by evidence

---

## Dashboard Feature Enhancements

### 3. Per-Module Historical Trends

**Proposed:** Individual trend charts for each module (M1, M2, M2.1, M2.3, M3, M4)

**Why:**
- See which modules improved vs degraded over time
- Identify problem modules faster
- Better root cause analysis

**Implementation:**
- Expand TrendsChart component to accept module filter
- Update history API to return per-module time series
- Add module selector dropdown above trends section

**Priority:** Low - Nice to have, not critical

---

### 4. Historical Data Archive Export

**Proposed:** Export 90-day historical snapshot to CSV/JSON

**Why:**
- Backup before Redis expiration
- Long-term trend analysis in Excel
- Share with stakeholders

**Implementation:**
- New endpoint: `/api/export/history?days=90&format=csv`
- Include all daily stats, module breakdowns, top failures
- Date-stamped filename

**Priority:** Low - Can manually query Redis if needed

---

### 5. Admin Panel: Custom Acronym Whitelist

**Proposed:** Allow clients to add custom allowed acronyms via admin panel

**Why:**
- Different products have different legitimate acronyms
- Client-specific brands (e.g., "MGO" for Manuka honey)
- Industry-specific terms not in default list

**Implementation:**
- Admin UI for adding/removing acronyms
- Store in Redis or config file
- Merge with ALLOWED_ACRONYMS at runtime

**Priority:** Medium - Reduces false positives for niche products

---

### 6. Automated Daily Recording (Server-Side Cron)

**Proposed:** Scheduled function that records historical data daily, independent of user visits

**Why:**
- Current recording is reactive (only when users visit)
- If nobody visits for 3 days, lose 3 data points
- Proactive recording ensures complete historical timeline

**Implementation:**
- Vercel Cron job at midnight UTC
- Fetches reports, verifies, records to Redis
- If AWS fails, carries forward previous day automatically

**Priority:** Medium - Improves historical data reliability

---

### 7. Real-Time Verification Status Indicator

**Proposed:** Show verification status on dashboard while checks are running

**Why:**
- Large ASIN sets take time to verify
- Users don't know if system is processing or stuck
- Better UX with progress feedback

**Implementation:**
- WebSocket or SSE for real-time updates
- Progress bar: "Verifying ASIN 5/20..."
- Estimated time remaining

**Priority:** Low - Only matters for 20+ ASINs

---

### 8. Alert System for Carried-Forward Data

**Proposed:** Email/Slack notification when data is carried forward for 3+ consecutive days

**Why:**
- Indicates persistent AWS/S3 issues
- Data becomes stale after multiple carry-forwards
- Alerts team to investigate pipeline problems

**Implementation:**
- Check carriedForward flag in recording endpoint
- Count consecutive carry-forward days
- Trigger alert at threshold (e.g., 3 days)

**Priority:** Medium - Operational monitoring feature

---

## Technical Debt

### 9. Replace Hardcoded Site Password

**Current:** Password "FPAI" hardcoded in src/app/api/site/auth/route.ts

**Should be:** Environment variable `SLOVD_SITE_PASSWORD`

**Priority:** Medium - Security best practice

---

### 10. Migrate from `middleware.ts` to `proxy.ts`

**Current:** Using deprecated `middleware.ts` (Next.js warning)

**Should be:** Update to `proxy.ts` per Next.js 16 conventions

**Priority:** Low - Still works, just deprecated

---

## Verification Check Enhancements

### 11. M4-09: Context-Aware Acronym Detection

**Proposed:** Only flag ALL CAPS if it appears promotional (e.g., "BEST LED LIGHT")

**Current:** Flags any non-whitelisted 3+ letter uppercase word

**Why:**
- "NEW USB Port" (promotional use of NEW) should fail
- "USB Port" (technical term) should pass
- Context matters more than the word itself

**Implementation:**
- Check surrounding words for promotional language
- Flag if ALL CAPS word is near banned terms
- More nuanced than simple whitelist

**Priority:** Low - Current approach is good enough

---

## Documentation

### 12. Add Developer Guide

**Proposed:** Document how to add new verification checks

**Contents:**
- Check function structure
- How to update modules.ts
- Testing new checks
- Deploying check updates

**Priority:** Low - Team of one currently

---

## Notes

- Items 1-2 are blocked by SLO pipeline updates
- Items 3-12 can be implemented anytime in SLOVD
- Prioritize based on user needs and pain points
