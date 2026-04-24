import type { tags } from 'typia';

/** 로드맵 생성 요청 */
export interface ICreateRoadmap {
  /** 로드맵을 생성할 UserGoal의 ID */
  goal_id: string & tags.Format<'uuid'>;
}

/** 체크포인트 응답 */
export interface ICheckpoint {
  /** 고유 ID */
  id: string & tags.Format<'uuid'>;

  /** 체크포인트 제목 (예: "기본 시제", "관계대명사") */
  title: string;

  /** 상세 설명 */
  description: string | null;

  /** 문제 매칭용 태그. Question.tag와 일치시킨다. */
  tag: string;

  /** 난이도 (1~5). Question.difficulty와 매칭. */
  difficulty: number & tags.Minimum<1> & tags.Maximum<5>;

  /** 로드맵 내 순서 (1부터 시작) */
  order: number & tags.Minimum<1>;

  /** 진행 상태 */
  status: 'not_started' | 'in_progress' | 'passed';

  /** 최고 점수 (0~100). 아직 시도 안 했으면 null. */
  best_score: number | null;

  /** 시도 횟수 */
  attempts: number;
}

/** 로드맵 진행률 응답 */
export interface IRoadmapProgress {
  /** 통과한 체크포인트 수 */
  passed: number;

  /** 전체 체크포인트 수 */
  total: number;

  /** 진행률 (0~100) */
  percentage: number;
}

/** 로드맵 응답 */
export interface IRoadmap {
  /** 고유 ID */
  id: string & tags.Format<'uuid'>;

  /** 로드맵 제목 */
  title: string;

  /** 템플릿 여부. true면 동일 목적의 다른 유저가 복사 가능. */
  is_template: boolean;

  /** 생성 시각 */
  created_at: string & tags.Format<'date-time'>;

  /** 체크포인트 목록 (order 순) */
  checkpoints: ICheckpoint[];
}
