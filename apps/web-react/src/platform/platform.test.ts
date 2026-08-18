import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { getPlatformAdapter } from '@app/shared';
import { createPlatformAdapter } from './adapter.web';

describe('web-react platform adapter', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('creates a web adapter and can round-trip storage', async () => {
    const adapter = createPlatformAdapter();
    expect(adapter.platform).toBe('web');
    await adapter.storage.set('k', { a: 1 });
    expect(await adapter.storage.get('k')).toEqual({ a: 1 });
    await adapter.storage.remove('k');
    expect(await adapter.storage.get('k')).toBeNull();
  });

  it('rejects wx.login as not supported on web', async () => {
    const adapter = createPlatformAdapter();
    await expect(adapter.wxLogin.getCode()).rejects.toThrow();
  });

  it('installs as the singleton used by business code', async () => {
    const { setPlatformAdapter } = await import('@app/shared');
    setPlatformAdapter(createPlatformAdapter());
    expect(getPlatformAdapter().platform).toBe('web');
  });
});