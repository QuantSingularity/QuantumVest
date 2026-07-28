const { test, expect } = require("@playwright/test");

test.describe("QuantumVest Frontend E2E Tests", () => {
  test("homepage loads successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/QuantumVest/);
    await expect(page.getByText(/Invest with clarity/i)).toBeVisible();
  });

  test("unauthenticated visitor is redirected away from the dashboard", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login");
    await expect(page.getByText(/Welcome back/i)).toBeVisible();
  });

  test("homepage links to sign in and get started", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
    await page.getByRole("link", { name: /sign in/i }).click();
    await page.waitForURL("**/login");
  });

  test("register page renders the required fields", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
  });

  test("footer legal links work from the homepage", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /privacy policy/i }).click();
    await page.waitForURL("**/privacy");
    await expect(
      page.getByRole("heading", { name: /privacy policy/i }),
    ).toBeVisible();
  });

  test("unknown routes render the 404 page", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");
    await expect(page.getByText(/page not found/i)).toBeVisible();
  });
});
