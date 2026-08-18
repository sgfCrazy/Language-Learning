import { describe, it, expect } from 'vitest';
import { tokenize, detokenize } from '../src/tokenize.js';

describe('tokenize', () => {
  it('拆解普通句子并保留标点', () => {
    const t = tokenize('I like to eat apples.');
    expect(t.map((x) => x.text)).toEqual(['I', 'like', 'to', 'eat', 'apples', '.']);
    expect(t[5].isPunctuation).toBe(true);
  });

  it('保留缩写为单个词块', () => {
    const t = tokenize("I don't know.");
    expect(t.map((x) => x.text)).toEqual(['I', "don't", 'know', '.']);
  });

  it('可还原原句', () => {
    const s = "I don't like apples.";
    expect(detokenize(tokenize(s))).toBe(s);
  });

  it('空串返回空数组', () => {
    expect(tokenize('')).toEqual([]);
  });
});
