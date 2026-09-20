import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Flujo E2E de Catálogo Musical y Reproductor Global (feature/catalog-player-ui)', () => {
  const userEmail = 'dj_catalog_user@remixdock.com';
  const userPassword = 'ValidPassword123!';
  const username = 'dj_carlos_club';

  let isLoggedIn = false;

  test.beforeEach(async ({ page }) => {
    // Asegurar directorio para capturas
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
          'set-cookie': 'refreshToken=mock-refresh-token-catalog; Path=/api/v1/auth; HttpOnly; SameSite=Lax',
        },
        body: JSON.stringify({
          accessToken: 'mock-jwt-token-catalog',
          user: {
            id: 'mock-user-catalog-001',
            email: userEmail,
            username,
            role: 'USER',
            createdAt: '2026-03-01T10:00:00.000Z',
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    });

    // Mock de Refresh Token
    await page.route('**/api/v1/auth/refresh', async (route) => {
      if (isLoggedIn) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            accessToken: 'mock-jwt-token-catalog',
            user: {
              id: 'mock-user-catalog-001',
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
          body: JSON.stringify({ statusCode: 401, message: 'No refresh token' }),
        });
      }
    });

    // Mock de Créditos
    await page.route('**/api/v1/me/credits', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          balance: 30,
          history: [],
        }),
      });
    });

    // Mock de Planes (para navegación persistente a /plans)
    await page.route('**/api/v1/plans', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'plan-starter-monthly',
            name: 'DJ Starter',
            description: 'Acceso inicial para DJs',
            type: 'MONTHLY',
            price: 9.99,
            durationDays: 30,
            creditsIncluded: 15,
            benefits: ['15 descargas mensuales'],
            canRequestRemix: false,
            isActive: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ]),
      });
    });

    // Mock de Géneros
    await page.route('**/api/v1/genres', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'genre-tech-house', name: 'Tech House', slug: 'tech-house' },
          { id: 'genre-afro-house', name: 'Afro House', slug: 'afro-house' },
          { id: 'genre-melodic-techno', name: 'Melodic Techno', slug: 'melodic-techno' },
          { id: 'genre-nu-disco', name: 'Nu Disco & Funky', slug: 'nu-disco' },
        ]),
      });
    });

    // Mock de Pistas (Contrato paginado de backend)
    await page.route('**/api/v1/tracks', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'track-001',
              title: 'Titanium Extended Club',
              artist: 'David Guetta ft. Sia',
              remixer: 'Alesso Club Rework',
              version: 'Extended Mix',
              genreId: 'genre-tech-house',
              genre: { id: 'genre-tech-house', name: 'Tech House', slug: 'tech-house' },
              bpm: 126,
              musicalKey: '8A',
              key: '8A',
              duration: 214,
              previewUrl: 'https://actions.google.com/sounds/v1/science_fiction/scifi_laser.ogg',
              creditCost: 1,
              stemsCount: 4,
              stems: [
                { id: 'st-01', name: 'Kicks & Percs', type: 'DRUMS' },
                { id: 'st-02', name: 'Rolling Bassline', type: 'BASS' },
                { id: 'st-03', name: 'Lead Synths', type: 'SYNTH' },
                { id: 'st-04', name: 'Lead Acapella', type: 'VOCALS' },
              ],
              createdAt: '2026-03-01T10:00:00.000Z',
            },
            {
              id: 'track-002',
              title: 'Mwaki Ancestral Groove',
              artist: 'Zerb, Sofiya Nzau',
              remixer: 'Afro House Edition',
              version: 'Club Edit',
              genreId: 'genre-afro-house',
              genre: { id: 'genre-afro-house', name: 'Afro House', slug: 'afro-house' },
              bpm: 122,
              musicalKey: '4A',
              key: '4A',
              duration: 198,
              previewUrl: 'https://actions.google.com/sounds/v1/science_fiction/scifi_laser.ogg',
              creditCost: 1,
              stemsCount: 3,
              stems: [
                { id: 'st-05', name: 'Tribal Drums', type: 'DRUMS' },
                { id: 'st-06', name: 'Deep Sub', type: 'BASS' },
                { id: 'st-07', name: 'Swahili Vocals', type: 'VOCALS' },
              ],
              createdAt: '2026-03-05T12:00:00.000Z',
            },
            {
              id: 'track-003',
              title: 'Consciousness Horizon',
              artist: 'Anyma & Chris Avantgarde',
              remixer: 'VIP Festival Mix',
              version: 'VIP Mix',
              genreId: 'genre-melodic-techno',
              genre: { id: 'genre-melodic-techno', name: 'Melodic Techno', slug: 'melodic-techno' },
              bpm: 128,
              musicalKey: '11B',
              key: '11B',
              duration: 245,
              previewUrl: 'https://actions.google.com/sounds/v1/science_fiction/scifi_laser.ogg',
              creditCost: 2,
              stemsCount: 5,
              stems: [
                { id: 'st-08', name: 'Kick & Claps', type: 'DRUMS' },
                { id: 'st-09', name: 'Reese Bass', type: 'BASS' },
                { id: 'st-10', name: 'Arp & Melodies', type: 'SYNTH' },
                { id: 'st-11', name: 'Atmosphere FX', type: 'FX' },
                { id: 'st-12', name: 'Vocal Hook', type: 'VOCALS' },
              ],
              createdAt: '2026-03-08T15:30:00.000Z',
            },
          ],
          total: 3,
          page: 1,
          totalPages: 1,
        }),
      });
    });
  });

  test('01. Debe renderizar el catálogo /catalog con metadatos DJ y permitir filtrar por género y texto', async ({ page }) => {
    await page.goto('/catalog');
    await page.waitForLoadState('networkidle');

    // 1. Título y encabezado
    await expect(page.locator('#catalog-page-title')).toContainText('Catálogo Exclusivo para DJs');

    // 2. Verificar que el reproductor NO esté visible inicialmente (sin pista activa)
    const audioDock = page.locator('#audio-player-dock');
    await expect(audioDock).toBeHidden();

    // 3. Verificar listado inicial
    const trackCards = page.locator('#catalog-tracklist > div');
    await expect(trackCards).toHaveCount(3);
    await expect(page.locator('#track-title-track-001')).toContainText('Titanium Extended Club');
    await expect(page.locator('#track-bpm-track-001')).toContainText('126 BPM');
    await expect(page.locator('#track-key-track-001')).toContainText('8A');

    // 4. Filtrar por búsqueda textual ("Mwaki")
    const searchInput = page.locator('#track-search-input');
    await searchInput.fill('Mwaki');
    await expect(trackCards).toHaveCount(1);
    await expect(page.locator('#track-title-track-002')).toContainText('Mwaki Ancestral Groove');

    // Limpiar búsqueda
    await searchInput.fill('');
    await expect(trackCards).toHaveCount(3);

    // 5. Filtrar por género ("Tech House")
    const techHouseTab = page.locator('#genre-tab-tech-house');
    await techHouseTab.click();
    await expect(trackCards).toHaveCount(1);
    await expect(page.locator('#track-title-track-001')).toContainText('Titanium Extended Club');

    // Restablecer filtros
    const clearBtn = page.locator('#clear-filters-btn');
    await clearBtn.click();
    await expect(trackCards).toHaveCount(3);

    // 6. Filtrar por clave tonal Camelot ("11B")
    const keySelect = page.locator('#key-select');
    await keySelect.selectOption('11B');
    await expect(trackCards).toHaveCount(1);
    await expect(page.locator('#track-title-track-003')).toContainText('Consciousness Horizon');

    // Restablecer filtros
    await clearBtn.click();
    await expect(trackCards).toHaveCount(3);
  });

  test('02. Debe activar el reproductor persistente AudioPlayerDock al pulsar Play y reproducir audio', async ({ page }) => {
    await page.goto('/catalog');
    await page.waitForLoadState('networkidle');

    // 1. Pulsar Play en la primera pista
    const playBtn = page.locator('#play-track-btn-track-001');
    await expect(playBtn).toBeVisible();
    await playBtn.click();

    // 2. El AudioPlayerDock debe aparecer fijo en la parte inferior
    const audioDock = page.locator('#audio-player-dock');
    await expect(audioDock).toBeVisible();

    // 3. Validar metadatos en el reproductor inferior
    await expect(page.locator('#dock-track-title')).toHaveText('Titanium Extended Club');
    await expect(page.locator('#dock-track-artist')).toHaveText('David Guetta ft. Sia');
    await expect(page.locator('#dock-track-bpm')).toHaveText('126 BPM');
    await expect(page.locator('#dock-track-key')).toHaveText('8A');

    // 4. Alternar reproducción con el botón central del dock
    const dockPlayPauseBtn = page.locator('#dock-play-pause-btn');
    await expect(dockPlayPauseBtn).toBeVisible();
    await dockPlayPauseBtn.click(); // Pausar
    await dockPlayPauseBtn.click(); // Reanudar

    // 5. Capturar pantalla completa con el reproductor activo
    const screenshotPath = path.resolve('e2e/screenshots/catalog-player.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBe(true);

    // 6. Verificar persistencia de reproducción al navegar a /plans
    await page.click('#nav-plans-link');
    await page.waitForURL('/plans');

    // El dock debe seguir presente y mostrando la pista que estaba sonando
    await expect(page.locator('#audio-player-dock')).toBeVisible();
    await expect(page.locator('#dock-track-title')).toHaveText('Titanium Extended Club');
  });

  test('03. Debe abrir la ficha técnica y desglose de stems en TrackDetailModal', async ({ page }) => {
    await page.goto('/catalog');
    await page.waitForLoadState('networkidle');

    // 1. Pulsar en "Ver stems" de la pista Consciousness Horizon (5 stems)
    const viewStemsBtn = page.locator('#view-stems-btn-track-003');
    await expect(viewStemsBtn).toBeVisible();
    await viewStemsBtn.click();

    // 2. Modal abierto y accesible
    const modal = page.locator('#track-detail-modal-content');
    await expect(modal).toBeVisible();
    await expect(page.locator('#track-detail-modal-title')).toHaveText('Consciousness Horizon');

    // 3. Verificar lista de stems
    const stemsContainer = page.locator('#stems-list-container');
    await expect(stemsContainer).toContainText('Kick & Claps');
    await expect(stemsContainer).toContainText('Reese Bass');
    await expect(stemsContainer).toContainText('Arp & Melodies');
    await expect(stemsContainer).toContainText('Atmosphere FX');
    await expect(stemsContainer).toContainText('Vocal Hook');

    // 4. Cerrar modal mediante botón de cierre
    const closeBtn = page.locator('#close-track-detail-btn');
    await closeBtn.click();
    await expect(modal).toBeHidden();
  });
});
