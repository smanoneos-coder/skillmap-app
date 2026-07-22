import { Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getAuthenticatedUserForPage } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getAuthenticatedUserForPage();

  if (user) {
    redirect("/skillmaps");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <section className="w-full max-w-xl rounded-lg border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
        <div className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles aria-hidden="true" className="h-4 w-4 text-primary" />
          2週間MVP
        </div>
        <h1 className="text-3xl font-semibold tracking-normal">SkillMap AI</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          テーマを入力してAIスキルマップを生成するには、Googleアカウントでログインしてください。
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/auth/login">Googleでログイン</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/skillmaps">マップ画面へ</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
