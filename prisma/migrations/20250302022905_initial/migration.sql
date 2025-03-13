-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER', 'VIP', 'GUEST');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "wechat_open_id" TEXT,
    "miniapp_open_id" TEXT,
    "remaining_credits" INTEGER NOT NULL DEFAULT 5,
    "is_invited" BOOLEAN NOT NULL DEFAULT false,
    "invited_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "svg_generations" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "input_content" TEXT NOT NULL,
    "style" TEXT,
    "configuration" JSONB,
    "model_names" TEXT[],
    "title" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "share_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "svg_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "svg_versions" (
    "id" SERIAL NOT NULL,
    "generation_id" INTEGER NOT NULL,
    "svg_content" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "is_ai_generated" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "svg_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_wechat_open_id_key" ON "users"("wechat_open_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_miniapp_open_id_key" ON "users"("miniapp_open_id");

-- CreateIndex
CREATE UNIQUE INDEX "svg_generations_share_token_key" ON "svg_generations"("share_token");

-- CreateIndex
CREATE UNIQUE INDEX "svg_versions_generation_id_version_number_key" ON "svg_versions"("generation_id", "version_number");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "svg_generations" ADD CONSTRAINT "svg_generations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "svg_versions" ADD CONSTRAINT "svg_versions_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "svg_generations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
