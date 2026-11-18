export type AssetType = 'Fondo comune'|'Fondo pensione'|'ETF'|'Liquidità'|'Altro';
export type Holding = {id:string; institution:string; name:string; isin:string; type:AssetType; units:number; price:number; costBasis:number; totalContributed?:number; pac:number; pacDay:number; color:string; notes:string; updatedAt:string};
export type Transaction = {id:string; holdingId:string; date:string; kind:'Versamento'|'Acquisto'|'Rimborso'|'Commissione'|'Rettifica'; amount:number; units:number; price:number; note:string; confirmed:boolean};
export type Quote = {holdingId:string; date:string; price:number; source:string};
export type Snapshot = {id:string; date:string; total:number; invested:number; note:string};
export type AppData = {holdings:Holding[]; transactions:Transaction[]; quotes:Quote[]; snapshots?:Snapshot[]; currency:string; goalSaved?:number};
