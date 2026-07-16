import { Sparkles } from "lucide-react";

import { SkillMapExampleList, SkillMapGenerator } from "@/components/skillmap/skill-map-generator";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1 text-sm text-muted-foreground">
                <Sparkles aria-hidden="true" className="h-4 w-4 text-primary" />
                2週間MVP
              </div>
              <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
                SkillMap AI
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                テーマを入力すると、AIが学習ロードマップを生成します。保存、検索、学習状態の管理までこの画面から試せます。
              </p>
            </div>

            <SkillMapGenerator initialSavedSkillMaps={[]} />
          </div>

          <aside className="hidden rounded-lg border bg-card p-5 lg:block">
            <h2 className="mb-4 text-sm font-semibold">入力例</h2>
            <SkillMapExampleList />
          </aside>
        </div>
      </section>
    </main>
  );
}
