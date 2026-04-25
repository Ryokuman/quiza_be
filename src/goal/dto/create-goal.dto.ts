export interface ICreateGoalBody {
  domain: string;
  target: string;
  level: string;
  tagIds?: string[];
}

export interface IGoalItem {
  id: string;
  domain: { id: string; name: string };
  target: string;
  level: string;
  is_active: boolean;
  created_at: string;
  hasRoadmap: boolean;
}

export interface ICreateGoalResult {
  goal: IGoalItem;
  templateMatched: boolean;
}
