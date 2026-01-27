// GET /api/export/errors?format=csv|json&details=true
// Exports error frequency, descriptions, and examples for evaluation

import { NextRequest, NextResponse } from 'next/server';
import { getServerConfig } from '@/lib/serverConfig';
import { listReports as listGitHubReports, fetchReport as fetchGitHubReport } from '@/lib/github';
import { listS3Reports, fetchS3Report } from '@/lib/s3';
import { parseReport } from '@/lib/reportParser';
import { verify } from '@/lib/verificationEngine';
import { getTopFailures } from '@/lib/statsAggregator';
import { VerificationResult } from '@/lib/types';

interface ErrorExport {
  checkId: string;
  checkName: string;
  moduleId: string;
  moduleName: string;
  failCount: number;
  failRate: number;
  totalAsins: number;
  sampleIssues: string[];
  severity: 'High' | 'Medium' | 'Low';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const includeDetails = searchParams.get('details') === 'true';

    // Get server config (GitHub or S3)
    const config = await getServerConfig();

    if (!config) {
      return NextResponse.json(
        { error: 'Report source not configured' },
        { status: 503 }
      );
    }

    // Fetch list of reports based on source
    let reportFiles: Array<{ name: string; asin: string; path?: string; key?: string }> = [];

    if (config.source === 's3' && config.s3) {
      const s3Files = await listS3Reports(config.s3);
      reportFiles = s3Files.map(f => ({
        name: f.name,
        asin: f.asin,
        key: f.key,
      }));
    } else if (config.source === 'github' && config.github) {
      const githubFiles = await listGitHubReports(config.github);
      reportFiles = githubFiles.map(f => ({
        name: f.name,
        asin: f.asin,
        path: f.path,
      }));
    }

    if (reportFiles.length === 0) {
      return NextResponse.json(
        { error: 'No reports available' },
        { status: 404 }
      );
    }

    // Fetch and verify reports
    const reports: VerificationResult[] = [];

    for (const file of reportFiles) {
      try {
        let content: any;

        if (config.source === 's3' && config.s3 && file.key) {
          content = await fetchS3Report(file.key, config.s3);
        } else if (config.source === 'github' && config.github && file.path) {
          content = await fetchGitHubReport(file.path, config.github);
        } else {
          continue;
        }

        const input = parseReport(content, file.name);
        const result = verify(input);
        reports.push(result);
      } catch (err) {
        console.warn(`Failed to process ${file.name}:`, err);
      }
    }

    if (reports.length === 0) {
      return NextResponse.json(
        { error: 'Failed to process any reports' },
        { status: 500 }
      );
    }

    // Get top failures with extended data
    const topFailures = getTopFailures(reports, 100); // Get more for export
    const totalAsins = reports.length;

    // Enrich with severity and module info
    const errorExports: ErrorExport[] = topFailures.map(failure => {
      const moduleId = failure.checkId.split('-')[0];
      let severity: 'High' | 'Medium' | 'Low' = 'Low';

      if (failure.failRate >= 50) {
        severity = 'High';
      } else if (failure.failRate >= 20) {
        severity = 'Medium';
      }

      return {
        checkId: failure.checkId,
        checkName: failure.checkName,
        moduleId,
        moduleName: failure.moduleName,
        failCount: failure.failCount,
        failRate: Math.round(failure.failRate * 10) / 10,
        totalAsins,
        sampleIssues: failure.sampleIssues,
        severity,
      };
    });

    if (format === 'json') {
      return NextResponse.json({
        exportDate: new Date().toISOString(),
        totalAsins,
        totalErrors: errorExports.length,
        errors: errorExports,
      });
    }

    // CSV format
    const csvRows: string[] = [];

    // Header
    if (includeDetails) {
      csvRows.push('Check ID,Check Name,Module ID,Module Name,Fail Count,Fail Rate (%),Total ASINs,Severity,Sample Issue 1,Sample Issue 2,Sample Issue 3');
    } else {
      csvRows.push('Check ID,Check Name,Module Name,Fail Count,Fail Rate (%),Severity,Sample Issues');
    }

    // Data rows
    for (const error of errorExports) {
      if (includeDetails) {
        const issue1 = error.sampleIssues[0] || '';
        const issue2 = error.sampleIssues[1] || '';
        const issue3 = error.sampleIssues[2] || '';

        csvRows.push([
          error.checkId,
          `"${error.checkName}"`,
          error.moduleId,
          `"${error.moduleName}"`,
          error.failCount,
          error.failRate,
          error.totalAsins,
          error.severity,
          `"${issue1.replace(/"/g, '""')}"`,
          `"${issue2.replace(/"/g, '""')}"`,
          `"${issue3.replace(/"/g, '""')}"`,
        ].join(','));
      } else {
        const issuesStr = error.sampleIssues.join('; ');
        csvRows.push([
          error.checkId,
          `"${error.checkName}"`,
          `"${error.moduleName}"`,
          error.failCount,
          error.failRate,
          error.severity,
          `"${issuesStr.replace(/"/g, '""')}"`,
        ].join(','));
      }
    }

    const csvContent = csvRows.join('\n');
    const filename = `slo-errors-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[Export Errors] Error:', error);
    return NextResponse.json(
      { error: 'Failed to export errors' },
      { status: 500 }
    );
  }
}
