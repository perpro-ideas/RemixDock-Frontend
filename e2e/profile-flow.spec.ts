import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Flujo E2E de Perfil y Seguridad (Sprint 1 - REM-42 & REM-48)', () => {
  let currentUsername = 'dj_remixer_pro';
  const userEmail = 'dj_remixer@remixdock.com';
  const initialPassword = 'CorrectPassword123!';

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
            accessToken: 'mock-jwt-token-remixdock-profile',
            user: {
              id: 'mock-user-uuid-9999',
              email: userEmail,
              username: currentUsername,
              role: 'USER',
              createdAt: '2026-01-15T12:00:00.000Z',
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

      // PATCH /api/v1/users/profile (REM-42)
      await page.route('**/api/v1/users/profile', async (route) => {
        const body = route.request().postDataJSON() as { username?: string };
        if (!body.username || body.username === 'conflict_dj') {
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({
              statusCode: 409,
              message: 'El nombre de usuario ya está en uso',
              error: 'Conflict',
            }),
          });
          return;
        }

        currentUsername = body.username;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'mock-user-uuid-9999',
            email: userEmail,
            username: currentUsername,
            role: 'USER',
            createdAt: '2026-01-15T12:00:00.000Z',
            updatedAt: new Date().toISOString(),
          }),
        });
      });

      // POST /api/v1/users/change-password (REM-48)
      await page.route('**/api/v1/users/change-password', async (route) => {
        const body = route.request().postDataJSON() as { currentPassword?: string; newPassword?: string };
        if (body.currentPassword !== initialPassword) {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              statusCode: 401,
              message: 'La contraseña actual no es correcta.',
              error: 'Unauthorized',
            }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Contraseña actualizada exitosamente.',
          }),
        });
      });
  });

  test('debe permitir autenticarse, editar el perfil con reflejo en el dashboard, manejar error 401 de contraseña y capturar pantalla', async ({ page }) => {
    // 1. Login con credenciales válidas
    await page.goto('/login');
    await expect(page).toHaveTitle(/RemixDock/);

    await page.fill('input#identifier', userEmail);
    await page.fill('input#password', initialPassword);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    // Redirección al Dashboard
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    await expect(page.getByRole('heading', { level: 1 })).toContainText(currentUsername);

    // 2. Navegar a /profile a través del botón "Editar perfil"
    const editProfileBtn = page.locator('#edit-profile-card-btn').first();
    await expect(editProfileBtn).toBeVisible();
    await editProfileBtn.click();

    await page.waitForURL(/.*profile/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Perfil y Seguridad' })).toBeVisible();

    // Validar datos prellenados
    const emailInput = page.locator('input#profile-email');
    await expect(emailInput).toHaveValue(userEmail);
    await expect(emailInput).toBeDisabled();

    const usernameInput = page.locator('input#profile-username');
    await expect(usernameInput).toHaveValue(currentUsername);

    // 3. Modificar el nombre de usuario y guardar los cambios (REM-42)
    const newArtistName = `dj_electro_${Date.now()}`;
    await usernameInput.fill(newArtistName);

    const saveProfileBtn = page.locator('#save-profile-btn');
    await saveProfileBtn.click();

    // Comprobar mensaje de éxito en verde pastel
    const profileSuccessAlert = page.locator('#profile-success-alert');
    await expect(profileSuccessAlert).toBeVisible({ timeout: 5000 });
    await expect(profileSuccessAlert).toContainText('Tu nombre de usuario se actualizó correctamente.');

    // Validar retorno al Dashboard y actualización inmediata del saludo global en pantalla
    const backBtn = page.locator('#back-to-dashboard-btn');
    await backBtn.click();

    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    await expect(page.getByRole('heading', { level: 1 })).toContainText(newArtistName);

    // Regresar a /profile para las pruebas de seguridad y contraseña
    await page.locator('#edit-profile-card-btn').first().click();
    await page.waitForURL(/.*profile/, { timeout: 10000 });

    // 4. Llenar el formulario de contraseña ingresando una contraseña actual errónea (REM-48)
    await page.fill('input#current-password', 'WrongPassword123!');
    await page.fill('input#new-password', 'BrandNewPassword2026!');
    await page.fill('input#confirm-password', 'BrandNewPassword2026!');

    const changePasswordBtn = page.locator('#change-password-btn');
    await changePasswordBtn.click();

    // Verificar que aparezca la alerta de error 401
    const passwordErrorAlert = page.locator('#password-error-alert');
    await expect(passwordErrorAlert).toBeVisible({ timeout: 5000 });
    await expect(passwordErrorAlert).toContainText('La contraseña actual no es correcta. Inténtalo nuevamente.');

    // 5. Tomar captura de pantalla de la vista /profile en e2e/screenshots/profile-page.png
    await page.evaluate(() => window.scrollTo(0, 0));
    const screenshotPath = path.resolve('e2e/screenshots/profile-page.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBeTruthy();

    // 6. Probar flujo de éxito de contraseña: con la contraseña actual correcta
    await page.fill('input#current-password', initialPassword);
    await changePasswordBtn.click();

    // Verificar notificación de éxito y redirección a /login?passwordChanged=true
    await page.waitForURL(/.*login.*passwordChanged=true/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*passwordChanged=true/);
    await expect(page.getByText('Tu contraseña se actualizó correctamente. Por seguridad, ingresa nuevamente.')).toBeVisible();
  });
});
