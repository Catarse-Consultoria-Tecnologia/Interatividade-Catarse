const STOPWORDS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "a",
  "o",
  "as",
  "os",
  "um",
  "uma",
  "para",
  "com",
  "na",
  "no",
  "s.a.",
  "sa",
  "ltda",
]);

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantWords(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

/**
 * Compara uma resposta livre do participante com o texto esperado por palavras-chave.
 * Heurística deliberadamente tolerante: o objetivo é reconhecer raciocínio defensável,
 * não exigir digitação idêntica ao gabarito (ver EF-01 §26: "não existe resposta única").
 */
export function fuzzyMatches(participantText: string, expectedText: string): boolean {
  const participant = normalizeText(participantText);
  if (!participant) return false;

  const expectedWords = significantWords(expectedText);
  if (expectedWords.length === 0) return participant.length > 0;

  const hits = expectedWords.filter((w) => participant.includes(w));
  const ratio = hits.length / expectedWords.length;

  // Para textos esperados curtos (ex: "CVM"), basta 1 palavra-chave bater.
  if (expectedWords.length <= 2) return hits.length >= 1;
  return ratio >= 0.4;
}
