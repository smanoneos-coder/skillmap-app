# SkillMap AI

AIスキルマップMVPの開発リポジトリです。

## Skill map generator mode

開発中はOpenAI APIを呼び出さず、モック生成を使います。

```env
SKILLMAP_GENERATOR_MODE="mock"
```

公開前にOpenAI APIの実通信を確認する場合だけ、明示的にOpenAIモードへ切り替えます。

```env
SKILLMAP_GENERATOR_MODE="openai"
OPENAI_API_KEY=""
OPENAI_MODEL=""
```

`OPENAI_API_KEY`には`NEXT_PUBLIC_`を付けないでください。
