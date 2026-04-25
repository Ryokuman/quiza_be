/** 약점 태그 정보 */
export interface IWeakTag {
  /** 태그명 */
  tag: string;
  /** 정답률 (0~100) */
  accuracy: number;
  /** 점수율 (0~100, 부분점수 반영) */
  score_rate: number;
  /** 총 시도 수 */
  total_attempts: number;
}

/** 학습 조언 응답 */
export interface IAdviceResult {
  /** Gemini가 생성한 개인화 학습 조언 */
  advice: string;
  /** 약점 태그 목록 */
  weak_tags: IWeakTag[];
}
