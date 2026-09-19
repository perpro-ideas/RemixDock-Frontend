import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Flujo E2E de Recuperación y Restablecimiento de Contraseña (REM-50)', () => {
  const testEmail = 'dj_reset@remixdock.com';
  const validToken = 'mock-valid-reset-token-2026';
  const expiredToken = 'mock-expired-reset-token';
  const newPassword = 'NewSecretPassword2026!';

  test.beforeEach(async ({ page }) => {
    // Asegurar directorio de screenshots
    const screenshotsDir = path.resolve('e2e/screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // Verificar si el backend local en puerto 4000 está activo
    let isBackendAlive = false;
    try {
      const ping = await fetch('http://localhost:4000/api/v1/pings/admin', { signal: AbortSignal.timeout(1000) });
      if (ping.status === 401 || ping.status === 200 || ping.status === 403) {
        isBackendAlive = true;
      }
    } catch {
      isBackendAlive = false;
    }

    // Interceptar llamadas al backend si no está en ejecución localmente
    if (!isBackendAlive) {
      await page.route('**/api/v1/auth/forgot-password', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Si el correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña.',
          }),
        });
      });

      await page.route('**/api/v1/auth/reset-password', async (route) => {
        const body = route.request().postDataJSON() as { token?: string; newPassword?: string };
        if (body.token === expiredToken) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              statusCode: 400,
              message: 'El enlace de recuperación es inválido o ha expirado.',
              error: 'Bad Request',
            }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Tu contraseña ha sido restablecida exitosamente.',
          }),
        });
      });
    }
  });

  test('debe validar el enlace en login, solicitar instrucciones en forgot-password, capturar reset-password y redirigir con confirmación', async ({ page }) => {
    // 1. Navegar a /login y verificar presencia del enlace "¿Olvidaste tu contraseña?"
    await page.goto('/login');
    await expect(page).toHaveTitle(/RemixDock/);

    const forgotPasswordLink = page.locator('#forgot-password-link');
    await expect(forgotPasswordLink).toBeVisible();
    await expect(forgotPasswordLink).toHaveText('¿Olvidaste tu contraseña?');

    // 2. Hacer clic en el enlace y comprobar carga de /forgot-password
    await forgotPasswordLink.click();
    await page.waitForURL(/.*forgot-password/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*forgot-password/);
    await expect(page.getByRole('heading', { name: 'Recuperar acceso a tu cuenta' })).toBeVisible();

    // 3. Escribir un correo electrónico y pulsar "Enviar instrucciones"
    const emailInput = page.locator('input#email');
    await emailInput.fill(testEmail);

    const submitForgotBtn = page.locator('#submit-forgot-password-btn');
    await submitForgotBtn.click();

    // Verificar mensaje de confirmación en pantalla
    const successAlert = page.locator('#forgot-success-alert');
    await expect(successAlert).toBeVisible({ timeout: 5000 });
    await expect(successAlert).toContainText(
      'Si el correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada o carpeta de spam.'
    );

    // 4. Probar caso de enlace sin token en /reset-password
    await page.goto('/reset-password');
    await expect(page.locator('#invalid-token-alert')).toBeVisible();
    await expect(page.getByText('Falta el enlace de seguridad')).toBeVisible();

    // 5. Navegar a /reset-password?token=mock-valid-token
    await page.goto(`/reset-password?token=${validToken}`);
    await expect(page.getByRole('heading', { name: 'Restablecer contraseña' })).toBeVisible();

    // 6. Tomar captura de pantalla de la vista /reset-password en e2e/screenshots/reset-password-page.png
    await page.evaluate(() => window.scrollTo(0, 0));
    const screenshotPath = path.resolve('e2e/screenshots/reset-password-page.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBeTruthy();

    // 7. Completar campos con nueva contraseña y confirmación
    const newPasswordInput = page.locator('input#new-password');
    const confirmPasswordInput = page.locator('input#confirm-password');

    await newPasswordInput.fill(newPassword);
    await confirmPasswordInput.fill(newPassword);

    const submitResetBtn = page.locator('#submit-reset-password-btn');
    await submitResetBtn.click();

    // 8. Validar redirección a /login?resetSuccess=true y comprobar alerta en pantalla
    await page.waitForURL(/.*login.*resetSuccess=true/, { timeout: 10000 });
    await expect(page).toHaveURL(/.*resetSuccess=true/);

    const resetSuccessAlert = page.locator('#reset-success-alert');
    await expect(resetSuccessAlert).toBeVisible();
    await expect(resetSuccessAlert).toContainText(
      'Tu contraseña ha sido restablecida exitosamente. Ahora puedes iniciar sesión con tu nueva credencial.'
    );
  });
});
