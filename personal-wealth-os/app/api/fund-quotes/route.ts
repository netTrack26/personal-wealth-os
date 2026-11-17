import { NextResponse } from 'next/server';
export const revalidate = 21600;
const FUNDS = [
 { isin:'LU2654117899', page:'2FADB869244' },
 { isin:'LU2653845524', page:'2FADB869236' },
 { isin:'LU2178929886', page:'2FADB602824' },
 { isin:'LU2274839039', page:'2FADB664080' },
];
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
export async function GET(){
 const results=await Promise.allSettled(FUNDS.map(fetchFund));
 const quotes=results.flatMap(r=>r.status==='fulfilled'?[r.value]:[]);
 const errors=results.flatMap((r,i)=>r.status==='rejected'?[ `${FUNDS[i].isin}: ${r.reason instanceof Error?r.reason.message:'errore fonte'}` ]:[]);
 if(errors.length)return NextResponse.json({ok:false,source:'Borsa Italiana',error:'Aggiornamento incompleto: nessuna quotazione parziale è stata applicata.',details:errors,quotes},{status:502});
 return NextResponse.json({ok:true,source:'Borsa Italiana – schede dei fondi',fetchedAt:new Date().toISOString(),quotes},{headers:{'Cache-Control':'s-maxage=21600, stale-while-revalidate=3600'}});
}