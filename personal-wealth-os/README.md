# PERSONAL WEALTH OS V2

Applicazione Next.js per il monitoraggio personale di investimenti, fondi pensione, ETF e PAC.

## Funzioni incluse
- Dashboard con patrimonio, capitale registrato, differenza e PAC pianificati.
- Creazione, modifica e cancellazione di strumenti finanziari.
- Registro movimenti con stato confermato / da confermare.
- Piani PAC con importo e giorno mensile.
- Analisi per strumento e istituto.
- Ricerca e filtri.
- Esportazione backup JSON e CSV; ripristino backup JSON.
- Salvataggio automatico locale nel browser tramite localStorage.
- Layout responsive desktop e mobile.

## Avvio
Richiede Node.js 20+.
```bash
npm install
npm run dev
```
Apri http://localhost:3000

## Deploy Vercel
1. Carica il contenuto della cartella in una repository GitHub nuova.
2. Importa la repository in Vercel.
3. Framework preset: Next.js. Build command: `npm run build`.

## Limiti da conoscere
Questa V2 è una prima applicazione operativa locale, non un aggregatore bancario. Non si collega ancora a Intesa Sanpaolo o Generali, non recupera NAV o prezzi in automatico e non esegue pagamenti PAC. I dati iniziali sono segnaposto dimostrativi: vanno verificati e sostituiti con rendiconti reali prima di usarli per decisioni finanziarie.

I dati restano nel browser/dispositivo in cui vengono inseriti. Prima di inserire dati patrimoniali reali, il passo successivo è integrare Supabase con autenticazione, Row Level Security, backup e gestione sicura delle chiavi. Non inserire credenziali bancarie, PIN o OTP.

## Logica dati
- Il valore posizione è `quote × prezzo/valore quota`.
- Il capitale registrato è un campo distinto, non dedotto automaticamente dai movimenti storici.
- Un movimento non confermato non modifica la posizione.
- Il PAC è un piano/promemoria, non un addebito automatico.
- Per fondi pensione privi di quote/quotazione si può rappresentare il valore posizione inserendo `1` come quantità e il valore corrente come prezzo unitario; il campo capitale versato resta separato.
