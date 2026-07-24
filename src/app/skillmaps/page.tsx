import Link from "next/link";

import { SkillMapGenerator } from "@/components/skillmap/skill-map-generator";
import { Button } from "@/components/ui/button";
import { getAuthenticatedUserForPage } from "@/lib/auth";
import { listSavedSkillMaps } from "@/lib/skillmap-repository";
import type { SavedSkillMapSummary } from "@/types/skillmap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SkillMapsPage() {
  const user = await getAuthenticatedUserForPage();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <h1 className="mb-2 text-2xl font-semibold">Login required</h1>
          <p className="mb-6 text-sm leading-6 text-muted-foreground">
            Sign in with Google to generate and manage skill maps.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/auth/login">Login with Google</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Home</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  let savedSkillMaps: SavedSkillMapSummary[] = [];
  let savedSkillMapsError: string | null = null;

  try {
    savedSkillMaps = await listSavedSkillMaps(user.id);
  } catch {
    savedSkillMapsError = "Saved maps could not be loaded. Check DATABASE_URL.";
  }

  return (
    <main className="min-h-screen overflow-hidden bg-background px-2 py-2 sm:px-3">
      <div className="mx-auto h-[calc(100vh-1rem)] w-full max-w-[1920px]">
        <SkillMapGenerator
          initialSavedSkillMaps={savedSkillMaps}
          initialSavedSkillMapsError={savedSkillMapsError}
          userEmail={user.email ?? null}
        />
      </div>
    </main>
  );
}
