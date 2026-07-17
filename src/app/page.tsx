import { Sparkles } from "lucide-react";

import { SkillMapGenerator } from "@/components/skillmap/skill-map-generator";

export default function Home() {
  return (
    <main className="min-h-screen bg-background px-4 py-4 sm:px-5">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1920px] flex-col gap-4">
        <header className="flex shrink-0 flex-col gap-3 rounded-lg border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles aria-hidden="true" className="h-4 w-4 text-primary" />
              2週間MVP
            </div>
            <h1 className="text-xl font-semibold">SkillMap AI</h1>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            テーマ入力、保存済みマップ、入力例、スキルマップ、編集Drawerを一画面で扱えます。
          </p>
        </header>

        <section className="min-h-0 flex-1">
          <SkillMapGenerator initialSavedSkillMaps={[]} />
        </section>
      </div>
    </main>
  );
}
