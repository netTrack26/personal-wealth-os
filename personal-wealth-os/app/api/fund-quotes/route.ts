import { NextResponse } from 'next/server';

export const revalidate = 21600;

const ISINS = [
  'LU2654117899',
  'LU2653845524',
  'LU2178929886',
  'LU2274839039',
];

function decode(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&euro;/g, '€')
    .replace(/&#8364;/g, '€')
    .replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function parseFundRow(html: string, isin: string) {
  const index = html.indexOf(isin);
  if (index < 0) return null;
  const fragment = html.slice(index, index + 5000);
  const text = decode(fragment.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
  const datePrice = /(\d{2}\.\d{2}\.\d{4})\s+([\d.]+,\d{2,6})\s*€/g;
  const matches = [...text.matchAll(datePrice)];
  if (!matches.length) return null;
  const [, date, rawPrice] = matches[0];
  const price = Number(rawPrice.replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(price) || price <= 0) return null;
  return { isin, price, date: date.split('.').reverse().join('-'), source: 'Eurizon Capital – Valori quota' };
}

export async function GET() {
  try {
    const response = await fetch('https://www.eurizoncapital.com/it-IT/offerta/valori-quota', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PersonalWealthOS/1.0)', Accept: 'text/html' },
      next: { revalidate: 21600 },
    });
    if (!response.ok) throw new Error(`Eurizon HTTP ${response.status}`);
    const html = await response.text();
    const quotes = ISINS.map((isin) => parseFundRow(html, isin));
    const missing = quotes.filter((quote) => !quote);
    if (missing.length) {
      return NextResponse.json({ ok: false, source: 'Eurizon Capital', error: 'Uno o più valori quota non sono stati riconosciuti nella pagina ufficiale.', missing: missing.map((x, i) => ISINS[quotes.indexOf(x)]), quotes: quotes.filter(Boolean) }, { status: 502 });
    }
    return NextResponse.json({ ok: true, source: 'Eurizon Capital – Valori quota', fetchedAt: new Date().toISOString(), quotes }, { headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=3600' } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Errore nel recupero delle quotazioni.' }, { status: 502 });
  }
}
