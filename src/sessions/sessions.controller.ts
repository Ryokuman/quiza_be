import { Controller, Req } from '@nestjs/common';
import { TypedRoute, TypedBody, TypedParam } from '@nestia/core';
import { SessionsService } from './sessions.service';
import type {
  ICreateSession,
  ISession,
  ISessionCompleteResult,
} from './dto/session.dto';
import type { AuthenticatedRequest } from '../auth/types';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  /**
   * 학습 세션을 구성한다.
   *
   * 체크포인트의 tag + difficulty를 기반으로 문제 은행에서 ~15문제를 선택한다.
   * HLR 알고리즘으로 p(recall) < 0.5인 복습 대상을 ~40% 비율로 포함하고,
   * 나머지 ~60%는 새 문제로 채운다.
   *
   * 응답에는 정답(answer)이 포함되지 않는다.
   * 정답 확인은 POST /answers로 답안을 제출해야 한다.
   *
   * @param body checkpoint_id
   * @tag Sessions
   */
  @TypedRoute.Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @TypedBody() body: ICreateSession,
  ): Promise<ISession> {
    return this.sessionsService.createSession(
      req.user.userId,
      body.checkpoint_id,
    ) as any;
  }

  /**
   * 세션을 완료하고 체크포인트를 평가한다.
   *
   * 세션에 연결된 답안을 기반으로 점수를 계산하고,
   * 체크포인트의 best_score, attempts, status를 갱신한다.
   *
   * @param sessionId 세션 ID
   * @tag Sessions
   */
  @TypedRoute.Post(':sessionId/complete')
  async complete(
    @Req() req: AuthenticatedRequest,
    @TypedParam('sessionId') sessionId: string,
  ): Promise<ISessionCompleteResult> {
    return this.sessionsService.completeSession(req.user.userId, sessionId);
  }
}
