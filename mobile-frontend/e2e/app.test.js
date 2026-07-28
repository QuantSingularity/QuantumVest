describe("QuantumVest Mobile App", () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe("Home & Auth", () => {
    it("shows the landing screen with sign in and get started actions", async () => {
      await expect(element(by.text(/Invest with clarity/))).toBeVisible();
      await expect(element(by.text("Sign In"))).toBeVisible();
      await expect(element(by.text("Create Free Account"))).toBeVisible();
    });

    it("navigates to the login screen", async () => {
      await element(by.text("Sign In")).atIndex(0).tap();
      await expect(element(by.text("Welcome back"))).toBeVisible();
    });

    it("shows a validation error for empty login fields", async () => {
      await element(by.text("Sign In")).atIndex(0).tap();
      await element(by.text("Sign In")).atIndex(1).tap();
      await waitFor(element(by.text(/enter your username/i)))
        .toBeVisible()
        .withTimeout(3000);
    });

    it("navigates to the register screen", async () => {
      await element(by.text("Sign In")).atIndex(0).tap();
      await element(by.text("Create one")).tap();
      await expect(element(by.text("Create your account"))).toBeVisible();
    });

    it("navigates to the forgot password screen", async () => {
      await element(by.text("Sign In")).atIndex(0).tap();
      await element(by.text("Forgot password?")).tap();
      await expect(element(by.text("Forgot password?"))).toBeVisible();
    });
  });

  // The following flows require a seeded test account and are intended to
  // run against a backend with known credentials (see e2e/README or CI env).
  describe("Authenticated app (requires TEST_USER credentials)", () => {
    const email = process.env.E2E_TEST_EMAIL;
    const password = process.env.E2E_TEST_PASSWORD;

    beforeEach(async () => {
      if (!email || !password) return;
      await element(by.text("Sign In")).atIndex(0).tap();
      await element(by.type("android.widget.EditText"))
        .atIndex(0)
        .typeText(email);
      await element(by.type("android.widget.EditText"))
        .atIndex(1)
        .typeText(password);
      await element(by.text("Sign In")).atIndex(1).tap();
    });

    it("lands on the dashboard tab after signing in", async () => {
      if (!email || !password) return;
      await waitFor(element(by.text(/Hi,/)))
        .toBeVisible()
        .withTimeout(5000);
    });

    it("navigates between bottom tabs", async () => {
      if (!email || !password) return;
      await element(by.text("Portfolios")).tap();
      await expect(element(by.text("Portfolios"))).toBeVisible();
      await element(by.text("Watchlist")).tap();
      await expect(element(by.text("Watchlist"))).toBeVisible();
      await element(by.text("Risk")).tap();
      await expect(element(by.text("Risk Analytics"))).toBeVisible();
    });
  });
});
