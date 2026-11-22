// Unbiased Fisher-Yates shuffle returning a new array
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Shuffle letters for spelling games, guaranteeing the scrambled order differs
// from the original order whenever there are at least 2 distinct letters.
export function shuffleScrambled(letters) {
  const arr = [...letters];
  const distinct = new Set(arr.map(c => c.toLowerCase()));
  if (distinct.size < 2) return arr;

  const orig = arr.join('');
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = shuffle(arr);
    if (candidate.join('') !== orig) {
      return candidate;
    }
  }

  // Deterministic fallback swap of two distinct characters
  const fallback = [...arr];
  for (let i = 0; i < fallback.length - 1; i++) {
    for (let j = i + 1; j < fallback.length; j++) {
      if (fallback[i].toLowerCase() !== fallback[j].toLowerCase()) {
        [fallback[i], fallback[j]] = [fallback[j], fallback[i]];
        return fallback;
      }
    }
  }
  return fallback;
}
