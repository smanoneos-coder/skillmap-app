export const ROUTES = {
  home: "/",
  skillMaps: "/skillmaps",
  profile: "/profile",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
