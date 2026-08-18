/**
 * 把英文句子拆成有序词块（token），保留标点为独立词块。
 * 纯函数，供后端 seed / 编辑端拆句与前端校验共用。
 */

export interface Token {
  id: string;
  text: string;
  isPunctuation: boolean;
}

const PUNCT = new Set(['.', ',', '!', '?', ';', ':', '"', "'", '(', ')', '[', ']', '{', '}']);

let _seq = 0;
function nextId(): string {
  _seq += 1;
  return `t${_seq.toString(36).padStart(4, '0')}`;
}

/**
 * 拆分句子为词块。缩写（如 "don't", "I'm"）作为单个词块保留。
 */
export function tokenize(sentence: string): Token[] {
  const trimmed = sentence.trim();
  if (!trimmed) return [];

  const tokens: Token[] = [];
  // 正则：匹配缩写词（含 '）或单个标点或普通词
  const re = /[A-Za-z0-9]+(?:'[A-Za-z]+)+|[A-Za-z0-9]+|[^\sA-Za-z0-9]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(trimmed)) !== null) {
    const text = m[0];
    const isPunctuation = PUNCT.has(text);
    tokens.push({ id: nextId(), text, isPunctuation });
  }
  return tokens;
}

/** 还原句子（按词块顺序拼接，词块间按需加空格）。 */
export function detokenize(tokens: Token[]): string {
  let out = '';
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    const prev = tokens[i - 1];
    if (i === 0) {
      out = t.text;
    } else if (t.isPunctuation && prev && !prev.isPunctuation) {
      out += t.text;
    } else {
      out += ' ' + t.text;
    }
  }
  return out;
}
