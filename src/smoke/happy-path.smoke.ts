import assert from 'node:assert/strict';
import test from 'node:test';
import { Logger } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { GoalService } from '../goal/goal.service';
import { SessionsService } from '../sessions/sessions.service';
import { AnswersService } from '../answers/answers.service';

type Row = Record<string, any>;

Logger.overrideLogger(false);

function createSmokePrisma() {
  const users: Row[] = [];
  const domain = { id: 'domain-english', name: '영어' };
  const tag = { id: 'tag-grammar', name: 'grammar', domain_id: domain.id };
  const goals: Row[] = [];
  const roadmaps: Row[] = [];
  const checkpoints: Row[] = [];
  const sessions: Row[] = [];
  const answers: Row[] = [];
  const stats = new Map<string, Row>();
  const questions = Array.from({ length: 15 }, (_, idx) => ({
    id: `question-${idx + 1}`,
    tag_id: tag.id,
    tag,
    type: 'multi',
    difficulty: 1,
    content: `Smoke question ${idx + 1}`,
    options: ['정답', '오답 A', '오답 B', '오답 C'],
    answer: '0',
    explanation: '정답은 첫 번째 선택지입니다.',
    max_score: 1,
  }));

  return {
    users,
    user: {
      upsert: async ({ where, create }: { where: Row; create: Row }) => {
        const existing = users.find((user) => user.world_id === where.world_id);
        if (existing) return existing;

        const user = {
          id: `user-${users.length + 1}`,
          world_id: create.world_id,
          nickname: create.nickname,
          is_premium: false,
          created_at: new Date('2026-06-11T00:00:00.000Z'),
          updated_at: new Date('2026-06-11T00:00:00.000Z'),
        };
        users.push(user);
        return user;
      },
    },
    userGoal: {
      findFirst: async () => null,
      create: async ({ data, include }: { data: Row; include?: Row }) => {
        const goal = {
          id: `goal-${goals.length + 1}`,
          ...data,
          is_active: true,
          created_at: new Date('2026-06-11T00:00:00.000Z'),
          domain,
        };
        goals.push(goal);
        return include?.domain ? goal : { ...goal, domain: undefined };
      },
    },
    tag: {
      findMany: async () => [tag],
      findUnique: async () => tag,
    },
    roadmap: {
      create: async ({ data }: { data: Row }) => {
        const roadmap = {
          id: `roadmap-${roadmaps.length + 1}`,
          goal_id: data.goal_id,
          title: data.title,
          is_template: data.is_template,
          created_at: new Date('2026-06-11T00:00:00.000Z'),
        };
        roadmaps.push(roadmap);

        for (const checkpointData of data.checkpoints.create) {
          checkpoints.push({
            id: `checkpoint-${checkpoints.length + 1}`,
            roadmap_id: roadmap.id,
            ...checkpointData,
          });
        }
        return roadmap;
      },
    },
    checkpoint: {
      findUnique: async ({ where }: { where: Row }) => {
        const checkpoint = checkpoints.find((row) => row.id === where.id);
        if (!checkpoint) return null;
        const goal = goals.find((row) => row.id === checkpoint.roadmap_id.replace('roadmap', 'goal'));
        return {
          ...checkpoint,
          roadmap: { goal: { user_id: goal?.user_id } },
        };
      },
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const checkpoint = checkpoints.find((row) => row.id === where.id);
        assert.ok(checkpoint, `checkpoint not found: ${where.id}`);
        checkpoint.attempts += data.attempts?.increment ?? 0;
        checkpoint.best_score = data.best_score;
        checkpoint.status = data.status;
        return checkpoint;
      },
    },
    question: {
      findMany: async ({ where, take }: { where: Row; take: number }) =>
        questions
          .filter((question) => question.tag_id === where.tag_id)
          .slice(0, take),
      findUnique: async ({ where }: { where: Row }) =>
        questions.find((question) => question.id === where.id) ?? null,
    },
    session: {
      create: async ({ data }: { data: Row }) => {
        const session = {
          id: `session-${sessions.length + 1}`,
          ...data,
          score: null,
          correct: 0,
          status: 'in_progress',
          created_at: new Date('2026-06-11T00:00:00.000Z'),
          completed_at: null,
        };
        sessions.push(session);
        return session;
      },
      findUnique: async ({ where }: { where: Row }) =>
        sessions.find((session) => session.id === where.id) ?? null,
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const session = sessions.find((row) => row.id === where.id);
        assert.ok(session, `session not found: ${where.id}`);
        Object.assign(session, data);
        return session;
      },
    },
    userAnswer: {
      create: async ({ data }: { data: Row }) => {
        const answer = {
          id: `answer-${answers.length + 1}`,
          ...data,
          answered_at: new Date('2026-06-11T00:00:00.000Z'),
        };
        answers.push(answer);
        return answer;
      },
      findMany: async ({ where }: { where: Row }) =>
        answers
          .filter((answer) => answer.session_id === where.session_id)
          .map((answer) => ({
            ...answer,
            question: {
              max_score: questions.find((question) => question.id === answer.question_id)?.max_score ?? 1,
            },
          })),
    },
    userQuestionStats: {
      findMany: async () => [],
      findUnique: async ({ where }: { where: Row }) =>
        stats.get(`${where.user_id_question_id.user_id}:${where.user_id_question_id.question_id}`) ?? null,
      create: async ({ data }: { data: Row }) => {
        stats.set(`${data.user_id}:${data.question_id}`, data);
        return data;
      },
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const key = `${where.user_id_question_id.user_id}:${where.user_id_question_id.question_id}`;
        const existing = stats.get(key);
        assert.ok(existing, `stats not found: ${key}`);
        const updated = {
          ...existing,
          total_attempts: existing.total_attempts + (data.total_attempts?.increment ?? 0),
          correct_count: existing.correct_count + (data.correct_count?.increment ?? 0),
          half_life: data.half_life,
          last_seen_at: data.last_seen_at,
        };
        stats.set(key, updated);
        return updated;
      },
    },
  };
}

