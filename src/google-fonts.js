export const normalizeFamily=family=>typeof family==='string'?family.trim().replace(/\s+/g,' '):'';
export function googleFontLinks(family){
 const name=normalizeFamily(family);if(!name)return null;
 const query=new URLSearchParams({family:name,display:'swap'});
 return {css:`https://fonts.googleapis.com/css2?${query}`,specimen:`https://fonts.google.com/specimen/${encodeURIComponent(name).replace(/%20/g,'+')}`,search:`https://fonts.google.com/?${new URLSearchParams({query:name})}`};
}
export function createGoogleFontLoader({document:doc=globalThis.document,timeout=15_000}={}){
 const sheets=new Map();
 function invalidate(family){const name=normalizeFamily(family);const entry=sheets.get(name);if(entry){entry.link.remove();sheets.delete(name);}}
 function stylesheet(name){
  if(sheets.has(name))return sheets.get(name).promise;
  const link=doc.createElement('link');link.rel='stylesheet';link.href=googleFontLinks(name).css;link.referrerPolicy='no-referrer';
  const promise=new Promise((resolve,reject)=>{
   const finish=error=>{clearTimeout(timer);link.onload=null;link.onerror=null;error?reject(error):resolve();};
   const timer=setTimeout(()=>finish(Error('Google Fonts took too long to respond.')),timeout);
   link.onload=()=>finish();link.onerror=()=>finish(Error('This family is unavailable on Google Fonts, or the font service could not be reached.'));
   doc.head.appendChild(link);
  });
  const entry={link,promise};sheets.set(name,entry);
  promise.catch(()=>{if(sheets.get(name)===entry)invalidate(name);});
  return promise;
 }
 return {invalidate,async load(family,text='The art of a good idea.'){
  const name=normalizeFamily(family);if(!name)throw Error('Enter a Google Fonts family name.');
  if(!doc?.fonts?.load)throw Error('Cloud font previews are not supported by this browser.');
  await stylesheet(name);
  let timer;
  try{
   const faces=await Promise.race([doc.fonts.load(`400 16px ${JSON.stringify(name)}`,text),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('The font file took too long to load.')),timeout);})]);
   if(!faces.length)throw Error('Google Fonts did not supply a usable face for this family.');
   return name;
  }finally{clearTimeout(timer);}
 }};
}
export const googleFonts=createGoogleFontLoader();
