/**
 * E2E test data setup script.
 * Creates a roadmap + checkpoint for the test user so sessions/answers can be tested.
 *
 * Usage: node e2e/setup-test-data.js
 * Output: Last line is JSON with test IDs
 */

require('dotenv/config');
const { PrismaClient } = require('../dist/generated/prisma/client.js');
const { PrismaPg } = require('@prisma/adapter-pg');

const BASE = 'http://localhost:8080';

async function api(method, path, body, cookieHeader) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (cookieHeader) opts.headers.Cookie = cookieHeader;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  return {
    status: res.status,
    headers: res.headers,
    body: text ? JSON.parse(text) : null,
  };
}

async function main() {
  // 1. Dev login
  const loginRes = await fetch(`${BASE}/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ world_id: 'test-user-e2e' }),
  });
  const cookies = loginRes.headers.getSetCookie?.() ?? [];
  const cookie = cookies.find((c) => c.startsWith('access_token='));
  if (!cookie) throw new Error('No access_token cookie');
  const ck = cookie.split(';')[0];
  console.error('[setup] Logged in');

  // 2. Get domains
  const { body: domains } = await api('GET', '/domains', null, ck);
  const toeic = domains.find((d) => d.name === '토익');
  if (!toeic) throw new Error('토익 domain not found');

  // 3. Get tags
  const { body: tags } = await api('GET', `/domains/${toeic.id}/tags`, null, ck);
  const grammarTag = tags.find((t) => t.name === 'grammar');
  if (!grammarTag) throw new Error('grammar tag not found');

  // 4. Deactivate existing 토익 goals
  const { body: goals } = await api('GET', '/goals', null, ck);
  for (const g of goals) {
    if (g.domain.name === '토익') {
      await api('PATCH', `/goals/${g.id}/deactivate`, null, ck);
    }
  }

  // 5. Create goal
  const { body: goalResult, status } = await api('POST', '/goals', {
    domain: '토익',
    target: 'TOEIC 800',
    level: 'intermediate',
  }, ck);
  if (status !== 201) throw new Error(`Goal create failed: ${JSON.stringify(goalResult)}`);
  const goalId = goalResult.goal.id;
  console.error('[setup] Goal created:', goalId);

  // 6. Create roadmap + checkpoint via Prisma
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    // Delete existing roadmap for this goal if any
    const existing = await prisma.roadmap.findUnique({ where: { goal_id: goalId } });
    if (existing) {
      await prisma.checkpoint.deleteMany({ where: { roadmap_id: existing.id } });
      await prisma.roadmap.delete({ where: { id: existing.id } });
    }

    const roadmap = await prisma.roadmap.create({
      data: {
        goal_id: goalId,
        title: 'TOEIC Grammar Roadmap',
        is_template: false,
        checkpoints: {
          create: [
            {
              title: 'Basic Grammar',
              description: 'Fundamental grammar rules',
              tag_id: grammarTag.id,
              difficulty: 1,
              order: 1,
              status: 'not_started',
            },
            {
              title: 'Intermediate Grammar',
              description: 'Advanced grammar patterns',
              tag_id: grammarTag.id,
              difficulty: 2,
              order: 2,
              status: 'not_started',
            },
          ],
        },
      },
      include: { checkpoints: { orderBy: { order: 'asc' } } },
    });

    console.error('[setup] Roadmap created:', roadmap.id);
    console.error('[setup] Checkpoint:', roadmap.checkpoints[0].id);

    // Output JSON to stdout (last line)
    console.log(JSON.stringify({
      goalId,
      roadmapId: roadmap.id,
      checkpointId: roadmap.checkpoints[0].id,
      domainId: toeic.id,
      grammarTagId: grammarTag.id,
    }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('[setup] Error:', e.message);
  process.exit(1);
});
