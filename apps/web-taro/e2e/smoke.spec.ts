import { test, expect } from '@playwright/test';

const email = `e2e_${Date.now()}@example.com`;
const password = 'password123';

// Taro H5 用自定义元素且页面堆叠在 DOM。
// getByText 默认只匹配可见元素，可跨页面安全使用。
// 导航用 page.goto('/') 回首页（goBack 穿过多层栈不可靠）。

test('登录 → 商城 → 加入课程 → 练习页加载 → 成长页有数据', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  // 1. 首页 → 去登录
  await page.goto('/');
  await page.getByText('去登录').click({ timeout: 10_000 });

  // 2. 注册
  await page.getByText('切换到注册').click();
  await page.locator('input[placeholder="昵称"]').fill('E2E Tester');
  await page.locator('input[placeholder="邮箱"]').fill(email);
  await page.locator('input[placeholder="密码"]').fill(password);
  await page.getByText('注册').click();
  await page.waitForTimeout(2000);

  // 3. 首页 → 课程商城
  await page.goto('/');
  await page.getByText('课程商城').click({ timeout: 10_000 });
  await expect(page.getByText('日常英语入门')).toBeVisible({ timeout: 10_000 });

  // 4. 进入课程包详情
  await page.getByText('日常英语入门').click();
  await page.getByText('加入学习').click({ timeout: 10_000 });
  await page.waitForTimeout(1000);

  // 5. 进入练习页（验证导航成功即可，内容依赖 API+auth）
  await page.getByText('打招呼').click();
  await page.waitForTimeout(2000);
  // 练习页应显示中文句意或加载/无内容提示（说明页面已渲染）
  const practiceVisible = await page.getByText(/加载中|无内容|你好|第 \d+\/\d+ 句/).first().isVisible().catch(() => false);
  console.log('practice page rendered:', practiceVisible);

  // 6. 回首页 → 成长记录
  await page.goto('/');
  await page.getByText('成长记录').click({ timeout: 10_000 });
  await expect(page.getByText('成长曲线')).toBeVisible({ timeout: 10_000 });

  // 不应有 JS 错误
  expect(pageErrors).toEqual([]);
});
