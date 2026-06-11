import assert from 'node:assert/strict';
import test from 'node:test';
import { QuestionsService } from './questions.service';

type CreatedQuestion = {
  id: string;
  tag_id: string;
  type: string;
  difficulty: number;
  content: string;
  options: string[];
  answer: string;
  explanation: string | null;
  rubric: string | null;
  max_score: number;
  created_at: Date;
};

function buildService(params: {
  generatedQuestions?: {
    content: string;
    options: string[];
    answer: string;
    explanation: string;
  }[];
  generatedEssayQuestions?: {
    content: string;
    answer: string;
    rubric: string;
    max_score: number;
    explanation: string;
  }[];
}) {
  const created: CreatedQuestion[] = [];
  const geminiCalls: unknown[] = [];
  const tag = { id: 'tag-1', name: 'grammar' };

  const prisma = {
    tag: {
      findUniqueOrThrow: async () => tag,
    },
    question: {
      create: async ({ data }: { data: Omit<CreatedQuestion, 'id' | 'created_at' | 'max_score'> & { max_score?: number } }) => {
        const row = {
          id: `question-${created.length + 1}`,
          max_score: data.max_score ?? 1,
          rubric: null,
          created_at: new Date('2026-06-11T00:00:00.000Z'),
          ...data,
        };
        created.push(row);
        return row;
      },
    },
    $transaction: async (operations: Promise<CreatedQuestion>[]) => Promise.all(operations),
  };

  const gemini = {
    generateQuestions: async (tagName: string, difficulty: number, count: number, type: 'multi' | 'single') => {
      geminiCalls.push({ tagName, difficulty, count, type });
      return params.generatedQuestions ?? [];
    },
    generateEssayQuestions: async () => params.generatedEssayQuestions ?? [],
  };

  return {
    service: new QuestionsService(prisma as never, gemini as never),
    created,
    geminiCalls,
  };
}

test('객관식 문제 생성은 Gemini 결과를 검증한 뒤 DB에 저장한다', async () => {
  const { service, created, geminiCalls } = buildService({
    generatedQuestions: [
      {
        content: '다음 문장에서 알맞은 단어는?',
        options: ['went', 'go', 'gone', 'going'],
        answer: '0',
        explanation: '과거 시제이므로 went가 맞습니다.',
      },
    ],
  });

  const result = await service.generate({
    tagId: 'tag-1',
    difficulty: 2,
    count: 1,
    type: 'multi',
  });

  assert.deepEqual(geminiCalls, [
    { tagName: 'grammar', difficulty: 2, count: 1, type: 'multi' },
  ]);
  assert.equal(created[0].content, '다음 문장에서 알맞은 단어는?');
  assert.deepEqual(created[0].options, ['went', 'go', 'gone', 'going']);
  assert.equal(created[0].answer, '0');
  assert.equal(result[0].content, '다음 문장에서 알맞은 단어는?');
  assert.equal(result[0].answer, '0');
});

test('단답형 문제 생성은 Gemini 결과를 options 없이 DB에 저장한다', async () => {
  const { service, created } = buildService({
    generatedQuestions: [
      {
        content: 'apple의 한국어 뜻은?',
        options: [],
        answer: '사과',
        explanation: 'apple은 사과입니다.',
      },
    ],
  });

  const result = await service.generate({
    tagId: 'tag-1',
    difficulty: 1,
    count: 1,
    type: 'single',
  });

  assert.equal(created[0].type, 'single');
  assert.deepEqual(created[0].options, []);
  assert.equal(created[0].answer, '사과');
  assert.equal(result[0].type, 'single');
});

test('Gemini 객관식 결과가 부적합하면 기존 placeholder로 fallback한다', async () => {
  const { service, created } = buildService({
    generatedQuestions: [
      {
        content: '선택지가 부족한 문제',
        options: ['A', 'B'],
        answer: '0',
        explanation: '부적합',
      },
    ],
  });

  const result = await service.generate({
    tagId: 'tag-1',
    difficulty: 1,
    count: 1,
    type: 'multi',
  });

  assert.match(created[0].content, /^\[Grammar Lv\.1 #1\]/);
  assert.equal(created[0].answer, 'went');
  assert.equal(result[0].content, created[0].content);
});

test('서술형 문제 생성은 기존 Gemini essay 경로를 유지한다', async () => {
  const { service, created } = buildService({
    generatedEssayQuestions: [
      {
        content: '현재완료를 설명하세요.',
        answer: '과거부터 현재까지 이어지는 동작이나 상태를 나타냅니다.',
        rubric: '현재와의 관련성을 설명해야 함',
        max_score: 10,
        explanation: '현재완료의 핵심은 현재와의 관련성입니다.',
      },
    ],
  });

  const result = await service.generate({
    tagId: 'tag-1',
    difficulty: 3,
    count: 1,
    type: 'essay',
  });

  assert.equal(created[0].type, 'essay');
  assert.equal(created[0].rubric, '현재와의 관련성을 설명해야 함');
  assert.equal(created[0].max_score, 10);
  assert.equal(result[0].answer, '');
  assert.equal(result[0].rubric, null);
});
