import { getAccessToken, ApiClientError } from '@/lib/api-client';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export interface DownloadStemsZipOptions {
  token?: string | null;
  onProgress?: (status: 'packaging' | 'downloading' | 'completed') => void;
}

export interface DownloadStemsZipResult {
  fileName: string;
  sizeBytes?: number;
}

/**
 * Sanitiza una cadena de texto para uso seguro en nombres de archivo descargables.
 */
function sanitizeFileName(input: string): string {
  return input
    .replace(/[<>:"/\\|?*]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

/**
 * Extrae el nombre de archivo desde la cabecera HTTP Content-Disposition.
 */
function extractFileNameFromDisposition(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;

  // Busca filename*=UTF-8''... o filename="..."
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const standardMatch = disposition.match(/filename=["']?([^"';]+)["']?/i);
  if (standardMatch && standardMatch[1]) {
    return standardMatch[1].trim();
  }

  return fallback;
}

/**
 * Realiza la descarga autenticada en lote de los stems multipista de un remix en formato ZIP al vuelo.
 * Gestiona de forma limpia la memoria del navegador liberando el Blob URL tras disparar la descarga.
 */
export async function downloadStemsZip(
  trackId: string,
  trackTitle: string,
  options?: DownloadStemsZipOptions
): Promise<DownloadStemsZipResult> {
  const activeToken = options?.token !== undefined ? options.token : getAccessToken();

  const url = `${BASE_URL}/downloads/track/${trackId}/stems/zip`;

  const headers = new Headers();
  headers.set('Accept', 'application/zip, application/octet-stream, */*');

  if (activeToken) {
    headers.set('Authorization', `Bearer ${activeToken}`);
  }

  options?.onProgress?.('packaging');

  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let errorMessage = `No fue posible descargar los stems multipista (${response.status})`;
    let statusCode = response.status;
    let errorDetails: string[] | undefined;

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        const errorJson = await response.json();
        if (errorJson.message) {
          if (Array.isArray(errorJson.message)) {
            errorDetails = errorJson.message;
            errorMessage = errorJson.message.join('. ');
          } else {
            errorMessage = String(errorJson.message);
          }
        }
        if (errorJson.statusCode) {
          statusCode = errorJson.statusCode;
        }
      } catch {
        // Fallback al mensaje por defecto
      }
    } else {
      try {
        const text = await response.text();
        if (text) errorMessage = text;
      } catch {
        // Fallback al mensaje por defecto
      }
    }

    throw new ApiClientError(statusCode, errorMessage, undefined, errorDetails);
  }

  options?.onProgress?.('downloading');

  // Procesar respuesta binaria
  const blob = await response.blob();
  const fallbackFileName = `${sanitizeFileName(trackTitle || 'RemixDock_Track')}_Stems.zip`;
  const disposition = response.headers.get('content-disposition');
  const targetFileName = extractFileNameFromDisposition(disposition, fallbackFileName);

  // Disparo de descarga en el DOM
  if (typeof window !== 'undefined') {
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = targetFileName;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Liberación estricta de memoria para prevenir memory leaks en sesiones largas de cabina
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 1000);
  }

  options?.onProgress?.('completed');

  return {
    fileName: targetFileName,
    sizeBytes: blob.size,
  };
}
