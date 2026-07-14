-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('NOT_STARTED', 'LEARNING', 'COMPLETED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "avatar_url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_maps" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nodes" (
    "id" UUID NOT NULL,
    "skillMapId" UUID NOT NULL,
    "parentId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_node_progresses" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_node_progresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "skill_maps_userId_idx" ON "skill_maps"("userId");

-- CreateIndex
CREATE INDEX "skill_maps_userId_createdAt_idx" ON "skill_maps"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "nodes_skillMapId_idx" ON "nodes"("skillMapId");

-- CreateIndex
CREATE INDEX "nodes_parentId_idx" ON "nodes"("parentId");

-- CreateIndex
CREATE INDEX "nodes_skillMapId_parentId_sort_order_idx" ON "nodes"("skillMapId", "parentId", "sort_order");

-- CreateIndex
CREATE INDEX "user_node_progresses_userId_idx" ON "user_node_progresses"("userId");

-- CreateIndex
CREATE INDEX "user_node_progresses_nodeId_idx" ON "user_node_progresses"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "user_node_progresses_userId_nodeId_key" ON "user_node_progresses"("userId", "nodeId");

-- AddForeignKey
ALTER TABLE "skill_maps" ADD CONSTRAINT "skill_maps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_skillMapId_fkey" FOREIGN KEY ("skillMapId") REFERENCES "skill_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_node_progresses" ADD CONSTRAINT "user_node_progresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_node_progresses" ADD CONSTRAINT "user_node_progresses_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- EnableRowLevelSecurity
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "skill_maps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "nodes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_node_progresses" ENABLE ROW LEVEL SECURITY;
