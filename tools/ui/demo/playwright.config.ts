import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: '.',
	testMatch: ['**/*.demo.ts'],
	outputDir: 'videos',
	timeout: 30000,
	expect: {
		timeout: 5000
	},
	fullyParallel: false,
	retries: 0,
	reporter: 'line',
	use: {
		baseURL: 'http://localhost:8080',
		trace: 'on-first-retry',
		video: 'on',
		viewport: { width: 1920, height: 1080 },
		deviceScaleFactor: 2
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
