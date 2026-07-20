import { test } from '@playwright/test';

test('test', async ({ page }) => {
	await page.goto('http://localhost:8080/');
	await page.waitForTimeout(1000);
	await page.getByRole('button', { name: 'MCP Servers', exact: true }).click();
	await page.waitForTimeout(1500);
	await page.getByRole('button', { name: 'Add New Server' }).click();
	await page.waitForTimeout(1500);
	await page.getByText('Exa Search the web and fetch').click();
	await page.waitForTimeout(1000);
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForTimeout(2000);
	await page.getByRole('button', { name: 'New chat' }).click();
	await page.waitForTimeout(1000);
	await page
		.getByRole('textbox', { name: 'Type a message...' })
		.pressSequentially('Who won last FIFA World Cup?', { delay: 30 });
	await page.waitForTimeout(500);
	await page.getByRole('button', { name: 'Send' }).click();
	await page.waitForTimeout(5000);
	await page.getByRole('button', { name: 'Allow once' }).click();
	await page.waitForTimeout(10000);
});
