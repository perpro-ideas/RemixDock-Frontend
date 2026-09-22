import { redirect } from 'next/navigation';

interface PlansPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Redirección transparente de respaldo hacia /pricing para mantener
 * compatibilidad absoluta con enlaces antiguos y marcadores existentes.
 */
export default async function PlansPage({ searchParams }: PlansPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(resolvedParams)) {
    if (typeof value === 'string') {
      query.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((v) => query.append(key, v));
    }
  }
  const queryString = query.toString();
  redirect('/pricing' + (queryString ? `?${queryString}` : ''));
}
