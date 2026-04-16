'use client';

import { useEffect, useRef } from 'react';

import { formatCurrency } from '@/lib/utils/formatters';

interface TicketItem {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  unidad?: string;
}

interface TicketData {
  tenantNombre: string;
  tenantCuit?: string;
  tenantDomicilio?: string;
  tipoComprobante: string;
  numero: number;
  fecha: string;
  clienteNombre: string;
  items: TicketItem[];
  subtotal: number;
  descuento?: number;
  ivaMonto?: number;
  total: number;
  metodoPago: string;
  vuelto?: number;
  cae?: string | null;
  caeVencimiento?: string | null;
}

interface Props {
  data: TicketData;
  ancho?: '80mm' | '57mm';
  autoPrint?: boolean;
  onPrinted?: () => void;
}

export function TicketTermico({ data, ancho = '80mm', autoPrint = false, onPrinted }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!autoPrint || !frameRef.current) return;
    const timer = setTimeout(() => {
      frameRef.current?.contentWindow?.print();
      onPrinted?.();
    }, 300);
    return () => clearTimeout(timer);
  }, [autoPrint, onPrinted]);

  const anchoPixels = ancho === '80mm' ? '302px' : '215px';
  const fontSize = ancho === '80mm' ? '12px' : '10px';

  const html = buildTicketHTML(data, anchoPixels, fontSize);

  return (
    <iframe
      ref={frameRef}
      srcDoc={html}
      className="hidden"
      title="Ticket térmico"
    />
  );
}

export function printTicket(data: TicketData, ancho: '80mm' | '57mm' = '80mm') {
  const anchoPixels = ancho === '80mm' ? '302px' : '215px';
  const fontSize = ancho === '80mm' ? '12px' : '10px';
  const html = buildTicketHTML(data, anchoPixels, fontSize);

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) return;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
}

function buildTicketHTML(data: TicketData, ancho: string, fontSize: string): string {
  const tipoLabel =
    data.tipoComprobante === 'ticket'
      ? 'TICKET'
      : data.tipoComprobante.replace('_', ' ').toUpperCase();

  const itemsHtml = data.items
    .map(
      (it) => `
      <tr>
        <td style="text-align:left">${escapeHtml(it.nombre)}</td>
        <td style="text-align:right">${it.cantidad}${it.unidad && it.unidad !== 'unidad' ? ` ${it.unidad}` : ''}</td>
        <td style="text-align:right">${formatCurrency(it.precio_unitario)}</td>
        <td style="text-align:right">${formatCurrency(it.subtotal)}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 0; size: ${ancho} auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${fontSize};
      width: ${ancho};
      padding: 4px;
      color: #000;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .sep { border-top: 1px dashed #000; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 1px 0; vertical-align: top; }
    .total-row td { font-weight: bold; font-size: 1.2em; padding-top: 4px; }
  </style>
</head>
<body>
  <div class="center bold" style="font-size:1.3em">${escapeHtml(data.tenantNombre)}</div>
  ${data.tenantCuit ? `<div class="center">CUIT: ${escapeHtml(data.tenantCuit)}</div>` : ''}
  ${data.tenantDomicilio ? `<div class="center">${escapeHtml(data.tenantDomicilio)}</div>` : ''}
  <div class="sep"></div>
  <div class="center bold">${tipoLabel}</div>
  <div class="center">Nro: ${String(data.numero).padStart(8, '0')}</div>
  <div class="center">Fecha: ${data.fecha}</div>
  <div>Cliente: ${escapeHtml(data.clienteNombre)}</div>
  <div class="sep"></div>
  <table>
    <thead>
      <tr style="border-bottom:1px solid #000">
        <td style="text-align:left"><b>Desc.</b></td>
        <td style="text-align:right"><b>Cant.</b></td>
        <td style="text-align:right"><b>P.U.</b></td>
        <td style="text-align:right"><b>Subt.</b></td>
      </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div class="sep"></div>
  <table>
    <tr>
      <td>Subtotal</td>
      <td style="text-align:right">${formatCurrency(data.subtotal)}</td>
    </tr>
    ${data.descuento && data.descuento > 0 ? `<tr><td>Descuento</td><td style="text-align:right">-${formatCurrency(data.descuento)}</td></tr>` : ''}
    ${data.ivaMonto && data.ivaMonto > 0 ? `<tr><td>IVA 21%</td><td style="text-align:right">${formatCurrency(data.ivaMonto)}</td></tr>` : ''}
    <tr class="total-row">
      <td>TOTAL</td>
      <td style="text-align:right">${formatCurrency(data.total)}</td>
    </tr>
  </table>
  <div class="sep"></div>
  <div>Método de pago: ${escapeHtml(data.metodoPago)}</div>
  ${data.vuelto && data.vuelto > 0 ? `<div class="bold">Vuelto: ${formatCurrency(data.vuelto)}</div>` : ''}
  ${data.cae ? `<div class="sep"></div><div>CAE: ${escapeHtml(data.cae)}</div>` : ''}
  ${data.caeVencimiento ? `<div>Vto. CAE: ${escapeHtml(data.caeVencimiento)}</div>` : ''}
  <div class="sep"></div>
  <div class="center" style="margin-top:4px">¡Gracias por su compra!</div>
  <div class="center" style="font-size:0.8em;margin-top:2px">SmartStock POS</div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
