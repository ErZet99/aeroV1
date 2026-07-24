const LP_SEED = 2150;
const NUMER_RE = /^(\d+)-(\d{2})-(\d{4})$/;

/** Inquiry number: {LP}-{MM}-{YYYY}. LP is global and never resets. */
export function nextRfqNumber(date: string, existingNumbers: string[]): string {
  const year = date.substring(0, 4);
  const month = date.substring(5, 7);

  let maxLp = LP_SEED - 1;
  for (const num of existingNumbers) {
    const m = NUMER_RE.exec(num);
    if (!m) continue;
    const lp = parseInt(m[1], 10);
    if (!isNaN(lp)) maxLp = Math.max(maxLp, lp);
  }

  return `${maxLp + 1}-${month}-${year}`;
}

export function nextRevision(rev: string): string {
  if (rev.length !== 1) {
    return 'B';
  }
  return String.fromCharCode(rev.charCodeAt(0) + 1);
}
