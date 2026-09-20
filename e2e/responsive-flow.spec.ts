import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Flujo E2E Responsive y Optimización Móvil (feature/responsive-ui)', () => {
  const userEmail = 'responsive_user@remixdock.com';
  const userPassword = 'ValidPassword123!';
  const username = 'dj_mobile_pro';

  let isLoggedIn = false;

  // Configuración de viewport móvil (iPhone SE / Galaxy estándar)
  test.use({
    viewport: { width: 375, height: 667 },
  });

  test.beforeEach(async ({ page }) => {
    // Asegurar directorio para las capturas de pantalla
    const screenshotsDir = path.resolve('e2e/screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    isLoggedIn = false;

    // Mock de Login
    await page.route('**/api/v1/auth/login', async (route) => {
      isLoggedIn = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'set-cookie': 'refreshToken=mock-refresh-token-resp; Path=/api/v1/auth; HttpOnly; SameSite=Lax',
        },
        body: JSON.stringify({
          accessToken: 'mock-jwt-token-responsive',
          user: {
            id: 'mock-user-resp-001',
            email: userEmail,
            username,
            role: 'USER',
            createdAt: '2026-03-01T10:00:00.000Z',
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    });

    // Mock de refresh token condicionado a isLoggedIn
    await page.route('**/api/v1/auth/refresh', async (route) => {
      if (isLoggedIn) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken: 'mock-jwt-token-responsive',
            user: {
              id: 'mock-user-resp-001',
              email: userEmail,
              username,
              role: 'USER',
              createdAt: '2026-03-01T10:00:00.000Z',
              updatedAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ statusCode: 401, message: 'No refresh token provided' }),
        });
      }
    });

    // Mock de balance e historial de créditos
    await page.route('**/api/v1/me/credits', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          balance: 75,
          history: [
            {
              id: 'mov-resp-01',
              userId: 'mock-user-resp-001',
              amount: 50,
              type: 'PLAN_SUBSCRIPTION',
              description: 'Membresía DJ Pro Club',
              referenceId: 'sub-001',
              createdAt: '2026-03-10T14:30:00.000Z',
            },
            {
              id: 'mov-resp-02',
              userId: 'mock-user-resp-001',
              amount: -5,
              type: 'REMIX_DOWNLOAD',
              description: 'Descarga Stems: Titanium Extended',
              referenceId: 'track-001',
              createdAt: '2026-03-12T18:00:00.000Z',
            },
          ],
        }),
      });
    });

    // Mock de planes
    await page.route('**/api/v1/plans', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'plan-starter-monthly',
            name: 'DJ Starter',
            description: 'Acceso inicial para DJs que buscan pistas de alta calidad.',
            type: 'MONTHLY',
            price: 9.99,
            durationDays: 30,
            creditsIncluded: 15,
            benefits: ['15 descargas mensuales WAV/FLAC', 'Preescucha en streaming'],
            canRequestRemix: false,
            isActive: true,
          },
          {
            id: 'plan-pro-monthly',
            name: 'DJ Pro Club',
            description: 'El plan más popular para DJs residentes y productores activos.',
            type: 'MONTHLY',
            price: 19.99,
            durationDays: 30,
            creditsIncluded: 50,
            benefits: ['50 descargas mensuales WAV/FLAC', 'Acceso ilimitado a stems', 'Remixes a medida'],
            canRequestRemix: true,
            isActive: true,
          },
        ]),
      });
    });

    // Mock de creación de orden PayPal
    await page.route('**/api/v1/payments/paypal/create-order', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          orderId: 'db-order-resp-123',
          paypalOrderId: 'PAYPAL-RESP-456',
          status: 'PENDING',
        }),
      });
    });
  });

  test('01. Debe renderizar Landing Page en pantalla móvil sin desbordamiento horizontal', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Comprobar que no hay desbordamiento horizontal
    const noOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
    });
    expect(noOverflow).toBe(true);

    // Los botones de navegación deben ser accesibles y legibles
    const plansLink = page.locator('#nav-plans-link');
    await expect(plansLink).toBeVisible();
    const boundingBox = await plansLink.boundingBox();
    expect(boundingBox?.height).toBeGreaterThanOrEqual(40);
  });

  test('02. Catálogo /plans y CheckoutModal adaptados en móvil con scroll vertical fluido', async ({ page }) => {
    // Iniciar sesión previa para tener usuario autenticado con balance
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input#identifier', userEmail);
    await page.fill('input#password', userPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');

    await page.goto('/plans');
    await page.waitForLoadState('networkidle');

    // 1. Verificar ausencia de desbordamiento horizontal en catálogo
    const catalogNoOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
    });
    expect(catalogNoOverflow).toBe(true);

    // 2. Verificar CreditsBadge en header de /plans
    const creditsBadge = page.locator('#credits-badge-link');
    await expect(creditsBadge).toBeVisible();
    // La palabra "créditos" debe estar oculta en móvil (< 640px)
    const creditsText = page.locator('#credits-badge-text');
    await expect(creditsText).toBeHidden();

    // 3. Abrir CheckoutModal pulsando "Elegir plan"
    const choosePlanBtn = page.locator('#choose-plan-plan-pro-monthly-btn');
    await expect(choosePlanBtn).toBeVisible();
    await choosePlanBtn.click();

    // 4. Modal visible y accesible
    const modal = page.locator('#checkout-modal-content');
    await expect(modal).toBeVisible();
    await expect(page.locator('#checkout-modal-title')).toContainText('Resumen de suscripción');

    // 5. Verificar que el modal no causa desbordamiento horizontal
    const modalNoOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
    });
    expect(modalNoOverflow).toBe(true);

    // 6. Captura de pantalla móvil del modal de checkout
    const checkoutScreenshotPath = path.resolve('e2e/screenshots/responsive-checkout-mobile.png');
    await page.screenshot({ path: checkoutScreenshotPath, fullPage: false });
    expect(fs.existsSync(checkoutScreenshotPath)).toBe(true);

    // 7. Cerrar modal mediante botón accesible
    const closeBtn = page.locator('#close-checkout-modal-btn');
    await closeBtn.click();
    await expect(modal).toBeHidden();
  });

  test('03. Dashboard en móvil: header compacto, badge de créditos y lista de movimientos en tarjetas', async ({ page }) => {
    // 1. Iniciar sesión
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input#identifier', userEmail);
    await page.fill('input#password', userPassword);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await page.waitForLoadState('networkidle');

    // 2. Verificar ausencia de desbordamiento horizontal en dashboard
    const dashboardNoOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
    });
    expect(dashboardNoOverflow).toBe(true);

    // 3. Verificar CreditsBadge en header (compacto en móvil)
    const headerCreditsBadge = page.locator('#credits-badge-link');
    await expect(headerCreditsBadge).toBeVisible();
    await expect(page.locator('#credits-badge-balance')).toHaveText('75');
    await expect(page.locator('#credits-badge-text')).toBeHidden();

    // 4. Verificar touch targets mínimos de botones del header (>= 40px)
    const editProfileBtn = page.locator('#edit-profile-header-btn');
    const editBox = await editProfileBtn.boundingBox();
    expect(editBox?.height).toBeGreaterThanOrEqual(40);
    expect(editBox?.width).toBeGreaterThanOrEqual(40);

    // 5. Verificar tarjeta de saldo en dashboard
    const balanceDisplay = page.locator('#dashboard-credits-balance');
    await expect(balanceDisplay).toHaveText('75');
    const rechargeBtn = page.locator('#recharge-credits-btn');
    await expect(rechargeBtn).toBeVisible();

    // 6. Verificar vista dual de movimientos:
    // La tabla HTML para desktop debe estar oculta en móvil (< 640px)
    const tableDesktop = page.locator('#credits-history-table');
    await expect(tableDesktop).toBeHidden();

    // La lista de tarjetas móviles debe estar visible
    const mobileList = page.locator('#credits-history-mobile-list');
    await expect(mobileList).toBeVisible();

    // Validar que se muestran los movimientos en formato de tarjetas
    const mobileCards = mobileList.locator('> div');
    await expect(mobileCards).toHaveCount(2);
    await expect(mobileCards.first()).toContainText('Membresía DJ Pro Club');
    await expect(mobileCards.first()).toContainText('+50 cr.');
    await expect(mobileCards.nth(1)).toContainText('Descarga Stems: Titanium Extended');
    await expect(mobileCards.nth(1)).toContainText('-5 cr.');

    // 7. Captura de pantalla móvil del Dashboard
    const dashboardScreenshotPath = path.resolve('e2e/screenshots/responsive-dashboard-mobile.png');
    await page.screenshot({ path: dashboardScreenshotPath, fullPage: true });
    expect(fs.existsSync(dashboardScreenshotPath)).toBe(true);
  });
});
