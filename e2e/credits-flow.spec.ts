import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Flujo E2E de Créditos y Balance (Sprint 1 - REM-71)', () => {
  const userEmail = 'dj_test@remixdock.com';
  const userPassword = 'ValidPassword123!';
  const username = 'dj_alessandro';

  test.beforeEach(async ({ page }) => {
    // Asegurar directorio para las capturas de pantalla
    const screenshotsDir = path.resolve('e2e/screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // Mock de rutas
    await page.route('**/api/v1/auth/login', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'set-cookie': 'refreshToken=mock-refresh-token; Path=/api/v1/auth; HttpOnly; SameSite=Lax',
          },
          body: JSON.stringify({
            accessToken: 'mock-jwt-token-remixdock-credits',
            user: {
              id: 'mock-user-credits-001',
              email: userEmail,
              username,
              role: 'USER',
              createdAt: '2026-02-10T12:00:00.000Z',
              updatedAt: new Date().toISOString(),
            },
          }),
        });
      });

      await page.route('**/api/v1/auth/refresh', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ statusCode: 401, message: 'No refresh token provided' }),
        });
      });

      await page.route('**/api/v1/auth/logout', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Sesión cerrada' }),
        });
      });

      await page.route('**/api/v1/me/credits', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            balance: 45,
            lastUpdated: '2026-09-19T18:00:00.000Z',
            history: [
              {
                id: 'tx-sub-101',
                amount: 50,
                type: 'PLAN_SUBSCRIPTION',
                description: 'Suscripción activa - Plan DJ Pro Club',
                createdAt: '2026-09-15T10:30:00.000Z',
              },
              {
                id: 'tx-dl-102',
                amount: -5,
                type: 'REMIX_DOWNLOAD',
                description: 'Descarga de remix: Summer Groove (Stems Pack)',
                createdAt: '2026-09-17T14:15:00.000Z',
              },
            ],
          }),
        });
      });

      await page.route('**/api/v1/plans', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'plan-pro-monthly',
              name: 'DJ Pro Club',
              description: 'El plan más popular para DJs residentes.',
              type: 'MONTHLY',
              price: 19.99,
              durationDays: 30,
              creditsIncluded: 50,
              benefits: ['50 descargas mensuales en WAV/FLAC', 'Acceso a stems'],
              canRequestRemix: true,
              isActive: true,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ]),
        });
      });
  });

  test('debe mostrar el CreditsBadge en el header y el módulo de balance en el Dashboard', async ({ page }) => {
    // 1. Iniciar sesión
    await page.goto('/login');
    await page.fill('input#identifier', userEmail);
    await page.fill('input#password', userPassword);
    await page.click('button[type="submit"]');

    // 2. Verificar redirección exitosa al Dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText(username);

    // 3. Validar el CreditsBadge en el header
    const creditsBadge = page.locator('#credits-badge-link');
    await expect(creditsBadge).toBeVisible();
    await expect(creditsBadge).toContainText('45');
    await expect(creditsBadge).toContainText('créditos');

    // 4. Validar la sección Billetera y Balance de Créditos
    const creditsSection = page.locator('section[aria-labelledby="credits-section-title"]');
    await expect(creditsSection).toBeVisible();
    await expect(page.locator('#credits-section-title')).toContainText('Billetera y Balance de Créditos');

    // 5. Validar tarjeta de Saldo Destacado
    const balanceCard = page.locator('#credits-balance-card');
    await expect(balanceCard).toBeVisible();
    await expect(page.locator('#dashboard-credits-balance')).toHaveText('45');

    // 6. Validar botón para obtener más créditos
    const rechargeBtn = page.locator('#recharge-credits-btn');
    await expect(rechargeBtn).toBeVisible();
    await expect(rechargeBtn).toHaveAttribute('href', '/plans');

    // 7. Validar la tabla de Historial de Movimientos
    const historyTable = page.locator('#credits-history-table');
    await expect(historyTable).toBeVisible();
    await expect(historyTable).toContainText('Suscripción activa - Plan DJ Pro Club');
    await expect(historyTable).toContainText('+50 cr.');
    await expect(historyTable).toContainText('Descarga de remix: Summer Groove');
    await expect(historyTable).toContainText('-5 cr.');

    // 8. Capturar screenshot del Dashboard con el módulo de créditos
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: 'e2e/screenshots/dashboard-credits.png',
      fullPage: true,
    });

    // 9. Hacer clic en CreditsBadge y validar navegación a /plans
    await creditsBadge.click();
    await expect(page).toHaveURL('/plans');
    await expect(page.locator('h1')).toContainText('Planes diseñados para');

    // En la página de planes, al estar autenticado, el CreditsBadge también debe ser visible en el header
    const plansHeaderBadge = page.locator('#credits-badge-link');
    await expect(plansHeaderBadge).toBeVisible();
    await expect(plansHeaderBadge).toContainText('45');
  });

  test('debe manejar correctamente el estado vacío cuando no hay transacciones previas', async ({ page }) => {
    // Interceptar con balance 0 e historial vacío
    await page.route('**/api/v1/me/credits', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          balance: 0,
          lastUpdated: null,
          history: [],
        }),
      });
    });

    await page.goto('/login');
    await page.fill('input#identifier', userEmail);
    await page.fill('input#password', userPassword);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('#dashboard-credits-balance')).toHaveText('0');

    // Validar mensaje de estado vacío
    const emptyState = page.locator('#empty-credits-history');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('Sin movimientos registrados');
  });
});
