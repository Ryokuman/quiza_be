/** 태그별 통계 */
export interface ITagStat {
  /** 태그명 */
  tag: string;

  /** 해당 태그의 총 답변 수 */
  total: number;

  /** 해당 태그의 정답 수 */
  correct: number;

  /** 정답률 (0~100) */
  accuracy: number;
}

/** 로드맵 진행률 */
export interface IRoadmapProgress {
  /** 통과한 체크포인트 수 */
  passed: number;

  /** 전체 체크포인트 수 */
  total: number;

  /** 진행률 (0~100) */
  percentage: number;
}

/** 유저 종합 통계 응답 */
export interface IStats {
  /** 태그별 정답률 통계 */
  tag_stats: ITagStat[];

  /** 총 답변 수 */
  total_answered: number;

  /** 로드맵 진행률 */
  roadmap_progress: IRoadmapProgress;
}
