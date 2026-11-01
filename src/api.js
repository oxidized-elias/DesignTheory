export async function request(path, options = {}) {
  const response = await fetch('/api/' + path, {...options,headers:{'Content-Type':'application/json',...options.headers}});
  if (!response.ok) { const error = await response.json().catch(()=>({})); throw Error(error.error || 'Could not connect to the server.'); }
  return response.status === 204 ? null : response.json();
}
export const blank = (kind = 'palettes') => ({kind,folderId:'',name:'',description:'',colors:[],fonts:[],links:[],cover:'',favorite:false});
export function readFile(file) {
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read that file.'));reader.readAsDataURL(file);});
}
