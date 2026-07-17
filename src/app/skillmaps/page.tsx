import Link from "next/link";

import { SkillMapGenerator } from "@/components/skillmap/skill-map-generator";
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
    <main className="min-h-screen bg-background px-4 py-4 sm:px-5">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1920px] flex-col gap-4">
        <header className="flex shrink-0 flex-col gap-3 rounded-lg border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">SkillMap AI</h1>
            <p className="break-words text-sm text-muted-foreground">{user.email}</p>
          </div>
          <form action="/auth/logout" method="post">
            <Button type="submit" variant="outline">
              ログアウト
            </Button>
          </form>
        </header>

        <section className="min-h-0 flex-1">
          <SkillMapGenerator initialSavedSkillMaps={savedSkillMaps} />
        </section>
      </div>
    </main>
  );
}
