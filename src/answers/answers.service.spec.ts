import assert from 'node:assert/strict';
import test from 'node:test';
import { AnswersService } from './answers.service';

function buildService(question: {
  id: string;
  type: string;
  answer: string;
  options: string[];
  max_score: number;
  content?: string;
  explanation?: string | null;
  rubric?: string | null;
}) {
  const createdAnswers: unknown[] = [];
  const updatedStats: unknown[] = [];

  const prisma = {
    question: {
      findUnique: async () => ({
        content: '문제 본문',
        explanation: null,
        rubric: null,
        ...question,
      }),
    },
    userAnswer: {
      create: async ({ data }: { data: unknown }) => {
        createdAnswers.push(data);
        return data;
      },
    },
    userQuestionStats: {
      findUnique: async () => null,
      create: async ({ data }: { data: unknown }) => {
        updatedStats.push(data);
        return data;
      },
      update: async ({ data }: { data: unknown }) => data,
    },
  };

  const gemini = {
    judgeSingleAnswer: async () => ({ isCorrect: false, reason: '' }),
    gradeEssay: async () => ({ score: 0, reason: '' }),
  };

  return {
    service: new AnswersService(prisma as never, gemini as never),
    createdAnswers,
    updatedStats,
  };
}

test('객관식 정답이 텍스트로 저장되어도 프론트가 보낸 선택지 인덱스로 정답 처리한다', async () => {
  const { service, createdAnswers, updatedStats } = buildService({
    id: 'question-1',
    type: 'multi',
    options: ['go', 'went', 'goes', 'going'],
    answer: 'went',
    max_score: 1,
  });

  const result = await service.submit('user-1', 'question-1', '1', 'session-1');

  assert.equal(result.is_correct, true);
  assert.equal(result.correct_answer, 'went');
  assert.deepEqual(createdAnswers[0], {
    user_id: 'user-1',
    question_id: 'question-1',
    user_answer: '1',
    is_correct: true,
    score: 1,
    grade_reason: null,
    session_id: 'session-1',
  });
  assert.equal((updatedStats[0] as { correct_count: number }).correct_count, 1);
});

test('객관식 정답이 인덱스로 저장된 문제도 계속 정답 처리한다', async () => {
  const { service } = buildService({
    id: 'question-2',
    type: 'multi',
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    answer: '2',
    max_score: 1,
  });

  const result = await service.submit('user-1', 'question-2', '2');

  assert.equal(result.is_correct, true);
});
