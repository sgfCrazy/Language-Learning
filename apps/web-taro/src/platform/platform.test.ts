import { describe, it, expect } from 'vitest';
import { PracticeMode, AuthClient } from '@app/shared';

describe('web-taro platform wiring', () => {
  it('can import shared enums', () => {
    expect(PracticeMode.ZhToEn).toBe('zh_to_en');
    expect(AuthClient.Web).toBe('web');
  });
});
