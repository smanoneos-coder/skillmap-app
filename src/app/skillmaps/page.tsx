import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getAuthenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const examples = ["Linux スキルマップ", "AWS SAA", "高校世界史", "高校数学Ⅰ", "Python 初学者"];

export default async function SkillMapsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground">
          <h1 className="mb-2 text-2xl font-semibold">ログインが必要です</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            マイマップを見るにはGoogleアカウントでログインしてください。
          </p>
          <Button asChild>
            <Link href="/auth/login">Googleでログイン</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-10">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">マイマップ</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <form action="/auth/logout" method="post">
            <Button type="submit" variant="outline">
              ログアウト
            </Button>
          </form>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-1 text-sm text-muted-foreground">
                <Sparkles aria-hidden="true" className="h-4 w-4 text-primary" />
                SkillMap AI
              </div>
              <h2 className="text-3xl font-semibold tracking-normal text-foreground">
                テーマからスキルマップを生成
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                学びたいテーマを入力してください。次のステップでAI生成APIにつなぎ、生成結果を保存できるようにします。
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
        </section>

        <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
          生成済みマップはここに表示されます。
        </div>
      </div>
    </main>
  );
}
