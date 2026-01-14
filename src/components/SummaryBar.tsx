interface SummaryBarProps {
  status: 'COMPLETE' | 'BLOCKED' | 'FAILED';
  totalChecks: number;
  passed: number;
  failed: number;
  review: number;
  blocked: number;
  qualityScore?: number;
}

export function SummaryBar({ status, totalChecks, passed, failed, review, blocked, qualityScore }: SummaryBarProps) {
  const statusConfig = {
    COMPLETE: { text: 'COMPLETE', color: 'text-green-600', bg: 'bg-green-50' },
    BLOCKED: { text: 'BLOCKED', color: 'text-yellow-600', bg: 'bg-yellow-50' },
    FAILED: { text: 'FAILED', color: 'text-red-600', bg: 'bg-red-50' },
  };

  const config = statusConfig[status];

  return (
    <div className={`${config.bg} rounded-lg border px-6 py-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-sm text-gray-500">Pipeline Status</span>
            <p className={`text-xl font-bold ${config.color}`}>{config.text}</p>
          </div>
          <div className="h-10 w-px bg-gray-300" />
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-gray-500">Checks: </span>
              <span className="font-medium">{passed}/{totalChecks}</span>
            </div>
            {failed > 0 && (
              <div>
                <span className="text-red-500 font-medium">{failed} failed</span>
              </div>
            )}
            {review > 0 && (
              <div>
                <span className="text-yellow-500 font-medium">{review} review</span>
              </div>
            )}
            {blocked > 0 && (
              <div>
                <span className="text-gray-400 font-medium">{blocked} blocked</span>
              </div>
            )}
          </div>
        </div>
        {qualityScore !== undefined && (
          <div className="text-right">
            <span className="text-sm text-gray-500">Quality Score</span>
            <p className={`text-xl font-bold ${qualityScore >= 80 ? 'text-green-600' : 'text-red-600'}`}>
              {qualityScore}/100
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
