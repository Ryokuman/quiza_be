import assert from 'node:assert/strict';
import test from 'node:test';
import { SEED_DATA } from '../prisma/seed';

test('seed 객관식 문제는 정답을 선택지 인덱스 문자열로 저장한다', () => {
  const invalidQuestions: string[] = [];

  for (const domain of SEED_DATA) {
    for (const tag of domain.tags) {
      for (const question of tag.questions) {
        if (question.type !== 'multi') continue;

        const answerIndex = Number.parseInt(question.answer, 10);
        const validIndex =
          Number.isInteger(answerIndex) &&
          String(answerIndex) === question.answer &&
          answerIndex >= 0 &&
          answerIndex < question.options.length;

        if (!validIndex) {
          invalidQuestions.push(`${domain.name}/${tag.name}: ${question.content}`);
        }
      }
    }
  }

  assert.deepEqual(invalidQuestions, []);
});

test('seed 데이터에 깨진 대체 문자가 남아 있지 않다', () => {
  const serialized = JSON.stringify(SEED_DATA);

  assert.equal(serialized.includes('�'), false);
});