test('dev-login부터 세션 완료까지 핵심 학습 흐름이 외부 서비스 없이 통과한다', async () => {
  const prisma = createSmokePrisma();
  const jwt = { signAsync: async (payload: Row) => `token:${payload.sub}` };
  const authService = new AuthService(prisma as never, jwt as never, {} as never);
  const goalService = new GoalService(
    prisma as never,
    { findOrCreate: async () => ({ id: 'domain-english', name: '영어' }) } as never,
  );
  const sessionsService = new SessionsService(prisma as never, {
    generateQuestions: async () => [],
  } as never);
  const answersService = new AnswersService(prisma as never, {
    judgeSingleAnswer: async () => ({ isCorrect: false, reason: '' }),
    gradeEssay: async () => ({ score: 0, reason: '' }),
  } as never);

  const auth = await authService.devLogin('smoke-user');
  const userId = prisma.users[0].id;

  const createdGoal = await goalService.createGoal(userId, {
    domain: '영어',
    target: '문법 기초 복습',
    level: 'beginner',
    tagIds: ['tag-grammar'],
  });
  const session = await sessionsService.createSession(userId, 'checkpoint-1');

  for (const question of session.questions) {
    const answer = await answersService.submit(userId, question.id, '0', session.session_id);
    assert.equal(answer.is_correct, true, `question ${question.id} should be correct`);
  }

  const completed = await sessionsService.completeSession(userId, session.session_id);

  assert.equal(auth.access_token, 'token:user-1');
  assert.equal(createdGoal.goal.hasRoadmap, true);
  assert.equal(session.questions.length, 15);
  assert.equal(completed.score, 1);
  assert.equal(completed.passed, true);
  assert.equal(completed.checkpoint_status, 'passed');
});
