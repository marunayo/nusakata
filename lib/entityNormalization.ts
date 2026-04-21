type NormalizedEntityResult = {
  original: string | null;
  normalized: string | null;
  matched: boolean;
  strategy: "exact" | "case-insensitive" | "fuzzy" | "none";
  candidates: string[];
};

const KNOWN_WORDS = ["kabar", "kursi", "kantor", "gereja", "agama"];
const KNOWN_LANGUAGES = ["Arab", "Belanda", "Portugis", "Sanskerta"];

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;

      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[a.length][b.length];
}

function bestFuzzyMatch(input: string, options: string[], maxDistance = 2) {
  let best: { value: string; distance: number } | null = null;

  for (const option of options) {
    const distance = levenshtein(input.toLowerCase(), option.toLowerCase());

    if (!best || distance < best.distance) {
      best = { value: option, distance };
    }
  }

  if (!best) return null;
  if (best.distance > maxDistance) return null;

  return best.value;
}

function normalizeAgainstList(
  value: string | null,
  allowedValues: string[],
  lowercaseOutput = false
): NormalizedEntityResult {
  if (!value) {
    return {
      original: null,
      normalized: null,
      matched: false,
      strategy: "none",
      candidates: [],
    };
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return {
      original: value,
      normalized: null,
      matched: false,
      strategy: "none",
      candidates: [],
    };
  }

  const exact = allowedValues.find((item) => item === trimmed);
  if (exact) {
    return {
      original: value,
      normalized: lowercaseOutput ? exact.toLowerCase() : exact,
      matched: true,
      strategy: "exact",
      candidates: [exact],
    };
  }

  const caseInsensitive = allowedValues.find(
    (item) => item.toLowerCase() === trimmed.toLowerCase()
  );
  if (caseInsensitive) {
    return {
      original: value,
      normalized: lowercaseOutput
        ? caseInsensitive.toLowerCase()
        : caseInsensitive,
      matched: true,
      strategy: "case-insensitive",
      candidates: [caseInsensitive],
    };
  }

  const fuzzy = bestFuzzyMatch(trimmed, allowedValues);
  if (fuzzy) {
    return {
      original: value,
      normalized: lowercaseOutput ? fuzzy.toLowerCase() : fuzzy,
      matched: true,
      strategy: "fuzzy",
      candidates: [fuzzy],
    };
  }

  return {
    original: value,
    normalized: null,
    matched: false,
    strategy: "none",
    candidates: [],
  };
}

export function normalizeWord(value: string | null): NormalizedEntityResult {
  return normalizeAgainstList(value, KNOWN_WORDS, true);
}

export function normalizeLanguage(value: string | null): NormalizedEntityResult {
  return normalizeAgainstList(value, KNOWN_LANGUAGES, false);
}