import type { PlatformAdapter } from '@app/shared';
// #ifdef H5
import { createPlatformAdapter as createWeb } from './adapter.web';
// #endif
// #ifdef WEAPP
import { createPlatformAdapter as createMiniapp } from './adapter.miniapp';
// #endif

/**
 * 创建当前平台的适配器。Taro 编译期 #ifdef 只保留对应端的实现；
 * 对 tsc 而言两条 import 都可见（避免重复标识符），运行期仅一端生效。
 */
export function createPlatformAdapter(): PlatformAdapter {
  // #ifdef H5
  return createWeb();
  // #endif
  // #ifdef WEAPP
  return createMiniapp();
  // #endif
}
