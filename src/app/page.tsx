import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

const examples = ["Linux スキルマップ", "AWS SAA", "高校世界史", "高校数学Ⅰ", "Python 初学者"];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-12">
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
                テーマを入力すると、AIが学習ロードマップをJSONで生成し、React Flowのマップとして学習を始められるようにします。
              </p>
            </div>

            <form className="rounded-lg border bg-card p-4 shadow-sm sm:p-5">
              <label className="mb-2 block text-sm font-medium" htmlFor="topic">
                テーマを入力してください
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  id="topic"
                  name="topic"
                  placeholder="Linux スキルマップ"
                  type="text"
                />
                <Button className="h-11 gap-2" type="submit">
                  生成する
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>

          <aside className="rounded-lg border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold">入力例</h2>
            <div className="grid gap-2">
              {examples.map((example) => (
                <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground" key={example}>
                  {example}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
