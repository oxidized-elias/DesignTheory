import {execFile} from 'node:child_process';
import {existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
const execute=promisify(execFile);
const probe='import instaloader; from PIL import Image, ImageOps';

// Share one setup attempt across requests. A failed attempt can be retried.
export function createPythonSetup({run=execute,exists=existsSync,env=process.env,platform=process.platform,venv=resolve('.venv'),requirements=fileURLToPath(new URL('./requirements.txt',import.meta.url))}={}) {
  const managed=join(env.INSTAGRAM_VENV_PATH || venv,platform==='win32'?'Scripts/python.exe':'bin/python');
  let pending=null;
  let status={state:'unchecked',message:''};
  const update=(state,message)=>{status={state,message};};
  async function available(python){try{await run(python,['-c',probe],{timeout:15_000,maxBuffer:1024*1024});return true;}catch{return false;}}
  async function setup(){
    update('checking','Checking the Instagram importer…');
    const candidates=[...new Set([env.PYTHON_PATH,exists(managed)?managed:null,platform==='win32'?'python':'python3'].filter(Boolean))];
    for(const python of candidates)if(await available(python)){update('ready','Instagram importer ready.');return python;}
    let base;
    for(const python of candidates){try{await run(python,['-c','import sys; assert sys.version_info >= (3, 9)'],{timeout:15_000,maxBuffer:1024*1024});base=python;break;}catch{}}
    if(!base)throw Error('Python 3.9 or newer is required on the server. Install Python or use the Docker image; the app will then install its Instagram packages automatically.');
    if(!exists(managed)){
      update('installing','Preparing the Instagram importer for first use…');
      try{await run(base,['-m','venv',env.INSTAGRAM_VENV_PATH || venv],{timeout:60_000,maxBuffer:1024*1024});}
      catch{throw Error('Automatic Instagram setup could not create its private Python environment. Ensure Python venv/ensurepip support is installed and the app can write to its virtual-environment directory.');}
    }
    update('installing','Installing Instagram support. First use may take a few minutes…');
    try{await run(managed,['-m','pip','install','--disable-pip-version-check','--no-input','--retries','1','--timeout','20','-r',requirements],{timeout:240_000,maxBuffer:4*1024*1024});}
    catch{throw Error('Automatic Instagram setup could not download or install its packages. Check the server’s internet access and write permissions, then retry.');}
    if(!await available(managed))throw Error('Instagram packages were installed but could not be loaded. Check the server’s Python installation, then retry.');
    update('ready','Instagram importer ready.');
    return managed;
  }
  return {
    status:()=>({...status}),
    ensure:()=>{if(!pending)pending=setup().catch(error=>{pending=null;update('error',error.message);throw error;});return pending;}
  };
}
export const instagramPython=createPythonSetup();
