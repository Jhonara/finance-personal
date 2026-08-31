export type Option={id:number;label:string;currency?:string;active?:boolean};
export const activeOptions=<T extends {id?:number;name?:string;active?:boolean;currency?:string}>(items:T[]|undefined)=> (items??[]).filter(x=>x.active&&x.id!==undefined).map(x=>({id:x.id!,label:x.name??'Sin nombre',currency:x.currency,active:true}));
export const transferDestinations=(source:Option|undefined,options:Option[])=>options.filter(x=>x.id!==source?.id&&x.currency===source?.currency);
