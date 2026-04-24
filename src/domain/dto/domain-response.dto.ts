export interface IDomainItem {
  id: string;
  name: string;
  created_at: string;
}

export interface IDomainProgress {
  id: string;
  name: string;
  goalId: string;
  target: string;
  level: string;
  checkpoints: {
    total: number;
    passed: number;
    in_progress: number;
  };
}

export interface ICheckpointItem {
  id: string;
  title: string;
  description: string | null;
  tag_id: string;
  tag_name?: string;
  difficulty: number;
  order: number;
  status: string;
  best_score: number | null;
  attempts: number;
}

export interface IDomainRoadmap {
  id: string;
  title: string;
  checkpoints: ICheckpointItem[];
}
