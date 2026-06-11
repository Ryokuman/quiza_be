import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthService } from './auth.service';

type Row = Record<string, any>;

function buildService(
  verifiedIdentity = {
    provider: 'google' as const,
    providerUserId: 'google-user-1',
    email: 'learner@example.com',
    emailVerified: true,
    displayName: 'Learner',
  },
) {
  const users: Row[] = [];
  const identities: Row[] = [];
  const signedPayloads: Row[] = [];

  const prisma = {
    user: {
      create: async ({ data, include }: { data: Row; include?: Row }) => {
        const user = {
          id: `user-${users.length + 1}`,
          world_id: data.world_id ?? null,
          nickname: data.nickname,
          is_premium: false,
          created_at: new Date('2026-06-11T00:00:00.000Z'),
          updated_at: new Date('2026-06-11T00:00:00.000Z'),
        };
        users.push(user);

        if (data.identities?.create) {
          identities.push({
            id: `identity-${identities.length + 1}`,
            user_id: user.id,
            ...data.identities.create,
            created_at: new Date('2026-06-11T00:00:00.000Z'),
            updated_at: new Date('2026-06-11T00:00:00.000Z'),
          });
        }

        return include?.identities
          ? { ...user, identities: identities.filter((identity) => identity.user_id === user.id) }
          : user;
      },
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
      findUnique: async ({ where, include }: { where: Row; include?: Row }) => {
        const user = users.find((row) => row.id === where.id) ?? null;
        if (!user) return null;
        return include?.identities
          ? { ...user, identities: identities.filter((identity) => identity.user_id === user.id) }
          : user;
      },
    },
    userIdentity: {
      findUnique: async ({ where, include }: { where: Row; include?: Row }) => {
        const key = where.provider_provider_user_id;
        const identity = identities.find(
          (row) => row.provider === key.provider && row.provider_user_id === key.provider_user_id,
        );
        if (!identity) return null;

        const user = users.find((row) => row.id === identity.user_id);
        return include?.user ? { ...identity, user } : identity;
      },
    },
  };

  const jwt = {
    signAsync: async (payload: Row) => {
      signedPayloads.push(payload);
      return `token:${payload.sub}`;
    },
  };

  const verifier = {
    verify: async () => verifiedIdentity,
  };

  return {
    service: new AuthService(prisma as never, jwt as never, {} as never, verifier as never),
    users,
    identities,
    signedPayloads,
  };
}

test('social login은 provider identity 기준으로 신규 사용자를 만들고 JWT를 발급한다', async () => {
  const { service, users, identities, signedPayloads } = buildService();

  const result = await service.socialLogin({ provider: 'google', token: 'valid-token' });

  assert.deepEqual(result, { access_token: 'token:user-1' });
  assert.equal(users.length, 1);
  assert.equal(users[0].world_id, null);
  assert.equal(users[0].nickname, 'Learner');
  assert.deepEqual(identities[0], {
    id: 'identity-1',
    user_id: 'user-1',
    provider: 'google',
    provider_user_id: 'google-user-1',
    email: 'learner@example.com',
    email_verified: true,
    display_name: 'Learner',
    created_at: new Date('2026-06-11T00:00:00.000Z'),
    updated_at: new Date('2026-06-11T00:00:00.000Z'),
  });
  assert.deepEqual(signedPayloads[0], {
    sub: 'user-1',
    provider: 'google',
    provider_user_id: 'google-user-1',
  });
});

test('social login은 기존 provider identity가 있으면 같은 사용자를 재사용한다', async () => {
  const { service, users, identities } = buildService();

  await service.socialLogin({ provider: 'google', token: 'valid-token' });
  const second = await service.socialLogin({ provider: 'google', token: 'valid-token' });

  assert.deepEqual(second, { access_token: 'token:user-1' });
  assert.equal(users.length, 1);
  assert.equal(identities.length, 1);
});

for (const provider of ['google', 'apple', 'kakao'] as const) {
  test(`social login은 ${provider} provider identity를 JWT에 반영한다`, async () => {
    const { service, signedPayloads } = buildService({
      provider,
      providerUserId: `${provider}-user-1`,
      email: `${provider}@example.com`,
      emailVerified: true,
      displayName: provider,
    });

    await service.socialLogin({ provider, token: 'valid-token' });

    assert.deepEqual(signedPayloads[0], {
      sub: 'user-1',
      provider,
      provider_user_id: `${provider}-user-1`,
    });
  });
}

test('social login은 요청 provider와 검증 provider가 다르면 거부한다', async () => {
  const { service } = buildService({
    provider: 'apple',
    providerUserId: 'apple-user-1',
    email: 'apple@example.com',
    emailVerified: true,
    displayName: 'Apple User',
  });

  await assert.rejects(
    () => service.socialLogin({ provider: 'google', token: 'valid-token' }),
    /provider mismatch/,
  );
});
