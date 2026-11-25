/** Independent valley floor, with a shallow ford south of the covered bridge. */
export const riverLevel=-.38;
export const riverCenter=(z:number)=>-6.4+.96*Math.sin((z+6)*.16)-3.6*Math.max(0,(z-5)/21);
export function riverDistance(x:number,z:number){
  const end=Math.max(0,z-18);
  return Math.hypot(x-riverCenter(Math.min(z,18)),end);
}
export function valleyHeight(x:number,z:number){
  const edge=riverDistance(x,z),width=2.85+.28*Math.sin(z*.21);
  const rise=Math.max(0,Math.min(1,(edge-width+1.7)/2.55));
  const terrace=.035*Math.sin(x*.3)*Math.sin(z*.24)*Math.min(1,Math.max(0,Math.hypot(x-10,z-17)-10));
  const hill=2.5*Math.exp(-((x+20)**2+(z+21)**2)/68);
  const ford=.78*Math.exp(-((z+21)**2)/2.4);
  return (-1.65+ford)*(1-rise*rise*(3-2*rise))+(hill+terrace)*rise;
}
