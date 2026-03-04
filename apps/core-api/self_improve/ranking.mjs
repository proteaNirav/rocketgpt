const severityScore = {
  critical: 0,
  error: 1,
  warn: 2,
  info: 3,
};

export function rankFindings(findings) {
  return [...findings].sort((a, b) => {
    const left = severityScore[a.severity] ?? 99;
    const right = severityScore[b.severity] ?? 99;
    if (left !== right) return left - right;
    return String(a.id).localeCompare(String(b.id));
  });
}

