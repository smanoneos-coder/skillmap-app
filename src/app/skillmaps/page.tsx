import { Sparkles } from "lucide-react";
import Link from "next/link";

import { SkillMapExampleList, SkillMapGenerator } from "@/components/skillmap/skill-map-generator";
import { Button } from "@/components/ui/button";
import { getAuthenticatedUserForPage } from "@/lib/auth";
import { listSavedSkillMaps } from "@/lib/skillmap-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SkillMapsPage() {
  const user = await getAuthenticatedUserForPage();

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

  const savedSkillMaps = await listSavedSkillMaps(user.id);

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-5xl space-y-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">マイマップ</h1>
            <p className="break-words text-sm text-muted-foreground">{user.email}</p>
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
                学びたいテーマを入力してください。生成したスキルマップは保存して、あとから再表示できます。
              </p>
            </div>

            <SkillMapGenerator initialSavedSkillMaps={savedSkillMaps} />
          </div>

          <aside className="hidden rounded-lg border bg-card p-5 lg:block">
            <h2 className="mb-4 text-sm font-semibold">入力例</h2>
            <SkillMapExampleList />
          </aside>
        </section>
      </div>
    </main>
  );
}
