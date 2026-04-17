'use client';

import bwipjs from 'bwip-js';
import { useEffect, useRef } from 'react';

import { formatCurrency } from '@/lib/utils/formatters';

interface Props {
  nombre: string;
  codigo: string;
  precio: number;
  sku?: string;
  sizeMm?: '50x30' | '80x40';
}

export function BarcodeLabel({ nombre, codigo, precio, sku, sizeMm = '50x30' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !codigo) return;
    try {
      bwipjs.toCanvas(canvasRef.current, {
        bcid: codigo.length === 8 ? 'ean8' : 'ean13',
        text: codigo,
        scale: 2,
        height: 10,
        includetext: true,
        textxalign: 'center',
      });
    } catch {
      // invalid barcode — canvas stays blank
    }
  }, [codigo]);

  const isSmall = sizeMm === '50x30';

  return (
    <div
      className={`border border-dashed border-gray-300 flex flex-col items-center justify-center p-2 ${
        isSmall ? 'w-[189px] h-[113px]' : 'w-[302px] h-[151px]'
      }`}
    >
      <p className={`font-semibold text-center leading-tight truncate w-full ${isSmall ? 'text-[10px]' : 'text-xs'}`}>
        {nombre}
      </p>
      <canvas ref={canvasRef} className={isSmall ? 'max-h-[40px]' : 'max-h-[60px]'} />
      <p className={`font-bold ${isSmall ? 'text-sm' : 'text-base'}`}>
        {formatCurrency(precio)}
      </p>
      {sku && (
        <p className="text-[8px] text-muted-foreground font-mono">{sku}</p>
      )}
    </div>
  );
}
