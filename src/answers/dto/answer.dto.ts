import type { tags } from 'typia';

/** 답안 제출 요청 */
export interface ISubmitAnswer {
  /** 문제 ID */
  question_id: string & tags.Format<'uuid'>;

  /** 유저의 답 (객관식: "A"~"D", 단답형: 자유 입력) */
  user_answer: string & tags.MinLength<1>;

  /** 세션 ID (세션 내 답안 제출 시) */
  session_id?: (string & tags.Format<'uuid'>) | undefined;
}

/** 답안 제출 결과 */
export interface IAnswerResult {
  /** 정답 여부 */
  is_correct: boolean;

  /** 정답 */
  correct_answer: string;

  /** 해설. 없으면 null. */
  explanation: string | null;
}
