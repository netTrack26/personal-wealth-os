import type {AppData} from './types';
export const demoData:AppData = {
 currency:'EUR',
 holdings:[
  {id:'h1',institution:'Intesa Sanpaolo',name:'Fondo comune Intesa – da configurare',isin:'',type:'Fondo comune',units:0,price:0,costBasis:0,pac:0,pacDay:5,color:'#b7f34a',notes:'Sostituire con nome, ISIN e posizione reale.',updatedAt:new Date().toISOString()},
  {id:'h2',institution:'Intesa Sanpaolo',name:'Fondo pensione Intesa – da configurare',isin:'',type:'Fondo pensione',units:0,price:0,costBasis:0,pac:0,pacDay:10,color:'#53c9ed',notes:'Valore posizione da rendiconto; contributi separati.',updatedAt:new Date().toISOString()},
  {id:'h3',institution:'Generali',name:'Fondo pensione Generali – da configurare',isin:'',type:'Fondo pensione',units:0,price:0,costBasis:0,pac:0,pacDay:15,color:'#ff555a',notes:'Inserire posizione effettiva e PAC mensile.',updatedAt:new Date().toISOString()},
  {id:'h4',institution:'Vanguard',name:'Vanguard S&P 500 UCITS ETF Acc (VUAA)',isin:'IE00BFMXXD54',type:'ETF',units:2,price:127.50,costBasis:255,pac:250,pacDay:6,color:'#a76cff',notes:'Posizione iniziale dimostrativa: 2 quote a 127,50 €. Verificare prezzo e quantità correnti.',updatedAt:new Date().toISOString()}
 ],
 transactions:[
  {id:'t1',holdingId:'h4',date:'2026-11-06',kind:'Acquisto',amount:255,units:2,price:127.5,note:'Acquisto iniziale indicato dall’utente; da confermare/importare',confirmed:true}
 ],
 quotes:[]
};
