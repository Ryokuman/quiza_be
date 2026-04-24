import type { tags } from 'typia';

/** 문제 생성 요청 (프리미엄 전용) */
export interface IGenerateQuestions {
  /** 문제 태그 (예: "grammar", "vocabulary") */
  tag: string & tags.MinLength<1>;
  /** 난이도 (1~5) */
  difficulty: number & tags.Minimum<1> & tags.Maximum<5>;
  /** 생성할 문제 수 (1~10) */
  count: number & tags.Minimum<1> & tags.Maximum<10>;
}

/** 문제 응답 */
export interface IQuestion {
  id: string & tags.Format<'uuid'>;
  tag: string;
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
