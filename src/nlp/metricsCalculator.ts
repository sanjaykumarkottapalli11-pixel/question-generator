/**
 * Exact BLEU & ROUGE Evaluation Calculator in TypeScript.
 * Evaluates generated questions against ground-truth SQuAD reference questions.
 */

export interface BleuResult {
  bleu_1: number;
  bleu_2: number;
  bleu_3: number;
  bleu_4: number;
  bleu_avg: number;
}

export interface RougeResult {
  rouge_1: number;
  rouge_2: number;
  rouge_l: number;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function getNGrams(tokens: string[], n: number): string[] {
  const nGrams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    nGrams.push(tokens.slice(i, i + n).join(' '));
  }
  return nGrams;
}

/**
 * Calculates BLEU-1, BLEU-2, BLEU-3, BLEU-4 with brevity penalty.
 */
export function calculateBleu(hypothesis: string, reference: string): BleuResult {
  const hypTokens = tokenize(hypothesis);
  const refTokens = tokenize(reference);

  if (hypTokens.length === 0 || refTokens.length === 0) {
    return { bleu_1: 0, bleu_2: 0, bleu_3: 0, bleu_4: 0, bleu_avg: 0 };
  }

  // Brevity Penalty
  const c = hypTokens.length;
  const r = refTokens.length;
  const bp = c > r ? 1 : Math.exp(1 - r / c);

  const precisions: number[] = [];

  for (let n = 1; n <= 4; n++) {
    const hypNGrams = getNGrams(hypTokens, n);
    const refNGrams = getNGrams(refTokens, n);

    if (hypNGrams.length === 0) {
      precisions.push(0);
      continue;
    }

    const refCounts: Record<string, number> = {};
    refNGrams.forEach((ng) => {
      refCounts[ng] = (refCounts[ng] || 0) + 1;
    });

    let matchCount = 0;
    const hypCounts: Record<string, number> = {};
    hypNGrams.forEach((ng) => {
      hypCounts[ng] = (hypCounts[ng] || 0) + 1;
      if (hypCounts[ng] <= (refCounts[ng] || 0)) {
        matchCount++;
      }
    });

    precisions.push(matchCount / hypNGrams.length);
  }

  const b1 = Math.round(precisions[0] * bp * 100 * 10) / 10;
  const b2 = Math.round(precisions[1] * bp * 100 * 10) / 10;
  const b3 = Math.round(precisions[2] * bp * 100 * 10) / 10;
  const b4 = Math.round(precisions[3] * bp * 100 * 10) / 10;

  const validPrecisions = precisions.filter((p) => p > 0);
  const avgP = validPrecisions.length > 0 ? validPrecisions.reduce((a, b) => a + b, 0) / validPrecisions.length : 0;
  const bleu_avg = Math.round(avgP * bp * 100 * 10) / 10;

  return { bleu_1: b1, bleu_2: b2, bleu_3: b3, bleu_4: b4, bleu_avg };
}

/**
 * Calculates ROUGE-1 (unigram), ROUGE-2 (bigram), and ROUGE-L (Longest Common Subsequence).
 */
export function calculateRouge(hypothesis: string, reference: string): RougeResult {
  const hypTokens = tokenize(hypothesis);
  const refTokens = tokenize(reference);

  if (hypTokens.length === 0 || refTokens.length === 0) {
    return { rouge_1: 0, rouge_2: 0, rouge_l: 0 };
  }

  // ROUGE-1
  const hypUnigrams = new Set(hypTokens);
  const refUnigrams = new Set(refTokens);
  let r1Match = 0;
  hypUnigrams.forEach((u) => {
    if (refUnigrams.has(u)) r1Match++;
  });
  const r1Prec = r1Match / hypTokens.length;
  const r1Rec = r1Match / refTokens.length;
  const r1F1 = r1Prec + r1Rec > 0 ? (2 * r1Prec * r1Rec) / (r1Prec + r1Rec) : 0;

  // ROUGE-2
  const hypBigrams = getNGrams(hypTokens, 2);
  const refBigrams = getNGrams(refTokens, 2);
  const refBigramCounts: Record<string, number> = {};
  refBigrams.forEach((bg) => (refBigramCounts[bg] = (refBigramCounts[bg] || 0) + 1));
  let r2Match = 0;
  const hypBigramCounts: Record<string, number> = {};
  hypBigrams.forEach((bg) => {
    hypBigramCounts[bg] = (hypBigramCounts[bg] || 0) + 1;
    if (hypBigramCounts[bg] <= (refBigramCounts[bg] || 0)) r2Match++;
  });
  const r2Prec = hypBigrams.length > 0 ? r2Match / hypBigrams.length : 0;
  const r2Rec = refBigrams.length > 0 ? r2Match / refBigrams.length : 0;
  const r2F1 = r2Prec + r2Rec > 0 ? (2 * r2Prec * r2Rec) / (r2Prec + r2Rec) : 0;

  // ROUGE-L (LCS algorithm)
  const lcsLength = computeLCS(hypTokens, refTokens);
  const rlPrec = lcsLength / hypTokens.length;
  const rlRec = lcsLength / refTokens.length;
  const rlF1 = rlPrec + rlRec > 0 ? (2 * rlPrec * rlRec) / (rlPrec + rlRec) : 0;

  return {
    rouge_1: Math.round(r1F1 * 100 * 10) / 10,
    rouge_2: Math.round(r2F1 * 100 * 10) / 10,
    rouge_l: Math.round(rlF1 * 100 * 10) / 10,
  };
}

function computeLCS(x: string[], y: string[]): number {
  const m = x.length;
  const n = y.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (x[i - 1] === y[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[m][n];
}
