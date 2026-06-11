import assert from 'node:assert/strict';
import test from 'node:test';
import { SessionsService } from './sessions.service';

test('세션 점수가 80% 미만이면 체크포인트를 통과시키지 않는다', async () => {
  const checkpointUpdates: unknown[] = [];
  const sessionUpdates: unknown[] = [];

  const prisma = {
    session: {
      findUnique: async () => ({
        id: 'session-1',
        user_id: 'user-1',
        checkpoint_id: 'checkpoint-1',
        status: 'in_progress',
      }),
      update: async ({ data }: { data: unknown }) => {
        sessionUpdates.push(data);
        return data;
      },
    },
    userAnswer: {
      findMany: async () => [
        { is_correct: true, score: 1, question: { max_score: 1 } },
        { is_correct: true, score: 1, question: { max_score: 1 } },
        { is_correct: true, score: 1, question: { max_score: 1 } },
        { is_correct: false, score: 0, question: { max_score: 1 } },
      ],
    },
    checkpoint: {
      findUnique: async () => ({
        id: 'checkpoint-1',
        best_score: null,
        status: 'in_progress',
      }),
      update: async ({ data }: { data: unknown }) => {
        checkpointUpdates.push(data);
        return data;
      },
    },
  };

  const service = new SessionsService(prisma as never, {} as never);

  const result = await service.completeSession('user-1', 'session-1');

  assert.equal(result.score, 0.75);
  assert.equal(result.passed, false);
  assert.equal(result.checkpoint_status, 'in_progress');
  assert.equal((sessionUpdates[0] as { correct: number }).correct, 3);
  assert.equal((checkpointUpdates[0] as { status: string }).status, 'in_progress');
});
