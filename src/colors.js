const hex=rgb=>'#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
const colorKey=(pixels,i)=>(pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2];
const fromKey=key=>[(key>>16)&255,(key>>8)&255,key&255];

// Flat connected regions distinguish designed swatches from labels and image chrome.
function swatchRegions(pixels,width,height){
 const size=width*height,visited=new Uint8Array(size),queue=new Int32Array(size),regions=[];
 const threshold=Math.max(4,size*.008);
 for(let start=0;start<size;start++){
  if(visited[start]||pixels[start*4+3]<128)continue;
  let head=0,tail=1;queue[0]=start;visited[start]=1;
  const seed=fromKey(colorKey(pixels,start*4)),counts=new Map();let left=width,right=0,top=height,bottom=0,count=0;
  while(head<tail){
   const index=queue[head++],x=index%width,y=Math.floor(index/width),offset=index*4;
   count++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
   const key=colorKey(pixels,offset);counts.set(key,(counts.get(key)||0)+1);
   const neighbors=[x?index-1:-1,x+1<width?index+1:-1,y?index-width:-1,y+1<height?index+width:-1];
   for(const next of neighbors){if(next<0||visited[next])continue;const n=next*4;if(pixels[n+3]<128)continue;if(Math.max(Math.abs(pixels[n]-seed[0]),Math.abs(pixels[n+1]-seed[1]),Math.abs(pixels[n+2]-seed[2]))>8)continue;visited[next]=1;queue[tail++]=next;}
  }
  const boxWidth=right-left+1,boxHeight=bottom-top+1;
  const sides=Number(left===0)+Number(right===width-1)+Number(top===0)+Number(bottom===height-1);
  const frame=sides>=3&&boxWidth>width*.9&&boxHeight>height*.9&&count<size*.8;
  if(count<threshold||boxWidth<width*.06||boxHeight<height*.04||count/(boxWidth*boxHeight)<.55||frame)continue;
  let mode=0,weight=0;for(const [key,n] of counts)if(n>weight){mode=key;weight=n;}
  regions.push({color:hex(fromKey(mode)),count,left,top});
 }
 const coverage=regions.reduce((n,r)=>n+r.count,0)/size;
 if(!regions.length||coverage<.35)return [];
 regions.sort((a,b)=>Math.abs(a.top-b.top)<height*.025?a.left-b.left:a.top-b.top);
 return [...new Set(regions.map(r=>r.color))];
}

export function extractColors(pixels,{width,height}={}){
 if(width&&height&&width*height*4===pixels.length){const swatches=swatchRegions(pixels,width,height);if(swatches.length)return swatches;}
 // Photographic fallback: retain significant color modes, without filling a fixed quota.
 const histogram=new Map();let total=0;
 for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]<128)continue;total++;const key=[pixels[i]>>4,pixels[i+1]>>4,pixels[i+2]>>4].join(',');const bucket=histogram.get(key)||{weight:0,values:new Map()};bucket.weight++;const color=colorKey(pixels,i);bucket.values.set(color,(bucket.values.get(color)||0)+1);histogram.set(key,bucket);}
 const buckets=[...histogram.values()].sort((a,b)=>b.weight-a.weight);
 const colors=[];
 for(const bucket of buckets){if(bucket.weight<Math.max(1,total*.015)&&colors.length)continue;let mode=0,weight=0;for(const [key,n] of bucket.values)if(n>weight){mode=key;weight=n;}const rgb=fromKey(mode);if(!colors.some(c=>Math.max(...c.map((v,i)=>Math.abs(v-rgb[i])))<=8))colors.push(rgb);}
 return colors.map(hex);
}
export async function prepareImage(source){
 const image=new Image();image.src=source;await image.decode();
 const canvas=document.createElement('canvas');const scale=Math.min(1,1280/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);const cover=canvas.toDataURL('image/jpeg',.88);
 const sampleScale=Math.min(1,320/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*sampleScale));canvas.height=Math.max(1,Math.round(image.height*sampleScale));ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,canvas.width,canvas.height);
 return {image:cover,colors:extractColors(ctx.getImageData(0,0,canvas.width,canvas.height).data,{width:canvas.width,height:canvas.height})};
}
