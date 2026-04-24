import type { tags } from 'typia';

/** 세션 생성 요청 */
export interface ICreateSession {
  /** 세션을 구성할 체크포인트 ID */
  checkpoint_id: string & tags.Format<'uuid'>;
}

/** 세션에 포함된 문제 (정답은 제외) */
export interface ISessionQuestion {
  /** 문제 ID */
  id: string & tags.Format<'uuid'>;

  /** 문제 태그 */
  tag: string;

  /** 문제 유형 */
  type: 'multi' | 'single';

  /** 난이도 (1~5) */
  difficulty: number;

  /** 문제 본문 */
  content: string;

  /** 객관식 선택지. 단답형이면 빈 배열. */
  options: string[];
}

/** 세션 응답 */
export interface ISession {
  /** 세션에 포함된 문제 목록 (~15개) */
  questions: ISessionQuestion[];
}
