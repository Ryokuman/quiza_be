import type { tags } from 'typia';

/** UserGoal 생성 요청 */
export interface ICreateGoal {
  /** 도메인 ID */
  domain_id: string & tags.Format<'uuid'>;

  /** 학습 목표 (예: "토익 800점", "비즈니스 회화") */
  target: string & tags.MinLength<1>;

  /** 학습 수준 */
  level: 'beginner' | 'intermediate' | 'advanced';
}

/** UserGoal 응답 */
export interface IGoal {
  /** 고유 ID */
  id: string & tags.Format<'uuid'>;

  /** 유저 ID */
  user_id: string & tags.Format<'uuid'>;

  /** 도메인 ID */
  domain_id: string & tags.Format<'uuid'>;

  /** 학습 목표 */
  target: string;

  /** 학습 수준 */
  level: string;

  /** 활성 여부 */
  is_active: boolean;

  /** 생성 시각 */
  created_at: string & tags.Format<'date-time'>;
}
