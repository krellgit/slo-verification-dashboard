import { VerificationResult, ModuleResult, CheckResult } from './types';

// Status for an individual ASIN's verification
export type AsinStatus = 'PASS' | 'FAIL' | 'REVIEW_NEEDED';

// Per-module statistics
export interface ModuleStats {
  [moduleId: string]: {
    name: string;
    totalRuns: number;      // how many ASINs had this module
    passCount: number;
    failCount: number;
    passRate: number;       // percentage
  };
}

// Top failure entry for error pattern analysis
export interface TopFailure {
  checkId: string;
  checkName: string;
  moduleName: string;
  failCount: number;
  failRate: number;         // percentage of ASINs that failed this
  sampleIssues: string[];   // example issue reasons (up to 3)
}

// Per-ASIN summary for list view
export interface AsinSummary {
  asin: string;
  productName: string;
  status: AsinStatus;
  passedChecks: number;
  failedChecks: number;
  totalChecks: number;
  passRate: number;
  failedModules: string[];  // module IDs that failed
}

// Aggregated stats across all verified ASINs
export interface AggregatedStats {
  totalAsins: number;
  passedAsins: number;       // All checks passed
  failedAsins: number;       // At least one check failed
  reviewAsins: number;       // Has review-needed checks but no failures

  totalChecks: number;       // sum across all ASINs
  passedChecks: number;
  failedChecks: number;
  reviewChecks: number;

  // Per-module stats
  moduleStats: ModuleStats;

  // Most common failures (for error pattern analysis)
  topFailures: TopFailure[];

  // Per-ASIN summary for the list view
  asinSummaries: AsinSummary[];
}

// Internal tracking for failure aggregation
interface FailureTracker {
  checkId: string;
  checkName: string;
  moduleName: string;
  failCount: number;
  issues: string[];
}

/**
 * Determines the overall status of an ASIN verification result
 */
function determineAsinStatus(result: VerificationResult): AsinStatus {
  // If any check failed, the ASIN status is FAIL
  if (result.summary.failed > 0) {
    return 'FAIL';
  }
  // If there are review items but no failures, status is REVIEW_NEEDED
  if (result.summary.review > 0) {
    return 'REVIEW_NEEDED';
  }
  // All checks passed
  return 'PASS';
}

/**
 * Gets modules that have failed checks for a verification result
 */
function getFailedModuleIds(modules: ModuleResult[]): string[] {
  return modules
    .filter(mod => mod.status === 'FAIL')
    .map(mod => mod.id);
}

/**
 * Extracts module statistics from verification results
 * @param results - Array of verification results
 * @returns ModuleStats object with per-module aggregated data
 */
export function getModuleStats(results: VerificationResult[]): ModuleStats {
  const moduleStats: ModuleStats = {};

  for (const result of results) {
    for (const module of result.modules) {
      if (!moduleStats[module.id]) {
        moduleStats[module.id] = {
          name: module.name,
          totalRuns: 0,
          passCount: 0,
          failCount: 0,
          passRate: 0,
        };
      }

      const stats = moduleStats[module.id];
      stats.totalRuns++;

      if (module.status === 'PASS') {
        stats.passCount++;
      } else if (module.status === 'FAIL') {
        stats.failCount++;
      }
      // BLOCKED, PENDING, REVIEW_NEEDED don't count as pass or fail
    }
  }

  // Calculate pass rates
  for (const moduleId in moduleStats) {
    const stats = moduleStats[moduleId];
    if (stats.totalRuns > 0) {
      stats.passRate = (stats.passCount / stats.totalRuns) * 100;
    }
  }

  return moduleStats;
}

/**
 * Gets the top failing checks across all verification results
 * @param results - Array of verification results
 * @param limit - Maximum number of failures to return (default: 10)
 * @returns Array of TopFailure objects sorted by fail count descending
 */
