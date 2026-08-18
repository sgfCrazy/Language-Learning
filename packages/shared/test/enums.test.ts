import { describe, it, expect } from 'vitest';
import { PracticeMode, AuthClient, Rating } from '../src/enum/index.js';

describe('@app/shared enums', () => {
  it('exposes core enums', () => {
    expect(PracticeMode.ZhToEn).toBe('zh_to_en');
    expect(AuthClient.MiniApp).toBe('miniapp');
    expect(Rating.SSS).toBe('SSS');
  });
});
