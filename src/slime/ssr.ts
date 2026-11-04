// Shared view-projected depth ray tracing. World-space ray, progressive steps, bracket + binary refinement.
export const ssrGLSL=`
float ssrDepth(vec2 uv){return linearDepth(texture2D(uDepth,uv).r);}
vec3 ssrColour(vec2 uv){return texture2D(uBackground,uv).rgb;}
vec4 traceSSR(vec3 origin,vec3 direction){float t=.035,previous=0.;float previousDiff=-1.;
 for(int si=0;si<40;si++){if(uQuality<.5&&si>=24)break;vec3 point=origin+direction*t;vec4 clip=projectionMatrix*viewMatrix*vec4(point,1.);if(clip.w<uNear)break;vec2 uv=clip.xy/clip.w*.5+.5;if(min(uv.x,uv.y)<.002||max(uv.x,uv.y)>.998)break;float sceneZ=ssrDepth(uv),diff=clip.w-sceneZ;
 if(diff>0.&&previousDiff<=0.&&diff<.16+t*.12){float lo=previous,hi=t;vec2 hitUV=uv;for(int bi=0;bi<6;bi++){float mid=(lo+hi)*.5;vec4 mc=projectionMatrix*viewMatrix*vec4(origin+direction*mid,1.);hitUV=mc.xy/mc.w*.5+.5;if(mc.w>ssrDepth(hitUV))hi=mid;else lo=mid;}float edge=smoothstep(0.,.06,min(min(hitUV.x,hitUV.y),min(1.-hitUV.x,1.-hitUV.y)));return vec4(ssrColour(hitUV),edge*smoothstep(.015,.12,t));}
 previous=t;previousDiff=diff;t+=.026*pow(1.18,float(si));if(t>32.)break;}return vec4(0.);}
`;
