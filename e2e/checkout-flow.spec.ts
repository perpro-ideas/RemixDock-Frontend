import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Flujo E2E de Checkout y Pasarela PayPal (feature/checkout-paypal-ui)', () => {
  const userEmail = 'dj_checkout_user@remixdock.com';
  const userPassword = 'CorrectPassword123!';
  const username = 'dj_marcelo';

  let currentCredits = 35;
  let isLoggedIn = false;

  test.beforeEach(async ({ page }) => {
    // Asegurar directorio para las capturas de pantalla
    const screenshotsDir = path.resolve('e2e/screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    currentCredits = 35;
    isLoggedIn = false;

    // 1. Mock de Login
    await page.route('**/api/v1/auth/login', async (route) => {
        isLoggedIn = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'set-cookie': 'refreshToken=mock-refresh-token-checkout; Path=/api/v1/auth; HttpOnly; SameSite=Lax',
          },
          body: JSON.stringify({
            accessToken: 'mock-jwt-token-remixdock-checkout',
            user: {
              id: 'mock-user-checkout-001',
              email: userEmail,
              username,
              role: 'USER',
              createdAt: '2026-03-01T10:00:00.000Z',
              updatedAt: new Date().toISOString(),
            },
          }),
        });
      });

      // 2. Mock de Refresh Token (devuelve sesión si isLoggedIn está activo)
      await page.route('**/api/v1/auth/refresh', async (route) => {
        if (isLoggedIn) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              accessToken: 'mock-jwt-token-remixdock-checkout',
              user: {
                id: 'mock-user-checkout-001',
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

      // 3. Mock de Planes
      await page.route('**/api/v1/plans', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'plan-starter-monthly',
              name: 'DJ Starter',
              description: 'Acceso inicial para DJs que buscan pistas seleccionadas de alta calidad.',
              type: 'MONTHLY',
              price: 9.99,
              durationDays: 30,
              creditsIncluded: 15,
              benefits: ['15 descargas mensuales en formato WAV/FLAC', 'Preescucha en streaming'],
              canRequestRemix: false,
              isActive: true,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
            {
              id: 'plan-pro-monthly',
              name: 'DJ Pro Club',
              description: 'El plan más popular para DJs residentes y productores activos.',
              type: 'MONTHLY',
              price: 19.99,
              durationDays: 30,
              creditsIncluded: 50,
              benefits: [
                '50 descargas mensuales en formato WAV/FLAC',
                'Acceso ilimitado a stems multipista separados',
                'Hasta 2 solicitudes mensuales de remixes',
              ],
              canRequestRemix: true,
              isActive: true,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ]),
        });
      });

      // 4. Mock de Saldo de Créditos (/me/credits)
      await page.route('**/api/v1/me/credits', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            balance: currentCredits,
            lastUpdated: new Date().toISOString(),
            history: [
              {
                id: 'tx-init-001',
                amount: currentCredits,
                type: 'PLAN_SUBSCRIPTION',
                description: 'Saldo activo de estudio',
                createdAt: new Date().toISOString(),
              },
            ],
          }),
        });
      });

      // 5. Mock de Create Order PayPal
      await page.route('**/api/v1/payments/paypal/create-order', async (route) => {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            orderId: 'mock-order-remixdock-001',
            paypalOrderId: 'PAYPAL-MOCK-ORDER-999',
            approvalUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL-MOCK-ORDER-999',
            amount: 19.99,
            currency: 'USD',
          }),
        });
      });

      // 6. Mock de Capture Order PayPal
      await page.route('**/api/v1/payments/paypal/capture-order', async (route) => {
        currentCredits += 50; // Acreditar los créditos en el mock para la posterior sincronización
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Pago capturado y suscripción activada exitosamente',
            order: {
              id: 'mock-order-remixdock-001',
              status: 'COMPLETED',
              amount: 19.99,
              plan: {
                id: 'plan-pro-monthly',
                name: 'DJ Pro Club',
                creditsIncluded: 50,
              },
            },
          }),
        });
      });
  });

  test('debe redirigir a un usuario no autenticado a login y retornar al catálogo con modal abierto', async ({ page }) => {
    // 1. Acceder a /plans sin sesión
    await page.goto('/plans');
    await expect(page).toHaveURL('/plans');

    // 2. Hacer clic en "Elegir plan" en DJ Pro Club
    const choosePlanBtn = page.locator('#choose-plan-plan-pro-monthly-btn');
    await expect(choosePlanBtn).toBeVisible();
    await choosePlanBtn.click();

    // 3. Verificar redirección inteligente a /login con parámetros de retorno
    await page.waitForURL((url) => url.pathname === '/login' && url.searchParams.get('planId') === 'plan-pro-monthly');
    await expect(page.locator('#plan-redirect-alert')).toBeVisible();
    await expect(page.locator('#plan-redirect-alert')).toContainText('Inicia sesión para continuar');

    // 4. Iniciar sesión
    await page.fill('input#identifier', userEmail);
    await page.fill('input#password', userPassword);
    await page.click('button[type="submit"]');

    // 5. Verificar retorno automático a /plans con el plan seleccionado
    await page.waitForURL((url) => url.pathname === '/plans' && url.searchParams.get('planId') === 'plan-pro-monthly');

    // 6. Verificar que el CheckoutModal se abra automáticamente
    const modalContent = page.locator('#checkout-modal-content');
    await expect(modalContent).toBeVisible();
    await expect(page.locator('#checkout-modal-title')).toContainText('Resumen de suscripción');
    await expect(modalContent).toContainText('DJ Pro Club');
    await expect(modalContent).toContainText('$19.99');
    await expect(modalContent).toContainText('+50 créditos incluidos');
  });

  test('debe completar el flujo interactivo de compra con PayPal, mostrar pantalla de éxito y actualizar saldo', async ({ page }) => {
    // 1. Login previo para simular usuario ya autenticado
    await page.goto('/login');
    await page.fill('input#identifier', userEmail);
    await page.fill('input#password', userPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // 2. Navegar al catálogo de planes desde el dashboard
    const rechargeBtn = page.locator('#recharge-credits-btn');
    await expect(rechargeBtn).toBeVisible();
    await rechargeBtn.click();
    await page.waitForURL('/plans');

    // Validar CreditsBadge inicial en header (35 créditos)
    const headerBadge = page.locator('#credits-badge-link');
    await expect(headerBadge).toBeVisible();
    await expect(headerBadge).toContainText('35');

    // 3. Abrir modal de checkout seleccionando DJ Pro Club
    const choosePlanBtn = page.locator('#choose-plan-plan-pro-monthly-btn');
    await expect(choosePlanBtn).toBeVisible();
    await choosePlanBtn.click();

    // 4. Verificar vista de resumen en CheckoutModal
    const modalContent = page.locator('#checkout-modal-content');
    await expect(modalContent).toBeVisible();
    await expect(page.locator('#checkout-modal-title')).toContainText('Resumen de suscripción');
    await expect(modalContent).toContainText('DJ Pro Club');
    await expect(modalContent).toContainText('$19.99');
    await expect(modalContent).toContainText('+50 créditos incluidos');

    // 5. Pulsar botón de pago PayPal
    const paypalBtn = page.locator('#paypal-checkout-button');
    await expect(paypalBtn).toBeVisible();
    await paypalBtn.click();

    // 6. Validar pantalla de confirmación exitosa
    const successView = page.locator('#checkout-success-view');
    await expect(successView).toBeVisible();
    await expect(successView.locator('#checkout-modal-title')).toContainText('¡Pago completado con éxito!');
    await expect(successView).toContainText('Se han acreditado 50 créditos a tu cuenta de estudio.');
    await expect(successView).toContainText('Membresía activa');

    // 7. Validar actualización reactiva de créditos en el header (35 + 50 = 85 créditos)
    await expect(headerBadge).toContainText('85');

    // 8. Capturar screenshot del éxito del checkout
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: 'e2e/screenshots/checkout-success.png',
      fullPage: true,
    });

    // 9. Navegar al Dashboard desde el modal
    const goToDashboardBtn = page.locator('#checkout-go-to-dashboard-btn');
    await expect(goToDashboardBtn).toBeVisible();
    await goToDashboardBtn.click();

    await page.waitForURL('/dashboard');
    await expect(page.locator('h1')).toContainText(username);
  });
});
