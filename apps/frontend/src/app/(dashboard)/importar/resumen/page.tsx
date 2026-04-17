'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ResumenImportacion } from '@/components/importar/resumen-importacion';
import { clearImportResult, readImportResult, type ImportResultPayload } from '@/lib/importar/draft';

export default function ImportarResumenPage() {
  const router = useRouter();
  const [resultado, setResultado] = useState<ImportResultPayload | null>(null);

  useEffect(() => {
    const r = readImportResult();
    if (!r) {
      router.replace('/importar');
      return;
    }
    setResultado(r);
    clearImportResult();
  }, [router]);

  if (!resultado) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <ResumenImportacion resultado={resultado} />
    </div>
  );
}
