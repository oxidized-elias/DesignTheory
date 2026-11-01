import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extractColors} from '../src/colors.js';
import {photoResults} from '../src/post-results.js';
import {readFileSync} from 'node:fs';import {inflateSync} from 'node:zlib';
function decodePNG(path){const file=readFileSync(path);let pos=8,width,height,channels;const chunks=[];while(pos<file.length){const size=file.readUInt32BE(pos),name=file.toString('ascii',pos+4,pos+8),data=file.subarray(pos+8,pos+8+size);if(name==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);if(data[8]!==8||![2,6].includes(data[9]))throw Error('Expected an 8-bit RGB/RGBA PNG');channels=data[9]===6?4:3;}if(name==='IDAT')chunks.push(data);pos+=size+12;}const raw=inflateSync(Buffer.concat(chunks)),stride=width*channels,decoded=new Uint8Array(stride*height);let source=0;const paeth=(a,b,c)=>{const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);return da<=db&&da<=dc?a:db<=dc?b:c;};for(let y=0;y<height;y++){const filter=raw[source++];for(let x=0;x<stride;x++){const offset=y*stride+x,a=x>=channels?decoded[offset-channels]:0,b=y?decoded[offset-stride]:0,c=y&&x>=channels?decoded[offset-stride-channels]:0;decoded[offset]=(raw[source++]+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c)))&255;}}const pixels=new Uint8ClampedArray(width*height*4);for(let i=0;i<width*height;i++){pixels[i*4]=decoded[i*channels];pixels[i*4+1]=decoded[i*channels+1];pixels[i*4+2]=decoded[i*channels+2];pixels[i*4+3]=channels===4?decoded[i*channels+3]:255;}return {pixels,width,height};}

test('the supplied four-swatch post excludes text, arrows, navigation dots, and surrounding chrome',()=>{
 const {pixels,width,height}=decodePNG(new URL('./fixtures/four-swatches.png',import.meta.url));
 assert.deepEqual(extractColors(pixels,{width,height}),['#EEC07B','#0F3360','#15213D','#191A2E']);
 // Match the browser's smaller, aspect-preserving nearest-neighbor analysis image.
 const scale=320/Math.max(width,height),w=Math.round(width*scale),h=Math.round(height*scale),sample=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const source=(Math.min(height-1,Math.floor((y+.5)*height/h))*width+Math.min(width-1,Math.floor((x+.5)*width/w)))*4;sample.set(pixels.subarray(source,source+4),(y*w+x)*4);}
 assert.deepEqual(extractColors(sample,{width:w,height:h}),['#EEC07B','#0F3360','#15213D','#191A2E']);
});
test('swatch extraction follows the displayed count rather than filling a six-color quota',()=>{
 const palette=['#EFC07B','#0F3460','#16213E','#1A1A2E','#CA5860','#74A97B','#D6E3D8','#A95927','#834AB5','#368C9E','#CAB343','#C291BB'];
 for(const count of [1,4,8,12]){
  const width=240,height=240,pixels=new Uint8ClampedArray(width*height*4);for(let i=0;i<pixels.length;i+=4)pixels.set([8,12,18,255],i);
  const columns=Math.ceil(Math.sqrt(count)),rows=Math.ceil(count/columns),cellWidth=width/columns,cellHeight=height/rows;
  for(let index=0;index<count;index++){const color=palette[index].slice(1).match(/../g).map(v=>parseInt(v,16));for(let y=Math.floor(index/columns)*cellHeight+5;y<(Math.floor(index/columns)+1)*cellHeight-5;y++)for(let x=(index%columns)*cellWidth+5;x<((index%columns)+1)*cellWidth-5;x++)pixels.set([...color,255],(Math.floor(y)*width+Math.floor(x))*4);}
  assert.deepEqual(extractColors(pixels,{width,height}),palette.slice(0,count));
 }
});
test('a detected four-color palette replaces the fallback instead of creating a second padded palette',()=>{
 const colors=['#EFC07B','#0F3460','#16213E','#1A1A2E'];const input={name:'Post',colors:[...colors,'#FFFFFF','#000000'],analysis:{palettes:[{name:'Four swatches',colors}],pairings:[]}};
 const results=photoResults(input);assert.equal(results.length,1);assert.deepEqual(results[0].colors,colors);
 assert.equal(photoResults({...input,analysis:{palettes:[],pairings:[]}}).length,1);
});
