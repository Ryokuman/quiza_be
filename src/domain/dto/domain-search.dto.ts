export interface IDomainSearchBody {
  query: string;
}

export interface IDomainSearchResult {
  tags: string[];
  matches: Array<{
    id: string;
    name: string;
    similarity: number;
  }>;
}
