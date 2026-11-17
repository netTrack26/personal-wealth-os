import { NextResponse } from 'next/server';

export const revalidate = 21600;

const FUNDS = [
  { isin: 'LU2654117899', slug: 'eurizon-next-2-0-azioni-internazionali-g' },
  { isin: 'LU2653845524', slug: 'eurizon-next-2-0-obbligazioni-internazionali-g' },
  { isin: 'LU2178929886', slug: 'eurizon-next---allocazione-diversificata-70-g' },
  { isin: 'LU2274839039', slug: 'eurizon-next---strategia-megatrend-g' },
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

function parseQuote(html: string, isin: string) {
  const plain = decode(html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' '));

  const isinIndex = plain.indexOf(isin);
  const relevant = isinIndex >= 0 ? plain.slice(Math.max(0, isinIndex - 1500), isinIndex + 12000) : plain;
  const patterns = [
    /Valore\s+quota\s+al\s+(\d{2}\.\d{2}\.\d{4})\s*([\d.]+,\d{2,6})\s*€/i,
    /(\d{2}\.\d{2}\.\d{4})\s+([\d.]+,\d{2,6})\s*€/i,
  ];
  for (const pattern of patterns) {
    const match = relevant.match(pattern);
    if (!match) continue;
    const price = Number(match[2].replace(/\./g, '').replace(',', '.'));
    if (Number.isFinite(price) && price > 0) {
      return { isin, price, date: match[1].split('.').reverse().join('-'), source: 'Eurizon Capital – scheda ufficiale del comparto' };
    }
  }
  return null;
}

async function fetchFund(fund: typeof FUNDS[number]) {
  const url = `https://www.eurizoncapital.com/it-IT/offerta/prodotti/prodotti/${fund.slug}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PersonalWealthOS/1.0)',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'it-IT,it;q=0.9',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`Eurizon HTTP ${response.status} per ${fund.isin}`);
  const html = await response.text();
  const quote = parseQuote(html, fund.isin);
  if (!quote) throw new Error(`Valore quota non riconosciuto per ${fund.isin}`);
  return quote;
}

export async function GET() {
  try {
    const results = await Promise.allSettled(FUNDS.map(fetchFund));
    const quotes = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
    const errors = results.flatMap((result, index) => result.status === 'rejected'
      ? [`${FUNDS[index].isin}: ${result.reason instanceof Error ? result.reason.message : 'errore fonte'}`]
      : []);
    if (errors.length) {
      return NextResponse.json({
        ok: false,
        source: 'Eurizon Capital',
        error: 'Aggiornamento incompleto: nessuna quotazione parziale è stata applicata.',
        details: errors,
        quotes,
      }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      source: 'Eurizon Capital – schede ufficiali dei comparti',
      fetchedAt: new Date().toISOString(),
      quotes,
    }, {
      headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=3600' },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Errore nel recupero delle quotazioni Eurizon.',
    }, { status: 502 });
  }
}
