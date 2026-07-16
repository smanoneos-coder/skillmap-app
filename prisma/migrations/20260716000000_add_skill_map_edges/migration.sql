CREATE TABLE "skill_map_edges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "skillMapId" UUID NOT NULL,
    "nodeAId" UUID NOT NULL,
    "nodeBId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_map_edges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "skill_map_edges_skillMapId_nodeAId_nodeBId_key" ON "skill_map_edges"("skillMapId", "nodeAId", "nodeBId");
CREATE INDEX "skill_map_edges_skillMapId_idx" ON "skill_map_edges"("skillMapId");
CREATE INDEX "skill_map_edges_nodeAId_idx" ON "skill_map_edges"("nodeAId");
CREATE INDEX "skill_map_edges_nodeBId_idx" ON "skill_map_edges"("nodeBId");

ALTER TABLE "skill_map_edges" ADD CONSTRAINT "skill_map_edges_skillMapId_fkey" FOREIGN KEY ("skillMapId") REFERENCES "skill_maps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skill_map_edges" ADD CONSTRAINT "skill_map_edges_nodeAId_fkey" FOREIGN KEY ("nodeAId") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skill_map_edges" ADD CONSTRAINT "skill_map_edges_nodeBId_fkey" FOREIGN KEY ("nodeBId") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "skill_map_edges" ENABLE ROW LEVEL SECURITY;
