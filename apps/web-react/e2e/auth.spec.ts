import { test, expect } from '@playwright/test';

test('任意格式注册成功且跳回首页，重复注册返回友好提示', async ({ page }) => {
  const email = `auth_${Date.now()}@x`;
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(e.message));

  await page.goto('/login');
  await page.getByText('去注册').click();
  await page.getByPlaceholder('昵称').fill('任意');
  await page.getByPlaceholder('邮箱').fill(email);
  await page.getByPlaceholder('密码').fill('12');
  await page.getByRole('button', { name: '注册' }).click();
  await page.waitForURL('**/');
  await expect(page.getByText('欢迎回来')).toBeVisible({ timeout: 10_000 });

  await page.goto('/login');
  await page.getByText('去注册').click();
  await page.getByPlaceholder('昵称').fill('任意2');
  await page.getByPlaceholder('邮箱').fill(email);
  await page.getByPlaceholder('密码').fill('99');
  await page.getByRole('button', { name: '注册' }).click();
  await expect(page.getByText(/该账号已注册/)).toBeVisible({ timeout: 10_000 });

  expect(errs).toEqual([]);
});