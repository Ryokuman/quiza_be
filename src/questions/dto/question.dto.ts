import type { tags } from 'typia';

/** 문제 생성 요청 (프리미엄 전용) */
export interface IGenerateQuestions {
  /** 태그 ID (UUID) */
  tagId: string & tags.Format<'uuid'>;
  /** 난이도 (1~5) */
  difficulty: number & tags.Minimum<1> & tags.Maximum<5>;
  /** 생성할 문제 수 (1~10) */
  count: number & tags.Minimum<1> & tags.Maximum<10>;
}

/** 문제 응답 */
export interface IQuestion {
  id: string & tags.Format<'uuid'>;
  tag: { id: string; name: string };
  type: 'multi' | 'single';
  difficulty: number;
  content: string;
  options: string[];
  answer: string;
  explanation: string | null;
  created_at: string & tags.Format<'date-time'>;
}

/** 문제 생성 결과 */
export interface IGenerateResult {
  questions: IQuestion[];
}
