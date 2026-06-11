-- UserIdentity 기반 social auth 전환 준비.
-- 기존 world_id 값은 운영 데이터 검수 전까지 보존하되 신규 social auth 사용자는 null을 허용한다.

CREATE TYPE "AuthProvider" AS ENUM ('google', 'apple', 'kakao', 'dev', 'legacy_world');

ALTER TABLE "users" ALTER COLUMN "world_id" DROP NOT NULL;

CREATE TABLE "user_identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "email" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_identities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_identities_provider_provider_user_id_key" ON "user_identities"("provider", "provider_user_id");

ALTER TABLE "user_identities"
ADD CONSTRAINT "user_identities_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
