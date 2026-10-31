// Deterministic, weighted k-means over a reduced RGB histogram.
export function extractColors(pixels, count=6) {
 const histogram=new Map();
 for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]<128)continue;const rgb=[pixels[i],pixels[i+1],pixels[i+2]];const key=rgb.map(v=>v>>4).join(',');const old=histogram.get(key)||{sum:[0,0,0],weight:0};old.weight++;rgb.forEach((v,j)=>old.sum[j]+=v);histogram.set(key,old);}
 const points=[...histogram.values()].map(p=>({rgb:p.sum.map(v=>v/p.weight),weight:p.weight})).sort((a,b)=>b.weight-a.weight);
 if(!points.length)return [];
 const distance=(a,b)=>a.reduce((n,v,i)=>n+(v-b[i])**2,0);
 const centers=[points[0].rgb];
 while(centers.length<Math.min(count,points.length)){let best=null,score=0;for(const p of points){const d=Math.min(...centers.map(c=>distance(p.rgb,c)));const s=d*Math.sqrt(p.weight);if(d>400&&s>score){score=s;best=p.rgb;}}if(!best)break;centers.push(best);}
 let groups=[];
 for(let iteration=0;iteration<10;iteration++){groups=centers.map(()=>({sum:[0,0,0],weight:0}));for(const p of points){let nearest=0;centers.forEach((c,i)=>{if(distance(p.rgb,c)<distance(p.rgb,centers[nearest]))nearest=i;});const group=groups[nearest];group.weight+=p.weight;p.rgb.forEach((v,j)=>group.sum[j]+=v*p.weight);}groups.forEach((g,i)=>{if(g.weight)centers[i]=g.sum.map(v=>v/g.weight);});}
 return [...new Set(groups.map((g,i)=>({weight:g.weight,color:'#'+centers[i].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('').toUpperCase()})).filter(g=>g.weight).sort((a,b)=>b.weight-a.weight).map(g=>g.color))];
}
export async function prepareImage(source) {
 const image=new Image();image.src=source;
 await image.decode();
 const canvas=document.createElement('canvas');const scale=Math.min(1,1280/Math.max(image.width,image.height));canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);const cover=canvas.toDataURL('image/jpeg',.88);
 canvas.width=160;canvas.height=160;ctx.drawImage(image,0,0,160,160);return {image:cover,colors:extractColors(ctx.getImageData(0,0,160,160).data)};
}
