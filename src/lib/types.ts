// Module status
export type ModuleStatus = 'PASS' | 'FAIL' | 'REVIEW_NEEDED' | 'BLOCKED' | 'PENDING';

// Check status
export type CheckStatus = 'PASS' | 'FAIL' | 'REVIEW' | 'BLOCKED';

// Individual check result
export interface CheckResult {
  id: string;           // e.g., "M1-01"
  name: string;         // e.g., "Product type present"
  status: CheckStatus;
  detail?: string;      // e.g., "Serum" or "Found 5 items"
  issue?: {
    item: string;       // What failed
    expected: string;   // What was expected
    actual: string;     // What was found
    reason: string;     // Why it failed
  };
  actions?: string[];   // Suggested fixes
}

// Module verification result
export interface ModuleResult {
  id: string;           // e.g., "M1"
  name: string;         // e.g., "Product Context"
  status: ModuleStatus;
  checksTotal: number;
  checksPassed: number;
  checksFailed: number;
  checks: CheckResult[];
}

// Full pipeline verification result
export interface VerificationResult {
  runId: string;
  timestamp: string;
  product: {
    asin: string;
    name: string;
  };
  status: 'COMPLETE' | 'BLOCKED' | 'FAILED';
  modules: ModuleResult[];
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    review: number;
    blocked: number;
  };
}

// Module definitions (static)
export interface ModuleDefinition {
  id: string;
  name: string;
  shortName: string;
  checks: CheckDefinition[];
  dependsOn: string[];  // Module IDs this depends on
}

export interface CheckDefinition {
  id: string;
  name: string;
  rule: string;
  failMessage: string;
}