export function getTopFailures(
  results: VerificationResult[],
  limit: number = 10
): TopFailure[] {
  const totalAsins = results.length;
  if (totalAsins === 0) {
    return [];
  }

  const failureMap: Map<string, FailureTracker> = new Map();

  for (const result of results) {
    for (const module of result.modules) {
      for (const check of module.checks) {
        if (check.status === 'FAIL') {
          const key = check.id;

          if (!failureMap.has(key)) {
            failureMap.set(key, {
              checkId: check.id,
              checkName: check.name,
              moduleName: module.name,
              failCount: 0,
              issues: [],
            });
          }

          const tracker = failureMap.get(key)!;
          tracker.failCount++;

          // Collect sample issues (up to 3 unique ones)
          if (check.issue?.reason && tracker.issues.length < 3) {
            if (!tracker.issues.includes(check.issue.reason)) {
              tracker.issues.push(check.issue.reason);
            }
          }
        }
      }
    }
  }

  // Convert to array and sort by failCount descending
  const failures: TopFailure[] = Array.from(failureMap.values())
    .map(tracker => ({
      checkId: tracker.checkId,
      checkName: tracker.checkName,
      moduleName: tracker.moduleName,
      failCount: tracker.failCount,
      failRate: (tracker.failCount / totalAsins) * 100,
      sampleIssues: tracker.issues,
    }))
    .sort((a, b) => b.failCount - a.failCount);

  return failures.slice(0, limit);
}

/**
 * Generates a summary for a single ASIN verification result
 */
function generateAsinSummary(result: VerificationResult): AsinSummary {
  const status = determineAsinStatus(result);
  const failedModules = getFailedModuleIds(result.modules);
  const totalChecks = result.summary.totalChecks;
  const passedChecks = result.summary.passed;

  return {
    asin: result.product.asin,
    productName: result.product.name,
    status,
    passedChecks,
    failedChecks: result.summary.failed,
    totalChecks,
    passRate: totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0,
    failedModules,
  };
}

/**
 * Aggregates statistics across all verified ASINs in a single efficient pass
 * @param results - Array of verification results
 * @returns AggregatedStats object with comprehensive statistics
 */
