import { NextResponse } from 'next/server';

export const revalidate = 0;

const FUNDS = [
 { isin:'LU2654117899', page:'2FADB869244' },
 { isin:'LU2653845524', page:'2FADB869236' },
 { isin:'LU2178929886', page:'2FADB602824' },
 { isin:'LU2274839039', page:'2FADB664080' },
];
const ETF = { isin:'IE00BFMXXD54', symbol:'VUAA.MI' };

function parseItalianNumber(v:string){const n=Number(v.replace(/\./g,'').replace(',','.'));return Number.isFinite(n)?n:NaN;}
function parseDate(v:string){const m=v.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);if(!m)return null;const y=m[3].length===2?Number('20'+m[3]):Number(m[3]);return `${y}-${m[2]}-${m[1]}`;}
function parseBorsaQuote(html:string,isin:string){
 const t=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&euro;|&#8364;/g,'€').replace(/&amp;/g,'&').replace(/\s+/g,' ');
 if(!t.includes(isin))throw new Error(`ISIN ${isin} non trovato`);
 const patterns=[/([\d.]+,\d{2,6})\s+[+-]?[\d.]+,\d+\s*%\s+Valuta:\s*EUR\s+Data:\s*(\d{2}\/\d{2}\/\d{2,4})/i,/Ultima\s+([\d.]+,\d{2,6})[\s\S]{0,250}?Data:\s*(\d{2}\/\d{2}\/\d{2,4})/i];
 for(const p of patterns){const m=t.match(p);if(!m)continue;const price=parseItalianNumber(m[1]),date=parseDate(m[2]);if(Number.isFinite(price)&&price>0&&date)return {isin,price,date,source:'Borsa Italiana – scheda fondo'};}
 throw new Error(`NAV/data non riconosciuti per ${isin}`);
}
async function fetchFund(fund:typeof FUNDS[number]){
 const url=`https://www.borsaitaliana.it/borsa/fondi/dettaglio/${fund.page}.html`;
 const res=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',Accept:'text/html,application/xhtml+xml','Accept-Language':'it-IT,it;q=0.9,en;q=0.8',Referer:'https://www.borsaitaliana.it/'},cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw new Error(`Borsa Italiana HTTP ${res.status} per ${fund.isin}`);
 return parseBorsaQuote(await res.text(),fund.isin);
}
async function fetchETF(){
 const url=`https://query1.finance.yahoo.com/v8/finance/chart/${ETF.symbol}?range=1d&interval=1d`;
 const res=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'},cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw new Error(`Yahoo Finance HTTP ${res.status} per ${ETF.symbol}`);
 const json=await res.json();
 const result=json?.chart?.result?.[0];
 const meta=result?.meta;
 const price=meta?.regularMarketPrice;
 const currency=meta?.currency;
 const timestamp=meta?.regularMarketTime??result?.timestamp?.at(-1);
 if(typeof price!=='number'||!Number.isFinite(price)||price<=0)throw new Error('Yahoo Finance non ha restituito un prezzo valido per VUAA.MI');
 if(currency!=='EUR')throw new Error(`Valuta inattesa per VUAA.MI: ${currency||'sconosciuta'}`);
 const date=timestamp?new Date(timestamp*1000).toISOString().slice(0,10):new Date().toISOString().slice(0,10);
 return {isin:ETF.isin,price,date,source:'Yahoo Finance – VUAA.MI (quotazione di mercato, possibile ritardo)'};
}
export async function GET(){
 const results=await Promise.allSettled([...FUNDS.map(fetchFund),fetchETF()]);
 const quotes=results.flatMap(r=>r.status==='fulfilled'?[r.value]:[]);
 const jobs=[...FUNDS.map(f=>f.isin),ETF.isin];
 const errors=results.flatMap((r,i)=>r.status==='rejected'?[ `${jobs[i]}: ${r.reason instanceof Error?r.reason.message:'errore fonte'}` ]:[]);
 if(errors.length||quotes.length!==5)return NextResponse.json({ok:false,source:'Borsa Italiana + Yahoo Finance',error:'Aggiornamento incompleto: nessuna quotazione è stata applicata.',details:errors,quotes},{status:502});
 return NextResponse.json({ok:true,source:'Borsa Italiana (fondi) + Yahoo Finance (VUAA)',fetchedAt:new Date().toISOString(),quotes},{headers:{'Cache-Control':'no-store'}});
}
