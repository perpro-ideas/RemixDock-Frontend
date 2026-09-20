import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Flujo E2E de Autenticación RemixDock (Sprint 0)', () => {
  test.beforeEach(async ({ page }) => {
    // Asegurar directorio de capturas
    const screenshotsDir = path.resolve('e2e/screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // Mock de rutas de autenticación
    await page.route('**/api/v1/auth/register', async (route) => {
        const body = route.request().postDataJSON() as { email: string; username: string };
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'mock-user-uuid-1234',
            email: body.email || 'dj_pro@remixdock.com',
            username: body.username || 'dj_pro',
            role: 'USER',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        });
      });

      await page.route('**/api/v1/auth/login', async (route) => {
        const body = route.request().postDataJSON() as { identifier: string };
        const username = body.identifier.includes('@') ? body.identifier.split('@')[0] : body.identifier;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'set-cookie': 'refreshToken=mock-refresh-token; Path=/api/v1/auth; HttpOnly; SameSite=Lax',
          },
          body: JSON.stringify({
            accessToken: 'mock-jwt-access-token-remixdock',
            user: {
              id: 'mock-user-uuid-1234',
              email: body.identifier.includes('@') ? body.identifier : `${body.identifier}@remixdock.com`,
              username: username || 'dj_pro',
              role: 'USER',
              createdAt: new Date().toISOString(),
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
          body: JSON.stringify({ message: 'Sesión cerrada exitosamente' }),
        });
      });
      await page.route('**/api/v1/me/credits', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            balance: 50,
            lastUpdated: new Date().toISOString(),
            history: [],
          }),
        });
      });
  });

  test('debe completar el flujo interactivo: landing -> registro -> login -> dashboard -> logout', async ({ page }) => {
    // 1. Navega a http://localhost:3000
    await page.goto('/');
    await expect(page).toHaveTitle(/RemixDock/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 2. Hace clic en el botón o enlace hacia "Crear cuenta"
    const registerLink = page.getByRole('link', { name: 'Crear cuenta' }).first();
    await registerLink.click();

    // 3. En /register, completa los inputs y hace clic en "Crear cuenta"
    await expect(page).toHaveURL(/.*register/);
    await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible();

    const timestamp = Date.now();
    const testUsername = `dj_test_${timestamp}`;
    const testEmail = `${testUsername}@remixdock.com`;
    const testPassword = 'Password12345!';

    await page.fill('input#email', testEmail);
    await page.fill('input#username', testUsername);
    await page.fill('input#password', testPassword);

    const submitRegisterBtn = page.getByRole('button', { name: 'Crear cuenta' });
    await submitRegisterBtn.click();

    // 4. Verifica la redirección a /login (o a dashboard si auto-login)
    await page.waitForURL(/(dashboard|login)/, { timeout: 10000 });

    if (page.url().includes('/login')) {
      // 5. En /login, escribe las credenciales creadas y hace clic en "Iniciar sesión"
      await page.fill('input#identifier', testEmail);
      await page.fill('input#password', testPassword);
      await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    }

    // 6. Espera la navegación automática a /dashboard
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*dashboard/);

    // 7. Verifica que en pantalla aparezcan el saludo con el nombre de usuario y el badge del rol
    await expect(page.getByRole('heading', { level: 1 })).toContainText(testUsername);
    await expect(page.getByText('Usuario / DJ').first()).toBeVisible();

    // 9. Toma una captura de pantalla final del dashboard autenticado y guárdala en e2e/screenshots/dashboard-success.png
    const screenshotPath = path.resolve('e2e/screenshots/dashboard-success.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBeTruthy();

    // 8. Hace clic en "Cerrar sesión" y valida que el navegador regrese a /login
    const logoutBtn = page.getByRole('button', { name: 'Cerrar sesión' }).first();
    await logoutBtn.click();

    await page.waitForURL(/.*login/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('debe persistir el estado autenticado en la landing page mostrando CreditsBadge y enlace a dashboard', async ({ page }) => {
    // 1. Iniciar sesión directamente
    await page.goto('/login');
    await page.fill('input#identifier', 'dj_session_test@remixdock.com');
    await page.fill('input#password', 'Password12345!');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*dashboard/);

    // 2. Navegar a la página de inicio / haciendo clic en el logo
    const logoLink = page.locator('header a[href="/"]').first();
    await logoLink.click();
    await page.waitForURL('/', { timeout: 5000 });

    // 3. Verificar que los botones "Iniciar sesión" y "Crear cuenta" están ausentes
    await expect(page.locator('#landing-login-link')).toHaveCount(0);
    await expect(page.locator('#landing-register-link')).toHaveCount(0);

    // 4. Verificar que el CreditsBadge, el enlace al Dashboard y el botón Salir están visibles
    await expect(page.locator('#credits-badge-link')).toBeVisible();
    await expect(page.locator('#landing-dashboard-link')).toBeVisible();
    await expect(page.locator('#landing-logout-btn')).toBeVisible();

    // 5. Probar que al presionar el botón Salir en la landing, se cierra la sesión reactivamente
    await page.locator('#landing-logout-btn').click();
    await expect(page.locator('#landing-login-link')).toBeVisible();
    await expect(page.locator('#landing-register-link')).toBeVisible();
    await expect(page.locator('#landing-dashboard-link')).toHaveCount(0);
  });
});
