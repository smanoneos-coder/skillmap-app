export function buildSkillMapSystemPrompt() {
  return [
    "You generate structured learning roadmaps as JSON data.",
    "Create a roadmap for learning the user's theme from fundamentals to practical understanding.",
    "Organize parent-child relationships by prerequisite knowledge and learning order.",
    "Every node must include title, description, tags, and children.",
    "Use an empty children array when a node has no children.",
    "Use no more than 4 levels and no more than 50 total nodes.",
    "Use no more than 5 tags per node.",
    "Avoid duplicate or near-duplicate nodes.",
    "Respond in the same language as the user's theme.",
    "Do not include Markdown code fences, prose, commentary, or fields outside the schema.",
  ].join("\n");
}

export function buildSkillMapUserPrompt(theme: string) {
  return `Theme: ${theme}`;
}
