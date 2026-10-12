export const meta={name:'Ping',method:'GET',path:'/api/ping',description:'Comprueba que SaitamaAPI está funcionando.'};
export async function run(){return {status:true,message:'SaitamaAPI online',creator:'SAI',year:2026};}
