export interface IMatchTemplateBody {
  domain: string;
  goal: string;
  embedding: number[];
}

export interface IMatchTemplateResult {
  matched: boolean;
  roadmapId: string | null;
  similarity: number | null;
}
