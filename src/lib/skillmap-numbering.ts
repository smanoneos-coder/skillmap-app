export function getSkillMapNodeNumber(path: string) {
  if (!path) {
    return "";
  }

  return path
    .split("-")
    .map((part) => Number.parseInt(part, 10))
    .join(".");
}
