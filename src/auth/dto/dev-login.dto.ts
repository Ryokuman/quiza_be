/**
 * 개발 환경 전용 로그인 요청.
 * 프로덕션에서는 사용 불가.
 */
export interface IDevLogin {
  /** 테스트용 world_id. 미제공 시 자동 생성. */
  world_id?: string;
}
