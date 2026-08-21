export interface DiffLine {
  type: "added" | "removed" | "unchanged";
  line: string;
}

/** Small LCS-based line diff. Pure function, no dependency — files here are tiny. */
export function lineDiff(before: string, after: string): DiffLine[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const n = a.length;
  const m = b.length;

  // dp[i][j] = length of LCS of a[i:] and b[j:]
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      result.push({ type: "unchanged", line: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: "removed", line: a[i] });
      i++;
    } else {
      result.push({ type: "added", line: b[j] });
      j++;
    }
  }
  while (i < n) {
    result.push({ type: "removed", line: a[i] });
    i++;
  }
  while (j < m) {
    result.push({ type: "added", line: b[j] });
    j++;
  }

  return result;
}