export function aggregateStats(results: VerificationResult[]): AggregatedStats {
  // Initialize counters
  let totalAsins = 0;
  let passedAsins = 0;
  let failedAsins = 0;
  let reviewAsins = 0;

  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;
  let reviewChecks = 0;

  const moduleStats: ModuleStats = {};
  const failureMap: Map<string, FailureTracker> = new Map();
  const asinSummaries: AsinSummary[] = [];

  // Single pass through all results
  for (const result of results) {
    totalAsins++;

    // Aggregate check counts from summary
    totalChecks += result.summary.totalChecks;
    passedChecks += result.summary.passed;
    failedChecks += result.summary.failed;
    reviewChecks += result.summary.review;

    // Determine ASIN status and count
    const asinStatus = determineAsinStatus(result);
    switch (asinStatus) {
      case 'PASS':
        passedAsins++;
        break;
      case 'FAIL':
        failedAsins++;
        break;
      case 'REVIEW_NEEDED':
        reviewAsins++;
        break;
    }

    // Track failed modules for this ASIN
    const failedModuleIds: string[] = [];

    // Process modules
    for (const module of result.modules) {
      // Initialize module stats if needed
      if (!moduleStats[module.id]) {
        moduleStats[module.id] = {
          name: module.name,
          totalRuns: 0,
          passCount: 0,
          failCount: 0,
          passRate: 0,
        };
      }

      const stats = moduleStats[module.id];
      stats.totalRuns++;

      if (module.status === 'PASS') {
        stats.passCount++;
      } else if (module.status === 'FAIL') {
        stats.failCount++;
        failedModuleIds.push(module.id);
      }

      // Process checks for failure tracking
      for (const check of module.checks) {
        if (check.status === 'FAIL') {
          const key = check.id;

          if (!failureMap.has(key)) {
            failureMap.set(key, {
              checkId: check.id,
              checkName: check.name,
              moduleName: module.name,
              failCount: 0,
              issues: [],
            });
          }

          const tracker = failureMap.get(key)!;
          tracker.failCount++;

          // Collect sample issues (up to 3 unique ones)
          if (check.issue?.reason && tracker.issues.length < 3) {
            if (!tracker.issues.includes(check.issue.reason)) {
              tracker.issues.push(check.issue.reason);
            }
          }
        }
      }
    }

    // Generate ASIN summary
    asinSummaries.push({
      asin: result.product.asin,
      productName: result.product.name,
      status: asinStatus,
      passedChecks: result.summary.passed,
      failedChecks: result.summary.failed,
      totalChecks: result.summary.totalChecks,
      passRate: result.summary.totalChecks > 0
        ? (result.summary.passed / result.summary.totalChecks) * 100
        : 0,
      failedModules: failedModuleIds,
    });
  }

  // Calculate module pass rates
  for (const moduleId in moduleStats) {
    const stats = moduleStats[moduleId];
    if (stats.totalRuns > 0) {
      stats.passRate = (stats.passCount / stats.totalRuns) * 100;
    }
  }

  // Convert failure map to sorted top failures array (limit to 10)
  const topFailures: TopFailure[] = Array.from(failureMap.values())
    .map(tracker => ({
      checkId: tracker.checkId,
      checkName: tracker.checkName,
      moduleName: tracker.moduleName,
      failCount: tracker.failCount,
      failRate: totalAsins > 0 ? (tracker.failCount / totalAsins) * 100 : 0,
      sampleIssues: tracker.issues,
    }))
    .sort((a, b) => b.failCount - a.failCount)
    .slice(0, 10);

  return {
    totalAsins,
    passedAsins,
    failedAsins,
    reviewAsins,
    totalChecks,
    passedChecks,
    failedChecks,
    reviewChecks,
    moduleStats,
    topFailures,
    asinSummaries,
  };
}

/**
 * Calculates the overall pass rate across all checks
 * @param stats - Aggregated stats object
 * @returns Pass rate as a percentage (0-100)
 */
export function getOverallPassRate(stats: AggregatedStats): number {
  if (stats.totalChecks === 0) {
    return 0;
  }
  return (stats.passedChecks / stats.totalChecks) * 100;
}

/**
 * Calculates the ASIN success rate (ASINs with all checks passing)
 * @param stats - Aggregated stats object
 * @returns Success rate as a percentage (0-100)
 */
export function getAsinSuccessRate(stats: AggregatedStats): number {
  if (stats.totalAsins === 0) {
    return 0;
  }
  return (stats.passedAsins / stats.totalAsins) * 100;
}

/**
 * Gets modules sorted by pass rate (ascending - worst first)
 * @param moduleStats - Module stats object
 * @returns Array of module entries sorted by pass rate
 */
export function getModulesByPerformance(
  moduleStats: ModuleStats
): Array<{ moduleId: string } & ModuleStats[string]> {
  return Object.entries(moduleStats)
    .map(([moduleId, stats]) => ({
      moduleId,
      ...stats,
    }))
    .sort((a, b) => a.passRate - b.passRate);
}

/**
 * Filters ASIN summaries by status
 * @param summaries - Array of ASIN summaries
 * @param status - Status to filter by
 * @returns Filtered array of ASIN summaries
 */
export function filterAsinsByStatus(
  summaries: AsinSummary[],
  status: AsinStatus
): AsinSummary[] {
  return summaries.filter(summary => summary.status === status);
}

/**
 * Gets ASINs that failed a specific module
 * @param summaries - Array of ASIN summaries
 * @param moduleId - Module ID to check
 * @returns Array of ASIN summaries that failed the specified module
 */
export function getAsinsFailingModule(
  summaries: AsinSummary[],
  moduleId: string
): AsinSummary[] {
  return summaries.filter(summary =>
    summary.failedModules.includes(moduleId)
  );
}
