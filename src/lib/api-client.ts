import { ApiErrorResponse } from '@/types/auth.types';

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly errorName?: string;
  public readonly details?: string[];

  constructor(statusCode: number, message: string, errorName?: string, details?: string[]) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.errorName = errorName;
    this.details = details;
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export interface ApiFetchOptions extends RequestInit {
  token?: string | null;
}

/**
 * Cliente HTTP tipado con soporte de credenciales seguras (cookies httpOnly)
 * y parseo robusto de respuestas y excepciones estándar de NestJS.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { token, headers: customHeaders, ...restOptions } = options;

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(customHeaders);
  if (!headers.has('Content-Type') && restOptions.body && typeof restOptions.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...restOptions,
    headers,
    credentials: 'include',
  });

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type');
  const isJson = contentType !== null && contentType.includes('application/json');

  if (!response.ok) {
    let errorMessage = `Error en la petición (${response.status} ${response.statusText})`;
    let errorName: string | undefined;
    let details: string[] | undefined;

    if (isJson) {
      try {
        const errorData = (await response.json()) as ApiErrorResponse;
        if (Array.isArray(errorData.message)) {
          details = errorData.message;
          errorMessage = errorData.message.join('. ');
        } else if (typeof errorData.message === 'string') {
          errorMessage = errorData.message;
        }
        errorName = errorData.error;
      } catch {
        // Fallback al mensaje por defecto si el cuerpo JSON no se puede parsear
      }
    } else {
      try {
        const text = await response.text();
        if (text) errorMessage = text;
      } catch {
        // Fallback al mensaje por defecto
      }
    }

    throw new ApiClientError(response.status, errorMessage, errorName, details);
  }

  if (!isJson) {
    return (await response.text()) as unknown as T;
  }

  return (await response.json()) as T;
}
