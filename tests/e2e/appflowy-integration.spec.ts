import { test, expect, Page } from '@playwright/test';

/**
 * AppFlowy Cloud Integration Tests for CCF-planner
 * Tests the integration between AppFlowy Cloud and CCF sermon planning features
 */

const APPFLOWY_URL = process.env.APPFLOWY_URL || 'http://localhost:6780';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password';

test.describe('AppFlowy Cloud Integration', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should access AppFlowy admin console', async () => {
    await page.goto(`${APPFLOWY_URL}/console`);
    
    // Check if login page loads
    await expect(page).toHaveTitle(/AppFlowy Cloud/);
    
    // Fill login form
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    
    // Click sign in
    await page.click('button:has-text("Sign In")');
    
    // Wait for navigation
    await page.waitForURL('**/home');
    
    // Verify logged in
    await expect(page.locator('text=admin@example.com')).toBeVisible();
  });

  test('should create a new user for CCF planner', async () => {
    // Login as admin
    await page.goto(`${APPFLOWY_URL}/console`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign In")');
    
    // Navigate to admin page
    await page.click('text=Admin');
    
    // Create new user
    const testUser = {
      email: 'pastor@ccf.org',
      password: 'SermonPlanner123',
      name: 'Pastor John'
    };
    
    // Fill user creation form (adjust selectors based on actual UI)
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="name"]', testUser.name);
    
    await page.click('button:has-text("Create User")');
    
    // Verify user created
    await expect(page.locator(`text=${testUser.email}`)).toBeVisible();
  });

  test('should create a workspace for sermon planning', async () => {
    // Login as user
    await page.goto(`${APPFLOWY_URL}/console`);
    await page.fill('input[type="email"]', 'pastor@ccf.org');
    await page.fill('input[type="password"]', 'SermonPlanner123');
    await page.click('button:has-text("Sign In")');
    
    // Create workspace
    await page.click('button:has-text("Create Workspace")');
    await page.fill('input[name="workspace-name"]', 'CCF Sermon Planning');
    await page.click('button:has-text("Create")');
    
    // Verify workspace created
    await expect(page.locator('text=CCF Sermon Planning')).toBeVisible();
  });

  test('should integrate document creation with CCF planner', async () => {
    // This test would integrate with CCF-planner API
    // Create a sermon document in AppFlowy
    await page.goto(`${APPFLOWY_URL}`);
    
    // Create new document
    await page.click('button:has-text("New Document")');
    
    // Fill sermon template
    await page.fill('[contenteditable]', `
      Sermon Title: Walking in Faith
      Date: ${new Date().toLocaleDateString()}
      Scripture: Hebrews 11:1-6
      
      Main Points:
      1. Definition of Faith
      2. Examples of Faith
      3. Living by Faith
      
      Notes:
      - Faith is the substance of things hoped for
      - Without faith it is impossible to please God
    `);
    
    // Save document
    await page.keyboard.press('Control+S');
    
    // Verify saved
    await expect(page.locator('text=Document saved')).toBeVisible();
  });

  test('should test collaboration features', async () => {
    // Create two users and test collaboration
    const users = [
      { email: 'user1@ccf.org', role: 'Pastor' },
      { email: 'user2@ccf.org', role: 'Worship Leader' }
    ];
    
    // Login as admin and invite users
    await page.goto(`${APPFLOWY_URL}/console`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button:has-text("Sign In")');
    
    // Navigate to invite page
    await page.click('text=Invite');
    
    // Invite user2 to workspace
    await page.fill('input[name="invite-email"]', users[1].email);
    await page.selectOption('select[name="role"]', users[1].role);
    await page.click('button:has-text("Send Invite")');
    
    // Verify invitation sent
    await expect(page.locator('text=Invitation sent')).toBeVisible();
  });

  test('should sync sermon data between AppFlowy and CCF', async () => {
    // This would test the API integration
    const sermonData = {
      title: 'Test Sermon',
      date: '2025-01-01',
      speaker: 'Pastor John',
      series: 'Faith Series'
    };
    
    // Make API call to CCF backend
    const response = await page.request.post('http://localhost:6781/api/sermons', {
      data: sermonData
    });
    
    expect(response.status()).toBe(201);
    
    // Verify sermon appears in AppFlowy
    await page.goto(`${APPFLOWY_URL}`);
    await expect(page.locator(`text=${sermonData.title}`)).toBeVisible();
  });

  test('should export sermon document as PDF', async () => {
    await page.goto(`${APPFLOWY_URL}`);
    
    // Open a sermon document
    await page.click('text=Walking in Faith');
    
    // Click export button
    await page.click('button[aria-label="Export"]');
    
    // Select PDF format
    await page.click('text=Export as PDF');
    
    // Start waiting for download
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download")');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('should test real-time collaboration', async ({ browser }) => {
    // Open two browser contexts for different users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // Both users open same document
    await page1.goto(`${APPFLOWY_URL}/document/shared-sermon`);
    await page2.goto(`${APPFLOWY_URL}/document/shared-sermon`);
    
    // User 1 types
    await page1.fill('[contenteditable]', 'User 1 is typing...');
    
    // User 2 should see the changes
    await expect(page2.locator('text=User 1 is typing...')).toBeVisible();
    
    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('should handle offline mode', async () => {
    await page.goto(`${APPFLOWY_URL}`);
    
    // Go offline
    await page.context().setOffline(true);
    
    // Try to create a document
    await page.click('button:has-text("New Document")');
    await page.fill('[contenteditable]', 'Offline sermon notes');
    
    // Go back online
    await page.context().setOffline(false);
    
    // Verify sync happens
    await expect(page.locator('text=Synced')).toBeVisible();
  });

  test('should test search functionality', async () => {
    await page.goto(`${APPFLOWY_URL}`);
    
    // Search for sermon
    await page.fill('input[placeholder="Search"]', 'faith');
    await page.keyboard.press('Enter');
    
    // Verify search results
    await expect(page.locator('text=Walking in Faith')).toBeVisible();
    await expect(page.locator('.search-results')).toContainText('1 result found');
  });
});

test.describe('JinaAI Integration', () => {
  test('should enhance sermon with AI', async ({ page }) => {
    // Mock JinaAI response
    await page.route('**/api/ai/enhance', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          enhanced: 'Enhanced sermon content with additional insights...'
        })
      });
    });
    
    await page.goto(`${APPFLOWY_URL}`);
    
    // Select text to enhance
    await page.click('[contenteditable]');
    await page.keyboard.type('Basic sermon outline');
    await page.keyboard.press('Control+A');
    
    // Click AI enhance button
    await page.click('button[aria-label="AI Enhance"]');
    
    // Verify enhancement
    await expect(page.locator('text=Enhanced sermon content')).toBeVisible();
  });

  test('should generate sermon outline with AI', async ({ page }) => {
    await page.goto(`${APPFLOWY_URL}`);
    
    // Open AI assistant
    await page.click('button[aria-label="AI Assistant"]');
    
    // Input sermon topic
    await page.fill('input[name="sermon-topic"]', 'The Parable of the Sower');
    await page.fill('input[name="scripture"]', 'Matthew 13:1-23');
    
    // Generate outline
    await page.click('button:has-text("Generate Outline")');
    
    // Wait for AI response
    await page.waitForSelector('.ai-generated-outline');
    
    // Verify outline generated
    const outline = page.locator('.ai-generated-outline');
    await expect(outline).toContainText('Introduction');
    await expect(outline).toContainText('Main Points');
    await expect(outline).toContainText('Conclusion');
  });
});

test.describe('Performance Tests', () => {
  test('should load dashboard within 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(`${APPFLOWY_URL}`);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle large documents', async ({ page }) => {
    await page.goto(`${APPFLOWY_URL}`);
    
    // Create large document
    const largeText = 'Lorem ipsum '.repeat(10000);
    await page.fill('[contenteditable]', largeText);
    
    // Verify no performance issues
    const startTime = Date.now();
    await page.keyboard.press('Control+S');
    const saveTime = Date.now() - startTime;
    
    expect(saveTime).toBeLessThan(1000);
  });
});