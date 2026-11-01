export function defaultOllamaSettings(env=process.env){
 return {enabled:!!env.OLLAMA_MODEL,url:(env.OLLAMA_URL||'http://127.0.0.1:11434').replace(/\/$/,''),model:env.OLLAMA_MODEL||''};
}
export function validateOllamaSettings(input){
 if(!input||typeof input.enabled!=='boolean')throw Error('Choose whether vision analysis is enabled.');
 let url;try{url=new URL(input.url);}catch{throw Error('Enter the full Ollama server URL, including http:// or https://.');}
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw Error('Use an HTTP or HTTPS server URL without credentials, query parameters, or fragments.');
 if(typeof input.model!=='string'||input.model.length>200||/[\r\n]/.test(input.model))throw Error('Enter a valid installed model name.');
 const model=input.model.trim();if(input.enabled&&!model)throw Error('Choose an installed vision model before enabling analysis.');
 return {enabled:input.enabled,url:url.href.replace(/\/$/,''),model};
}
export function readOllamaSettings(db,env=process.env){
 const row=db.prepare('SELECT document FROM settings WHERE id=?').get('ollama');return row?JSON.parse(row.document):defaultOllamaSettings(env);
}
export function saveOllamaSettings(db,input){
 const settings=validateOllamaSettings(input);db.prepare('INSERT INTO settings (id,document) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET document=excluded.document').run('ollama',JSON.stringify(settings));return settings;
}
export function resetOllamaSettings(db){db.prepare('DELETE FROM settings WHERE id=?').run('ollama');return readOllamaSettings(db);}
export async function testOllamaSettings(input,{send=fetch}={}){
 const config=validateOllamaSettings(input);
 async function call(path,body){
  let response;try{response=await send(config.url+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(15_000)});}catch{throw Error('Could not reach Ollama. Check the server address and that it is reachable from the application server.');}
  if(!response.ok)throw Error(path==='/api/show'&&response.status===404?'The selected model was not found. Choose a model installed on this server.':`Ollama returned HTTP ${response.status}. Check the server address and access settings.`);
  try{return await response.json();}catch{throw Error('The server did not return a valid Ollama response.');}
 }
 const list=await call('/api/tags');if(!Array.isArray(list.models))throw Error('The server did not return an Ollama model list.');
 const models=[...new Set(list.models.map(item=>item?.name||item?.model).filter(name=>typeof name==='string'&&name))];
 if(!config.model)return {models,vision:null,message:`Connected to Ollama. Found ${models.length} installed models. Choose a vision model, then test it.`};
 const details=await call('/api/show',{model:config.model});
 if(Array.isArray(details.capabilities)&&!details.capabilities.includes('vision'))throw Error('The selected model does not support images. Choose a vision-capable model.');
 const vision=Array.isArray(details.capabilities)?true:null;
 return {models,vision,message:vision?'Connected. The selected model supports vision.':'Connected to the selected model, but this server did not report its vision capabilities. Verify that it supports images before importing.'};
}
