import { CheckResult, ModuleResult, VerificationResult, ModuleStatus, ModuleDefinition } from './types';
import { VerificationInput, DEFAULT_BANNED_TERMS } from './inputTypes';
import { verifyM1, verifyM2 } from './checks/m1m2Checks';
import { verifyM21, verifyM23 } from './checks/m21m23Checks';
import { verifyM3, verifyM4 } from './checks/m3m4Checks';
import { MODULE_DEFINITIONS, getModuleById } from './modules';

/**
 * Calculate the overall status of a module based on its check results
 */
function calculateModuleStatus(checks: CheckResult[]): ModuleStatus {
  if (checks.length === 0) {
    return 'BLOCKED';
  }

  const hasBlocked = checks.some(c => c.status === 'BLOCKED');
  if (hasBlocked) {
    return 'BLOCKED';
  }

  const hasFail = checks.some(c => c.status === 'FAIL');
  if (hasFail) {
    return 'FAIL';
  }

  const hasReview = checks.some(c => c.status === 'REVIEW');
  if (hasReview) {
    return 'REVIEW_NEEDED';
  }

  // All passed
  return 'PASS';
}

/**
 * Generate a unique run ID for this verification
 */
function generateRunId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `VR-${date}-${random}`;
}

/**
 * Create a blocked module result when input data is missing
 */
function createBlockedModule(moduleDef: ModuleDefinition): ModuleResult {
  const blockedChecks: CheckResult[] = moduleDef.checks.map(check => ({
    id: check.id,
    name: check.name,
    status: 'BLOCKED' as const,
    detail: 'Input data not provided',
    issue: {
      item: moduleDef.name,
      expected: 'Module input data',
      actual: 'No data',
      reason: `Missing ${moduleDef.id} input data`
    }
  }));

  return {
    id: moduleDef.id,
    name: moduleDef.name,
    status: 'BLOCKED',
    checksTotal: moduleDef.checks.length,
    checksPassed: 0,
    checksFailed: 0,
    checks: blockedChecks
  };
}

/**
 * Main verification function that runs all module checks
 */
export function verify(input: VerificationInput): VerificationResult {
  const runId = generateRunId();
  const timestamp = new Date().toISOString();
  const bannedTerms = input.banned_terms || DEFAULT_BANNED_TERMS;

  const modules: ModuleResult[] = [];

  // M1: Product Context
  const m1Def = getModuleById('M1')!;
  let m1Result: ModuleResult;
  if (input.m1) {
    const m1Checks = verifyM1(input.m1, bannedTerms);
    m1Result = {
      id: 'M1',
      name: m1Def.name,
      status: calculateModuleStatus(m1Checks),
      checksTotal: m1Checks.length,
      checksPassed: m1Checks.filter(c => c.status === 'PASS').length,
      checksFailed: m1Checks.filter(c => c.status === 'FAIL').length,
      checks: m1Checks
    };
  } else {
    m1Result = createBlockedModule(m1Def);
  }
  modules.push(m1Result);

  // M2: Competitor Discovery
  const m2Def = getModuleById('M2')!;
  let m2Result: ModuleResult;
  if (input.m2) {
    const m2Checks = verifyM2(input.m2);
    m2Result = {
      id: 'M2',
      name: m2Def.name,
      status: calculateModuleStatus(m2Checks),
      checksTotal: m2Checks.length,
      checksPassed: m2Checks.filter(c => c.status === 'PASS').length,
      checksFailed: m2Checks.filter(c => c.status === 'FAIL').length,
      checks: m2Checks
    };
  } else {
    m2Result = createBlockedModule(m2Def);
  }
  modules.push(m2Result);

  // M2.1: Customer Intent
  const m21Def = getModuleById('M2.1')!;
  let m21Result: ModuleResult;
  if (input.m2_1) {
    const m21Checks = verifyM21(input.m2_1);
    m21Result = {
      id: 'M2.1',
      name: m21Def.name,
      status: calculateModuleStatus(m21Checks),
      checksTotal: m21Checks.length,
      checksPassed: m21Checks.filter(c => c.status === 'PASS').length,
      checksFailed: m21Checks.filter(c => c.status === 'FAIL').length,
      checks: m21Checks
    };
  } else {
    m21Result = createBlockedModule(m21Def);
  }
  modules.push(m21Result);

  // M2.3: USP Evaluation
  const m23Def = getModuleById('M2.3')!;
  let m23Result: ModuleResult;
  if (input.m2_3) {
    const m23Checks = verifyM23(input.m2_3, bannedTerms);
    m23Result = {
      id: 'M2.3',
      name: m23Def.name,
      status: calculateModuleStatus(m23Checks),
      checksTotal: m23Checks.length,
      checksPassed: m23Checks.filter(c => c.status === 'PASS').length,
      checksFailed: m23Checks.filter(c => c.status === 'FAIL').length,
      checks: m23Checks
    };
  } else {
    m23Result = createBlockedModule(m23Def);
  }
  modules.push(m23Result);

  // M3: Keyword Intelligence
  const m3Def = getModuleById('M3')!;
  let m3Result: ModuleResult;
  if (input.m3) {
    const m3Checks = verifyM3(input.m3);
    m3Result = {
      id: 'M3',
      name: m3Def.name,
      status: calculateModuleStatus(m3Checks),
      checksTotal: m3Checks.length,
      checksPassed: m3Checks.filter(c => c.status === 'PASS').length,
      checksFailed: m3Checks.filter(c => c.status === 'FAIL').length,
      checks: m3Checks
    };
  } else {
    m3Result = createBlockedModule(m3Def);
  }
  modules.push(m3Result);

  // M4: Listing Creation
  const m4Def = getModuleById('M4')!;
  let m4Result: ModuleResult;
  if (input.m4) {
    const m4Checks = verifyM4(input.m4, bannedTerms);
    m4Result = {
      id: 'M4',
      name: m4Def.name,
      status: calculateModuleStatus(m4Checks),
      checksTotal: m4Checks.length,
      checksPassed: m4Checks.filter(c => c.status === 'PASS').length,
      checksFailed: m4Checks.filter(c => c.status === 'FAIL').length,
      checks: m4Checks
    };
  } else {
    m4Result = createBlockedModule(m4Def);
  }
  modules.push(m4Result);

  // Calculate summary
  const allChecks = modules.flatMap(m => m.checks);
  const summary = {
    totalChecks: allChecks.length,
    passed: allChecks.filter(c => c.status === 'PASS').length,
    failed: allChecks.filter(c => c.status === 'FAIL').length,
    review: allChecks.filter(c => c.status === 'REVIEW').length,
    blocked: allChecks.filter(c => c.status === 'BLOCKED').length
  };

  // Determine overall status
  let overallStatus: 'COMPLETE' | 'BLOCKED' | 'FAILED';
  if (summary.blocked > 0) {
    overallStatus = 'BLOCKED';
  } else if (summary.failed > 0) {
    overallStatus = 'FAILED';
  } else {
    overallStatus = 'COMPLETE';
  }

  return {
    runId,
    timestamp,
    product: {
      asin: input.asin,
      name: input.product_name
    },
    status: overallStatus,
    modules,
    summary
  };
}
