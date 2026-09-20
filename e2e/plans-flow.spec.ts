import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { Plan } from '../src/types/plan.types';

test.describe('Flujo E2E de Planes de Suscripción (REM-65 & REM-62)', () => {
  const adminEmail = 'admin@remixdock.com';
  const adminPassword = 'AdminPassword123!';

  let mockPlans: Plan[] = [
    {
      id: 'plan-starter-monthly',
      name: 'DJ Starter',
      description: 'Acceso inicial para DJs que buscan pistas seleccionadas.',
      type: 'MONTHLY',
      price: 9.99,
      durationDays: 30,
      creditsIncluded: 15,
      benefits: ['15 descargas mensuales', 'Acceso al catálogo general'],
      canRequestRemix: false,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'plan-pro-monthly',
      name: 'DJ Pro Club',
      description: 'Membresía para DJs de cabina con stems y peticiones.',
      type: 'MONTHLY',
      price: 19.99,
      durationDays: 30,
      creditsIncluded: 50,
      benefits: ['50 descargas mensuales', 'Stems multipista separados', '2 peticiones de remix'],
      canRequestRemix: true,
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'plan-vip-pack',
      name: 'Pack Productor 100',
      description: 'Paquete especial de créditos sin caducidad mensual.',
      type: 'CREDITS_PACK',
      price: 49.99,
      creditsIncluded: 100,
      benefits: ['100 créditos de descarga', 'Sin vencimiento de tiempo'],
      canRequestRemix: false,
      isActive: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  test.beforeEach(async ({ page }) => {
    // Asegurar directorio de capturas
    const screenshotsDir = path.resolve('e2e/screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // Mock de login para ADMIN
    await page.route('**/api/v1/auth/login', async (route) => {
        const body = route.request().postDataJSON() as { identifier?: string };
        const isAdmin = body.identifier?.includes('admin');

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'set-cookie': 'refreshToken=mock-admin-token; Path=/api/v1/auth; HttpOnly; SameSite=Lax',
          },
          body: JSON.stringify({
            accessToken: 'mock-jwt-token-admin-remixdock',
            user: {
              id: isAdmin ? 'admin-uuid-0001' : 'user-uuid-0002',
              email: body.identifier || 'admin@remixdock.com',
              username: isAdmin ? 'super_admin_dj' : 'regular_dj',
              role: isAdmin ? 'ADMIN' : 'USER',
              createdAt: '2026-01-01T00:00:00.000Z',
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

      // GET /api/v1/plans (Catálogo público: solo activos)
      await page.route('**/api/v1/plans', async (route) => {
        const activePlans = mockPlans.filter((p) => p.isActive);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(activePlans),
        });
      });

      // GET /api/v1/admin/plans (Admin: todos los planes)
      await page.route('**/api/v1/admin/plans', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockPlans),
          });
        } else if (route.request().method() === 'POST') {
          const body = route.request().postDataJSON() as Partial<Plan>;
          const created: Plan = {
            id: `plan-created-${Date.now()}`,
            name: body.name || 'Nuevo Plan',
            description: body.description,
            type: body.type || 'MONTHLY',
            price: Number(body.price) || 29.99,
            durationDays: body.durationDays,
            creditsIncluded: body.creditsIncluded,
            benefits: body.benefits || ['Beneficio incluido'],
            canRequestRemix: body.canRequestRemix ?? false,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          mockPlans = [created, ...mockPlans];
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(created),
          });
        }
      });

      // PATCH /api/v1/admin/plans/:id (Toggle o edición)
      await page.route('**/api/v1/admin/plans/*', async (route) => {
        const url = route.request().url();
        const planId = url.split('/').pop();
        const body = route.request().postDataJSON() as Partial<Plan>;

        mockPlans = mockPlans.map((p) => (p.id === planId ? { ...p, ...body, updatedAt: new Date().toISOString() } : p));
        const updated = mockPlans.find((p) => p.id === planId);

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updated),
        });
      });
  });

  test('debe explorar el catálogo público de planes /plans y capturar pantalla (REM-65)', async ({ page }) => {
    // 1. Navegar al catálogo público /plans
    await page.goto('/plans');
    await expect(page).toHaveTitle(/RemixDock/);

    // Verificar encabezado principal
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Planes diseñados para');
    await expect(page.getByText('DJs y Productores').first()).toBeVisible();

    // 2. Verificar que las tarjetas de planes activos se rendericen con sus precios
    await expect(page.getByText('DJ Starter').first()).toBeVisible();
    await expect(page.getByText('DJ Pro Club').first()).toBeVisible();
    await expect(page.getByText('$9.99')).toBeVisible();
    await expect(page.getByText('$19.99')).toBeVisible();

    // 3. Probar el filtro de facturación
    const monthlyTab = page.getByRole('tab', { name: 'Mensuales' });
    await monthlyTab.click();
    await expect(page.getByText('DJ Starter').first()).toBeVisible();

    // 4. Tomar captura de pantalla en e2e/screenshots/plans-catalog.png
    await page.evaluate(() => window.scrollTo(0, 0));
    const screenshotPath = path.resolve('e2e/screenshots/plans-catalog.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBeTruthy();
  });

  test('debe permitir a un ADMIN gestionar planes en /admin/plans, alternar estado y crear nuevo plan (REM-62)', async ({ page }) => {
    // 1. Iniciar sesión como administrador
    await page.goto('/login');
    await page.fill('input#identifier', adminEmail);
    await page.fill('input#password', adminPassword);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    // Redirección al Dashboard
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    await expect(page.getByRole('heading', { level: 1 })).toContainText('super_admin_dj');

    // Comprobar que aparezca el botón de acceso de administración en el header
    const adminPlansHeaderBtn = page.locator('#admin-plans-header-btn');
    await expect(adminPlansHeaderBtn).toBeVisible();

    // Comprobar acceso en tarjeta de Plataforma Musical
    const adminPlansCardLink = page.locator('#admin-plans-card-link');
    await expect(adminPlansCardLink).toBeVisible();

    // 2. Navegar a /admin/plans
    await adminPlansHeaderBtn.click();
    await page.waitForURL(/.*admin\/plans/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Gestión de Planes de Suscripción' })).toBeVisible();

    // 3. Verificar que la tabla de planes contenga las membresías
    const plansTable = page.locator('table');
    await expect(plansTable).toBeVisible();
    await expect(page.getByText('DJ Starter').first()).toBeVisible();
    await expect(page.getByText('Pack Productor 100').first()).toBeVisible();

    // 4. Probar alternar estado (Toggle Active/Paused)
    // El plan "DJ Starter" inicia como activo. Presionamos el botón "Pausar plan"
    const starterToggleBtn = page.locator('[data-toggle-btn="plan-starter-monthly"]');
    await expect(starterToggleBtn).toContainText('Pausar plan');
    await starterToggleBtn.click();

    // Verificar que el estado cambie a Pausado
    const statusAlert = page.locator('#admin-status-alert');
    await expect(statusAlert).toBeVisible();
    await expect(starterToggleBtn).toContainText('Activar plan');

    // 5. Crear un nuevo plan mediante el modal
    const createPlanBtn = page.locator('#create-plan-btn');
    await createPlanBtn.click();

    // Validar apertura del modal
    const modalTitle = page.locator('#modal-title');
    await expect(modalTitle).toBeVisible();

    // Completar campos del formulario
    const newPlanName = `Club Festival VIP ${Date.now()}`;
    await page.fill('input#plan-name', newPlanName);
    await page.fill('input#plan-description', 'Pase de acceso completo a remixes de festivales.');
    await page.fill('input#plan-price', '39.99');
    await page.fill('input#plan-duration', '30');
    await page.fill('input#plan-credits', '120');

    // Enviar creación
    const submitCreateBtn = page.locator('#submit-create-plan-btn');
    await submitCreateBtn.click();

    // Verificar confirmación y adición en la tabla
    await expect(modalTitle).not.toBeVisible();
    await expect(page.getByText(newPlanName).first()).toBeVisible();
  });
});
