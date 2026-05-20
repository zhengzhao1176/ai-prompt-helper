import Fuse from "fuse.js";
import { pinyin } from "pinyin-pro";

export type Prompt = {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  prompt: string;
  note?: string;
};

export const ALL_CATEGORY = "全部";

// Words inside the same group are treated as interchangeable when searching,
// so typing "女生" still surfaces entries tagged with "少女" / "女孩".
const SYNONYM_GROUPS: string[][] = [
  ["女孩", "女生", "少女", "女性", "女人", "妹子"],
  ["男孩", "男生", "少年", "男性", "男人"],
  ["猫", "猫咪", "小猫", "喵"],
  ["狗", "狗狗", "小狗", "犬"],
  ["夜晚", "夜景", "晚上", "黑夜"],
  ["温暖", "暖", "温馨", "暖意"],
  ["梦幻", "梦境", "虚幻", "如梦"],
  ["可爱", "萌", "萌系", "卡哇伊"],
  ["古风", "国风", "中国风", "古典"],
  ["科幻", "未来", "赛博朋克", "赛博"],
  ["森林", "树林", "丛林", "森系"],
  ["光线", "灯光", "光照", "打光"],
  ["神秘", "诡异", "悬疑"],
  ["孤独", "寂寞", "孤寂"],
];

const synonymMap = new Map<string, string[]>();
for (const group of SYNONYM_GROUPS) {
  for (const word of group) {
    synonymMap.set(word, group);
  }
}

function expandToken(token: string): string[] {
  return synonymMap.get(token) ?? [token];
}

// "森林" -> "senlin" so a pinyin query can match a Chinese keyword.
function flatPinyin(text: string): string {
  return pinyin(text, {
    toneType: "none",
    type: "array",
    nonZh: "consecutive",
  })
    .join("")
    .toLowerCase();
}

// "森林" -> "sl" so an initials query ("sl") can match too.
function initialPinyin(text: string): string {
  return pinyin(text, {
    pattern: "first",
    toneType: "none",
    type: "array",
    nonZh: "consecutive",
  })
    .join("")
    .toLowerCase();
}

type IndexedPrompt = Prompt & {
  terms: string[];
  pinyins: string[];
  initials: string[];
  promptText: string;
  promptPinyin: string;
  haystack: string;
};

// Exact / prefix / substring score for one token against one entry (0 = miss).
function directScore(token: string, entry: IndexedPrompt): number {
  let best = 0;
  for (const term of entry.terms) {
    if (term === token) return 1;
    if (term.startsWith(token)) best = Math.max(best, 0.88);
    else if (term.includes(token)) best = Math.max(best, 0.72);
  }
  for (const py of entry.pinyins) {
    if (py === token) best = Math.max(best, 0.96);
    else if (py.startsWith(token)) best = Math.max(best, 0.82);
    else if (py.includes(token)) best = Math.max(best, 0.64);
  }
  for (const ini of entry.initials) {
    if (ini === token) best = Math.max(best, 0.6);
  }
  // 命中提示词正文：弱信号，排在标题 / 关键词匹配之后
  if (entry.promptText.includes(token)) best = Math.max(best, 0.5);
  else if (entry.promptPinyin.includes(token)) best = Math.max(best, 0.45);
  return best;
}

export type SearchEngine = {
  search: (query: string, category?: string) => Prompt[];
  getByCategory: (category: string) => Prompt[];
  getFeatured: () => Prompt[];
  totalCount: () => number;
};

// Builds a search engine over a set of prompts (loaded from SQLite).
export function createSearchEngine(prompts: Prompt[]): SearchEngine {
  const indexed: IndexedPrompt[] = prompts.map((entry) => {
    const terms = [entry.title, ...entry.keywords].map((word) =>
      word.toLowerCase(),
    );
    const pinyins = terms.map(flatPinyin);
    const initials = terms.map(initialPinyin);
    const promptText = entry.prompt.toLowerCase();
    const promptPinyin = flatPinyin(entry.prompt);
    return {
      ...entry,
      terms,
      pinyins,
      initials,
      promptText,
      promptPinyin,
      haystack: [...terms, ...pinyins, ...initials, promptText, promptPinyin].join(
        " ",
      ),
    };
  });

  const byId = new Map(indexed.map((entry) => [entry.id, entry]));

  // Fuse is only a typo-tolerance fallback; the tight threshold keeps it strict.
  const fuse = new Fuse(indexed, {
    keys: ["haystack"],
    threshold: 0.3,
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: 2,
  });

  function search(query: string, category: string = ALL_CATEGORY): Prompt[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    const tokens = normalized.split(/\s+/).filter(Boolean);
    const totalScore = new Map<string, number>();
    const hitCount = new Map<string, number>();

    for (const token of tokens) {
      const bestForToken = new Map<string, number>();

      for (const variant of expandToken(token)) {
        for (const entry of indexed) {
          const score = directScore(variant, entry);
          if (score > 0) {
            bestForToken.set(
              entry.id,
              Math.max(bestForToken.get(entry.id) ?? 0, score),
            );
          }
        }
      }

      if (token.length >= 2) {
        for (const result of fuse.search(token)) {
          if (bestForToken.has(result.item.id)) continue;
          const fuzzy = (1 - (result.score ?? 1)) * 0.5;
          if (fuzzy > 0) bestForToken.set(result.item.id, fuzzy);
        }
      }

      for (const [id, score] of bestForToken) {
        totalScore.set(id, (totalScore.get(id) ?? 0) + score);
        hitCount.set(id, (hitCount.get(id) ?? 0) + 1);
      }
    }

    const ranked = [...totalScore.entries()]
      .map(([id, score]) => {
        const matchedAll = hitCount.get(id) === tokens.length;
        const finalScore = matchedAll && tokens.length > 1 ? score * 2 : score;
        return { id, score: finalScore };
      })
      .sort((a, b) => b.score - a.score);

    let results: Prompt[] = ranked
      .map((item) => byId.get(item.id))
      .filter((entry): entry is IndexedPrompt => Boolean(entry));

    if (category !== ALL_CATEGORY) {
      results = results.filter((entry) => entry.category === category);
    }

    return results.slice(0, 48);
  }

  function getByCategory(category: string): Prompt[] {
    if (category === ALL_CATEGORY) return prompts;
    return prompts.filter((entry) => entry.category === category);
  }

  // A spread of entries (2 per category) shown before the user searches.
  function getFeatured(): Prompt[] {
    const order: string[] = [];
    const seen = new Set<string>();
    for (const entry of prompts) {
      if (!seen.has(entry.category)) {
        seen.add(entry.category);
        order.push(entry.category);
      }
    }
    const featured: Prompt[] = [];
    for (const category of order) {
      featured.push(
        ...prompts.filter((entry) => entry.category === category).slice(0, 2),
      );
    }
    return featured;
  }

  return {
    search,
    getByCategory,
    getFeatured,
    totalCount: () => prompts.length,
  };
}
