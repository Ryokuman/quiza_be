import assert from 'node:assert/strict';
import test from 'node:test';
import { GoalService } from './goal.service';

function buildGoalService(options: {
  templateMatch?: { roadmapId: string; similarity: number } | null;
  tagIds?: string[];
  embeddingError?: Error;
}) {
  const roadmapCreates: unknown[] = [];
  const copiedTemplates: unknown[] = [];
  const embeddingInputs: string[] = [];

  const domain = { id: 'domain-1', name: '영어' };
  const goal = {
    id: 'goal-1',
    user_id: 'user-1',
    domain_id: domain.id,
    target: '토익 문법 복습',
    level: 'beginner',
    is_active: true,
    created_at: new Date('2026-06-11T00:00:00.000Z'),
    domain,
  };
  const tags = (options.tagIds ?? ['tag-1']).map((id, idx) => ({
    id,
    name: `tag-${idx + 1}`,
  }));

  const prisma = {
    userGoal: {
      findFirst: async () => null,
      create: async () => goal,
    },
    tag: {
      findMany: async () => tags,
    },
    roadmap: {
      create: async ({ data }: { data: unknown }) => {
        roadmapCreates.push(data);
        return { id: 'roadmap-from-tags' };
      },
    },
  };

  const domainService = {
    findOrCreate: async () => domain,
  };

  const roadmapService = {
    findSimilarTemplate: async () => options.templateMatch ?? null,
    copyTemplate: async (templateRoadmapId: string, newGoalId: string) => {
      copiedTemplates.push({ templateRoadmapId, newGoalId });
      return { id: 'copied-roadmap' };
    },
  };

  const geminiService = {
    generateEmbedding: async (text: string) => {
      embeddingInputs.push(text);
      if (options.embeddingError) throw options.embeddingError;
      return [0.1, 0.2, 0.3];
    },
  };

  return {
    service: new GoalService(
      prisma as never,
      domainService as never,
      roadmapService as never,
      geminiService as never,
    ),
    roadmapCreates,
    copiedTemplates,
    embeddingInputs,
  };
}

test('목표 생성 시 유사 템플릿이 있으면 템플릿 로드맵을 복사한다', async () => {
  const { service, copiedTemplates, roadmapCreates, embeddingInputs } = buildGoalService({
    templateMatch: { roadmapId: 'template-roadmap-1', similarity: 0.91 },
  });

  const result = await service.createGoal('user-1', {
    domain: '영어',
    target: '토익 문법 복습',
    level: 'beginner',
    tagIds: ['tag-1', 'tag-2'],
  });

  assert.equal(result.templateMatched, true);
  assert.equal(result.goal.hasRoadmap, true);
  assert.deepEqual(copiedTemplates, [
    { templateRoadmapId: 'template-roadmap-1', newGoalId: 'goal-1' },
  ]);
  assert.equal(roadmapCreates.length, 0);
  assert.equal(embeddingInputs[0], '영어 토익 문법 복습 beginner');
});

test('유사 템플릿이 없으면 선택 태그 기반 로드맵을 생성한다', async () => {
  const { service, copiedTemplates, roadmapCreates } = buildGoalService({
    templateMatch: null,
  });

  const result = await service.createGoal('user-1', {
    domain: '영어',
    target: '토익 문법 복습',
    level: 'beginner',
    tagIds: ['tag-1', 'tag-2'],
  });

  assert.equal(result.templateMatched, false);
  assert.equal(result.goal.hasRoadmap, true);
  assert.equal(copiedTemplates.length, 0);
  assert.equal(roadmapCreates.length, 1);
});

test('템플릿 매칭용 임베딩 생성이 실패해도 선택 태그 기반 로드맵으로 fallback한다', async () => {
  const { service, copiedTemplates, roadmapCreates } = buildGoalService({
    embeddingError: new Error('embedding unavailable'),
  });

  const result = await service.createGoal('user-1', {
    domain: '영어',
    target: '토익 문법 복습',
    level: 'beginner',
    tagIds: ['tag-1'],
  });

  assert.equal(result.templateMatched, false);
  assert.equal(result.goal.hasRoadmap, true);
  assert.equal(copiedTemplates.length, 0);
  assert.equal(roadmapCreates.length, 1);
});

test('유사 템플릿과 선택 태그가 모두 없으면 로드맵 없이 목표만 생성한다', async () => {
  const { service, copiedTemplates, roadmapCreates } = buildGoalService({
    templateMatch: null,
    tagIds: [],
  });

  const result = await service.createGoal('user-1', {
    domain: '영어',
    target: '토익 문법 복습',
    level: 'beginner',
  });

  assert.equal(result.templateMatched, false);
  assert.equal(result.goal.hasRoadmap, false);
  assert.equal(copiedTemplates.length, 0);
  assert.equal(roadmapCreates.length, 0);
});
