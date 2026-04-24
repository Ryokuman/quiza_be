export interface ISaveEmbeddingBody {
  domain: string;
  goal?: string;
}

export interface ISaveEmbeddingResult {
  id: string;
  domain: string;
  goal: string | null;
}
