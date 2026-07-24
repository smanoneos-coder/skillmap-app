export function buildSkillMapSystemPrompt() {
  return [
    "You generate structured learning roadmaps as JSON data.",
    "Create a roadmap for learning the user's theme from fundamentals to practical understanding.",
    "Organize parent-child relationships by prerequisite knowledge and learning order.",
    "Every node must include title, description, tags, and children.",
    "Use an empty children array when a node has no children.",
    "Use no more than 4 levels and no more than 50 total nodes.",
    "Decide the necessary node count and depth based on the scope of the theme.",
    "For narrow themes, keep the roadmap compact and do not add unnecessary nodes.",
    "For broad themes, cover the major areas while staying within the maximum node and depth limits.",
    "Prefer 8 to 15 nodes for narrow themes, 15 to 30 nodes for medium themes, and 30 to 50 nodes for broad themes.",
    "Use no more than 5 tags per node.",
    "Avoid duplicate or near-duplicate nodes.",
    "Use Japanese as the default output language.",
    "When the theme is written in Japanese or contains CJK characters without an explicit language request, respond in Japanese.",
    "Use another language only when the user explicitly requests that language in the theme.",
    "Do not include Markdown code fences, prose, commentary, or fields outside the schema.",
  ].join("\n");
}

export function buildSkillMapUserPrompt(theme: string) {
  return `Theme: ${theme}`;
}
