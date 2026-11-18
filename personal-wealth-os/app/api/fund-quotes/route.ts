import { NextResponse } from 'next/server';

export const revalidate = 0;

const FUNDS = [
 { isin:'LU2654117899', page:'2FADB869244' },
 { isin:'LU2653845524', page:'2FADB869236' },
 { isin:'LU2178929886', page:'2FADB602824' },
 { isin:'LU2274839039', page:'2FADB664080' },
];
const ETF = { isin:'IE00BFMXXD54', symbol:'VUAA.MI' };
const MIODOMANI = { key:'MIODOMANI-LT', url:'https://www.intesasanpaoloassicurazioni.com/it/prodotti-e-rendimenti/rendimenti-e-quotazioni/singola-quotazione.html?productId=PREU1' };

function parseItalianNumber(v:string){const n=Number(v.replace(/\./g,'').replace(',','.'));return Number.isFinite(n)?n:NaN;}
function parseDate(v:string){const m=v.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);if(!m)return null;const y=m[3].length===2?Number('20'+m[3]):Number(m[3]);return `${y}-${m[2]}-${m[1]}`;}
function parseBorsaQuote(html:string,isin:string){
 const t=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&euro;|&#8364;/g,'€').replace(/&amp;/g,'&').replace(/\s+/g,' ');
 if(!t.includes(isin))throw new Error(`ISIN ${isin} non trovato`);
 const patterns=[/([\d.]+,\d{2,6})\s+[+-]?[\d.]+,\d+\s*%\s+Valuta:\s*EUR\s+Data:\s*(\d{2}\/\d{2}\/\d{2,4})/i,/Ultima\s+([\d.]+,\d{2,6})[\s\S]{0,250}?Data:\s*(\d{2}\/\d{2}\/\d{2,4})/i];
 for(const p of patterns){const m=t.match(p);if(!m)continue;const price=parseItalianNumber(m[1]),date=parseDate(m[2]);if(Number.isFinite(price)&&price>0&&date)return {isin,price,date,source:'Borsa Italiana – scheda fondo'};}
 throw new Error(`NAV/data non riconosciuti per ${isin}`);
}

const MONTHS:Record<string,string>={gen:'01',gennaio:'01',feb:'02',febbraio:'02',mar:'03',marzo:'03',apr:'04',aprile:'04',mag:'05',maggio:'05',giu:'06',giugno:'06',lug:'07',luglio:'07',ago:'08',agosto:'08',set:'09',sett:'09',settembre:'09',ott:'10',ottobre:'10',nov:'11',novembre:'11',dic:'12',dicembre:'12'};
function parseMioDomani(html:string){
 const t=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&euro;|&#8364;/g,'€').replace(/&amp;/g,'&').replace(/\s+/g,' ');
 if(!/LINEA LUNGO TERMINE/i.test(t))throw new Error('La pagina ufficiale non identifica la Linea Lungo Termine');
 const m=t.match(/VALORE QUOTA\s+([\d.]+,\d{2,6})\s*€?\s+Aggiornato al\s+(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})/i);
 if(!m)throw new Error('Quotazione/data ufficiale Il Mio Domani non leggibile');
 const price=parseItalianNumber(m[1]),month=MONTHS[m[3].toLowerCase()];
 if(!Number.isFinite(price)||price<=0||!month)throw new Error('Valore quota o data Il Mio Domani non validi');
 return {isin:MIODOMANI.key,price,date:m[4]+'-'+month+'-'+m[2].padStart(2,'0'),source:'Intesa Sanpaolo Assicurazioni – Linea Lungo Termine (PREU1)'};
}
async function fetchMioDomani(){
 const res=await fetch(MIODOMANI.url,{headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',Accept:'text/html,application/xhtml+xml','Accept-Language':'it-IT,it;q=0.9,en;q=0.8'},cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw new Error('Intesa Sanpaolo Assicurazioni HTTP '+res.status);
 return parseMioDomani(await res.text());
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
 const coreResults=await Promise.allSettled([...FUNDS.map(fetchFund),fetchETF()]);
 const quotes=coreResults.flatMap(r=>r.status==='fulfilled'?[r.value]:[]);
 const jobs=[...FUNDS.map(f=>f.isin),ETF.isin];
 const errors=coreResults.flatMap((r,i)=>r.status==='rejected'?[ `${jobs[i]}: ${r.reason instanceof Error?r.reason.message:'errore fonte'}` ]:[]);
 if(errors.length||quotes.length!==5)return NextResponse.json({ok:false,source:'Borsa Italiana + Yahoo Finance',error:'Aggiornamento incompleto: nessuna quotazione è stata applicata.',details:errors,quotes},{status:502});
 let mioDomani=null;let mioDomaniWarning:string|null=null;
 try{mioDomani=await fetchMioDomani();quotes.push(mioDomani);}catch(e){mioDomaniWarning=e instanceof Error?e.message:'Fonte Intesa temporaneamente non disponibile';}
 return NextResponse.json({ok:true,source:'Borsa Italiana + Yahoo Finance'+(mioDomani?' + Intesa Sanpaolo Assicurazioni':''),fetchedAt:new Date().toISOString(),quotes,mioDomaniAvailable:Boolean(mioDomani),mioDomaniWarning},{headers:{'Cache-Control':'no-store'}});
}
