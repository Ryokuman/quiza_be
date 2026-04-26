export interface IMatchTemplateBody {
  embedding: number[];
}

export interface IMatchTemplateResult {
  matched: boolean;
  roadmapId: string | null;
  similarity: number | null;
}
