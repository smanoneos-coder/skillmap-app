import type { GeneratedSkillMap } from "@/lib/skillmap-schema";

const MAX_TITLE_LENGTH = 50;
const MAX_TAG_LENGTH = 30;

export async function generateMockSkillMap(theme: string): Promise<GeneratedSkillMap> {
  const title = limitText(theme.trim(), MAX_TITLE_LENGTH);
  const themeTag = limitText(title, MAX_TAG_LENGTH);

  return {
    title,
    description: `${title}を基礎から段階的に学ぶためのスキルマップです。`,
    tags: [themeTag, "学習ロードマップ"],
    children: [
      {
        title: "基礎知識",
        description: `${title}に取り組む前に、全体像と基本概念を理解します。`,
        tags: ["基礎"],
        children: [
          {
            title: "全体像を理解する",
            description: `${title}で扱う主要な考え方、用途、学習範囲を確認します。`,
            tags: ["入門"],
            children: [],
          },
          {
            title: "学習環境を準備する",
            description: `${title}を継続して学ぶために必要なツールや教材を用意します。`,
            tags: ["準備"],
            children: [],
          },
        ],
      },
      {
        title: "基本操作",
        description: `${title}の基本的な使い方や頻出パターンを学びます。`,
        tags: ["基本"],
        children: [
          {
            title: "重要用語を覚える",
            description: `${title}を理解するためによく使う用語と意味を整理します。`,
            tags: ["用語"],
            children: [],
          },
          {
            title: "小さく練習する",
            description: `${title}の基礎を短い演習で確認し、手を動かして定着させます。`,
            tags: ["演習"],
            children: [],
          },
        ],
      },
      {
        title: "実践と振り返り",
        description: `${title}を実際の課題に近い形で使い、理解できた点と不足点を確認します。`,
        tags: ["実践"],
        children: [],
      },
    ],
  };
}

function limitText(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}
