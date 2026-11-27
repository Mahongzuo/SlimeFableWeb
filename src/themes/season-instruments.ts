import type {InstrumentPlay,Pin} from '../templates/season-instruments';
type Ctx=CanvasRenderingContext2D;
/** Original illustrations drawn on the plate. All geometry lives in plate coordinates. */
function pen(g:Ctx,ink:string,accent:string){
  const shape=(points:readonly Pin[],fill=ink,close=true)=>{g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));
    if(close){g.closePath();g.fillStyle=fill;g.fill();}else{g.strokeStyle=fill;g.lineWidth=2;g.stroke();}};
  const rect=(x:number,y:number,w:number,h:number,c=ink)=>{g.fillStyle=c;g.fillRect(x,y,w,h);};
  const ellipse=(x:number,y:number,rx:number,ry:number,c=ink)=>{g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=c;g.fill();};
  const arc=(x:number,y:number,rx:number,ry:number,c=ink,start=0,end=Math.PI*2)=>{g.beginPath();g.ellipse(x,y,rx,ry,-.12,start,end);g.strokeStyle=c;g.lineWidth=2;g.stroke();};
  function ship(x:number,y:number,scale=1){g.save();g.translate(x,y);g.scale(scale,scale);shape([[-92,2],[100,-5],[78,16],[-67,20]]);rect(-49,-17,52,17);rect(-32,-30,26,13);rect(20,-18,9,15);for(let i=0;i<5;i++)rect(-43+i*9,-13,5,5,accent);g.restore();}
  function rocket(x:number,y:number,scale=1){g.save();g.translate(x,y);g.scale(scale,scale);shape([[-9,2],[-8,-64],[0,-90],[9,-64],[10,2]],'#ede1bd');
    rect(-9,-42,18,6,accent);for(const d of [-1,1])shape([[d*9,-36],[d*19,-16],[d*20,9],[d*10,2]],ink);g.restore();}
  function dish(x:number,y:number){shape([[x-17,y-13],[x+18,y-19],[x+11,y-5],[x+1,y+1]]);rect(x-1,y,4,15);rect(x-13,y+14,28,4);}
  function stars(){for(let i=0;i<42;i++){const x=22+i*97%436,y=30+i*41%158;ellipse(x,y,i%5?1:2,1.4,'#f3ddaa');}}
  function waves(){for(let i=0;i<6;i++)for(let j=0;j<9;j++){const x=22+j*54+i%2*12,y=149+i*10;shape([[x,y],[x+7,y+1.3],[x+14,y]],'#c0d4c6',false);}}
  function hills(c=ink){shape([[10,185],[70,128],[103,153],[165,86],[204,137],[252,114],[293,137],[350,81],[385,122],[467,93],[467,212],[10,212]],c);}
  function antenna(x:number,y:number){rect(x-9,y-9,18,18,accent);for(const d of [-1,1]){rect(x+d*26-10,y-7,20,14);rect(x+d*15,y-1,9,2,accent);}}
  function dial(x:number,y:number){arc(x,y,66,61);arc(x,y,55,50);for(let i=0;i<20;i++){const a=i*Math.PI/10;shape([[x+55*Math.cos(a),y+50*Math.sin(a)],[x+62*Math.cos(a),y+57*Math.sin(a)]],ink,false);}}
  function reef(){shape([[0,0],[480,0],[480,49],[405,58],[373,80],[330,76],[287,113],[218,80],[149,75],[89,109],[0,126]],ink);}
  return {shape,rect,ellipse,arc,ship,rocket,dish,stars,waves,hills,antenna,dial,reef};
}
export function illustrate(g:Ctx,id:string,s:InstrumentPlay){
  const [bg,ink,a]=s.spec.palette,p=pen(g,ink,a),n=s.index,t=s.elapsed;
  g.fillStyle=bg;g.fillRect(0,0,480,240);g.save();
  g.beginPath();g.rect(12,15,456,196);g.clip();
  switch(id){
    case '0102-defense': {
      p.waves();
      for(const [x,side,open] of [[55,1,n>0],[422,-1,n>1]] as const){
        p.rect(x-23,133,48,14);p.rect(x-18,145,5,37);p.rect(x+14,145,5,37);
        p.shape([[x,135],[x+side*39,open?139:100],[x+side*41,open?145:106],[x,142]],'#c8a779');
      }
      p.ship(128+n*13,138,.42);p.ship(353-n*10,164,.35);
      p.rect(237,42,3,62);p.shape([[240,47],[273,55],[240,64]],n===3?a:ink);break;
    }
    case '0102-match':
      p.rect(52,141,55,13);p.rect(59,153,8,33);
      for(let i=0;i<3;i++){const x=149+i*102,y=106-i*20;
        for(let j=0;j<5;j++)p.shape([[x+j*9,y+5],[x+6+j*9,y],[x+6+j*9,y+(n>i+1?10:39)],[x+j*9,y+43]],n>i+1?a:ink);
        if(n>i)p.arc(x-11,y+19,14,21,'#ae794b',-.9,1);
      }break;
    case '0103-defense':
      p.stars();p.shape([[10,162],[84,143],[136,170],[193,181],[258,173],[302,142],[360,140],[421,151],[470,135],[470,210],[10,210]],'#898980');
      p.dish(80,142);p.rect(224,61+n*25,30,17,a);
      for(const side of [-1,1])p.shape([[239+side*9,76+n*25],[239+side*20,91+n*25],[239+side*26,91+n*25]],ink,false);break;
    case '0103-match': {
      p.stars();p.rect(12,124,456,84,'#354d64');
      for(let i=0;i<53;i++){const x=65+i*6.7,y=86+Math.cos(i*.15)*17-Math.sin(i*.07)*13,c=i<25?'#80c8a2':'#b394d1';
        p.shape([[x,y],[x+6,y-3],[x+5,119],[x,119]],c);
        p.rect(x+s.dx*6,129+s.dy*5,3,(122-y)*.6,c);
      }break;
    }
    case '0104-defense':
      p.rect(86,47,216,137,'#f4dfb7');p.rect(95,55,195,2,'#bc9971');
      for(let col=0;col<2;col++)for(let row=0;row<3;row++){
        const x=150+col*92,y=80+row*29;p.ellipse(x+2,y+3,9,8,'#907d6b');p.ellipse(x,y,9,8,n>col?a:ink);p.ellipse(x-2,y-3,3,2,'#efe3bb');
      }
      p.rect(328-32*s.settled,67,18,90,ink);p.ellipse(337-32*s.settled,66,9,5,a);break;
    case '0104-match':
      for(let i=0;i<5;i++)p.rect(80+i*71,43,4,144,'#b39a77');for(const y of [68,124,175])p.rect(62,y,330,4,'#b39a77');
      p.shape([[77,170],[129,148],[189,115],[237,92],[293,61]],ink,false);p.shape([[189,115],[232,125],[281,108]],ink,false);
      for(let i=0;i<8;i++){const x=81+i*29,y=162-i*14;p.shape([[x,y],[x+6,y-15],[x+17,y-18],[x+12,y-5]],i<2*n?a:ink);}break;
    case '0105-defense':
      for(const x of [78,295]){p.shape([[x,179],[x+6,89],[x+34,58],[x+61,89],[x+67,179]],'#6f9ca9');
        p.rect(x+18,98,32,46,'#c9e4e2');p.ellipse(x+34,120,13,19,x===78&&n>0?'#71bddc':x===295&&n>1?'#f6c870':ink);}
      p.shape([[111,76],[184,60],[238,65],[307,61],[329,76]],ink,false);p.rect(237,64,3,31+6*s.settled);break;
    case '0105-match':
      p.shape([[39,87],[240,49],[240,187],[39,167]],'#c7b194');
      p.shape([[240+s.dx*7,49+s.dy*7],[430,81],[430,169],[240+s.dx*7,187+s.dy*7]],'#887967');
      for(let row=0;row<4;row++)for(let col=0;col<8;col++){
        const x=53+col*47+(col>3?s.dx*7:0),y=90+row*20+Math.abs(3.6-col)*2+(col>3?s.dy*7:0);
        p.rect(x,y,27,12,ink);p.rect(x+3,y+2,9,8,s.done?'#f0ca84':a);
      }break;
    case '0106-defense': {
      p.hills('#85735c');
      p.rect(95,60,268,100,'#d4bc8e');p.rect(106,70,248,77,'#ac895c');
      for(let i=0;i<46;i++)p.ellipse(122+(i%10)*23,81+Math.floor(i/10)*13,2.2,2.2,ink);
      const x=299,y=137,star:Pin[]=Array.from({length:10},(_,i)=>{
        const phi=-Math.PI/2+i*Math.PI/5,r=i%2?8:15;return [x+Math.cos(phi)*r,y+Math.sin(phi)*r];});
      p.shape(star,n>=2?a:ink);
      p.rect(100,158,9,32);p.rect(339,158,9,32);p.rect(359,77+4*n,25,7,ink);
      break;
    }
    case '0106-match': {
      p.waves();
      p.shape([[26,71],[96,45],[148,67],[190,73],[206,104],[225,115],[212,123],[218,147],[184,159],[157,194],[62,187],[38,154]],'#d9d0a6');
      const x=s.dx*7,y=s.dy*7;
      p.shape([[235+x,65+y],[328+x,49+y],[444+x,76+y],[461+x,159+y],[363+x,199+y],[278+x,169+y],[253+x,158+y],[262+x,140+y],[250+x,125+y],[238+x,115+y],[246+x,104+y]],'#9db294');
      p.arc(235,121,68,58,ink,-1.19,1.21);p.arc(229,121,68,58,ink,1.23,5.03);break;
    }
    case '0107-match':
      p.waves();p.hills('#b3a075');
      for(let i=0;i<15;i++){const x=61+i*26,y=129-i%3*4;p.rect(x,y-62,10,59,'#d9c591');p.rect(x-2,y-65,14,6,ink);p.rect(x-2,y-5,14,5,ink);}
      p.ship(78+n*78,176-Math.sin(n*.6)*15,.52);p.rect(49+n*78,126,57,43,'#5b524b');
      p.rect(55+n*78,132,45,31,n===4?a:'#9ca69c');break;
    case '0108-defense':
      p.rect(76,52,304,117,ink);p.rect(89,64,276,90,'#ba946f');
      for(let card=0;card<2;card++){const y=79+card*41, x=96+Math.max(0,n-card)*22;
        p.rect(x,y,107,30,'#e3cda0');
        for(let i=0;i<12;i++)if((i+card)%4!==2)p.rect(x+7+i*8,y+(i%3)*8+4,3,6,ink);
      }
      for(let col=0;col<3;col++)p.ellipse(299+col*21,109,8,17,n>=3?a:ink);
      p.shape([[354,106],[352+n*11,66]],ink,false);p.ellipse(352+n*11,66,8,8,a);break;
    case '0108-match': {
      p.ellipse(113,129,70,51,'#a8744b');p.ellipse(164,129,53,43,'#a8744b');p.arc(132,129,78,53,ink);
      p.ellipse(148,130,17,17,ink);p.rect(182,114,192,28,'#655249');p.rect(368,101,51,52,'#84654d');
      for(let i=0;i<7;i++)p.rect(206+i*23,111,2,34,'#ae956d');
      for(let i=0;i<5;i++)p.shape([[77,121+i*5],[375+s.dx*5,117+i*5+s.dy*4]],i===2?a:'#d3c099',false);
      if(s.done){p.arc(148,130,27,25,a);p.arc(148,130,34,31,a);}break;
    }
    case '0109-defense':
      p.stars();p.rect(98,49,281,134,'#727b80');p.rect(107,57,263,118,'#192830');
      for(let col=0;col<3;col++){const x=124+col*81,y=95;p.rect(x,y,63,54,n>col?['#a8c9bf','#e3be88','#adc4db'][col]:'#68777c');
        for(let j=0;j<4;j++)p.rect(x+7+j*13,y+9+(j+col)%3*9,5,28-(j+col)%3*9,ink);
        p.shape([[x+31,y+55],[x+31,161],[221+col*20,161]],a,false);
      }
      if(n===4)p.arc(239,160,37,7,a);break;
    case '0109-match':
      for(let j=0;j<5;j++)p.rect(54,70+j*26,369,6,'#9c765f');
      p.shape([[52,153],[128,115],[157,65],[220,83],[239,139],[268,168],[325,135],[397,89]],ink,false);
      p.shape([[52,148],[128,110],[152,60],[221,78],[245,137],[269,158],[326,123],[395,85]],'#b35159',false);
      if(n>2)p.arc(268,151,27,18,a);break;
    case '0110-defense': {
      p.shape([[13,188],[41,109],[93,64],[173,38],[332,38],[415,72],[467,147],[467,184]],'#886d5d');
      for(let i=0;i<5;i++)p.arc(248,152,53+i*27,26+i*20,ink,Math.PI,Math.PI*2);
      const x=106+51*n;
      p.shape([[x-65,169],[x+69,169],[x+60,145],[x-40,145]],'#434b49');
      p.rect(x-27,118,49,28,'#485e62');p.ellipse(x-29,170,11,9,ink);p.ellipse(x+35,170,11,9,ink);
      for(const [i,u] of [152,301].entries())p.ellipse(u,123,6,7,n>i+1?a:ink);
      break;
    }
    case '0110-match':
      p.shape([[35,132],[238,61],[446,118],[390,179],[220,192]],'#c6ab85');
      p.shape([[37,133],[219,190],[278,166],[337,143],[428,126]],'#77999b',false);
      for(let i=0;i<12;i++){const x=88+(i%6)*54,y=120+(i>5?40:0)-i%6*4,roof=i%4<=n?11+i%3*8:3;
        p.shape([[x,y],[x+20,y-8],[x+20,y-8-roof],[x,y-roof]],'#a87f61');p.shape([[x+20,y-8],[x+44,y-2],[x+44,y-2-roof],[x+20,y-8-roof]],ink);
        p.shape([[x,y-roof],[x+20,y-8-roof],[x+44,y-2-roof],[x+24,y+6-roof]],i%2?'#b65f45':'#706d57');
      }break;
    case '1222-defense':
      p.waves();p.rocket(106,157,.78);p.rect(211,100,151,66,ink);p.rect(221,109,130,40,'#b4ccae');p.rect(332,56,3,51);p.shape([[334,58],[383,65],[366,78],[334,75]],n>1?a:ink);
      for(let i=0;i<4;i++)p.rect(231+i*22,137,16,8,a);break;
    case '1222-match':
      p.stars();for(let j=0;j<2;j++){g.save();if(j)g.translate(s.dx*6,s.dy*6);const x=63+j*171;p.rect(x,63,160,110,ink);p.rect(x+6,69,148,98,'#8e9a9a');
      p.shape([[x+7,127],[x+47,107],[x+92,122],[x+153,98],[x+153,164],[x+7,164]],'#bdaf90');p.antenna(x+75,121);g.restore();}break;
    case '1223-defense':
      for(let i=0;i<12;i++){const x=46+i*34;p.rect(x,70+i%3*11,4,90,ink);for(let j=0;j<3;j++)p.ellipse(x+8,84+j*21,9,3,'#adc296');}
      for(let i=0;i<2;i++){const x=160+i*137,y=143-(n>i?0:9);p.ellipse(x,y,27,23,'#e8e2c7');for(const d of [-1,1]){p.ellipse(x+d*18,y-18,8,8);p.ellipse(x+d*10,y-1,6,8);}}break;
    case '1223-match':
      p.stars();for(let i=0;i<2;i++){p.rect(79+i*192,148-i*47,136,7,ink);p.rect(139+i*190,153-i*47,7,37+i*47);p.antenna(147+i*187,127-i*47+(n>i?0:14));}break;
    case '1224-defense':
      p.waves();{const y=135-n*12;p.ellipse(241,y,77,12,'#e2dfc6');p.shape([[217,y-8],[163,y-48],[180,y-48],[254,y-4]],ink);p.shape([[184,y-3],[154,y-30],[164,y-31],[208,y-2]],a);}
      for(const x of [87,376]){p.ellipse(x,155,12,6,a);p.rect(x,133,2,23);}break;
    case '1224-match':
      p.waves();p.ship(238,152,1.67);for(let j=0;j<2;j++)for(let i=0;i<12;i++)p.rect(132+i*16,121+j*10,8,5,i<n*3?a:'#83a2a6');break;
    case '1225-defense':
      p.hills('#919c82');p.shape([[48,181],[158,118],[239,129],[241,168]],ink,false);p.shape([[431,174],[341,118],[242,128],[241,168]],a,false);
      p.rect(218+s.dx*6,91+s.dy*6,45,70,'#c5b18b');p.rect(237,78,3,97,ink);break;
    case '1225-match':
      for(let i=0;i<3;i++){const x=40+i*133;p.shape([[x,87],[x+120,72+i%2*16],[x+120,166],[x,179]],i%2?'#bad1af':'#d3ccac');
      p.shape([[x+6,138],[x+42,103],[x+62,123],[x+92,91],[x+115,132]],ink,false);}if(n>1)p.rect(170,142,135,5,a);break;
    case '1226-defense':
      p.rect(48,74,378,8);for(const x of [78,190,303,404])p.rect(x,82,5,79);p.rect(64+n*41,144,116,8);
      for(let j=0;j<4;j++)p.rect(68+n*41+j*27,120+j%2*4,23,24-j%2*4,j%2?a:ink);for(const x of [83,157])p.ellipse(x+n*41,157,8,8);break;
    case '1226-match':
      p.hills('#90a581');for(const y of [123,161])p.rect(50,y,379,4);p.shape([[151,160],[273,124]],a,false);
      for(let j=0;j<2;j++){p.rect(78+j*174,79,83,40,'#e2d4b3');p.rect(89+j*174,91,49,3);if(n>j)p.arc(132+j*174,106,9,7,a);}break;
    case '1227-defense':
      p.stars();p.rocket(235,148,.98);p.arc(235,123,71,67,ink);for(let j=0;j<9;j++){p.rect(65+j*44,155,4,31);p.ellipse(67+j*44,154,7,7,j<3*n?a:ink);}break;
    case '1227-match':
      p.hills('#a2b08d');for(let j=0;j<11;j++)p.rect(59+j*36,89,1,88);for(let j=0;j<5;j++)p.rect(59,94+j*16,361,1);
      p.antenna(242,65);p.rect(239+s.dx*6,85,2,92,a);p.rect(59,119+s.dy*6,361,2,a);break;
    case '1228-defense':
      p.hills('#90a180');p.shape([[43,164],[162,137],[274,123],[406,88]],ink,false);for(let j=0;j<8;j++)p.rect(86+j*39,153-j*7,5,27);
      p.rect(370,66,4,81);p.rect(375,117-10*n,45,20,a);break;
    case '1228-match':
      for(let i=0;i<5;i++){const x=41+i*81;p.shape([[x,111],[x+73,96],[x+73,158],[x,173]],ink);
      for(let j=0;j<4;j++)p.rect(x+9+j*16,115,1,34,a);}p.ellipse(83+76*n,116,13,7,a);break;
    case '1229-defense':
      p.waves();p.rect(31,153,416,7);for(let j=0;j<6;j++){const x=64+j*67;p.rect(x,108,4,45);
      for(const d of [-1,0,1])p.ellipse(x+2+d*(5+n),100+d*d*6,5,12,n>j/2?a:'#e1d2b2');}break;
    case '1229-match':
      for(let j=0;j<3;j++){g.save();if(j===2)g.translate(s.dx*7,s.dy*7);const y=104+j*19;p.shape([[84,y],[226,y-51],[401,y-14],[253,y+46]],['#769e9e','#96aa81','#d1bf98'][j]);
      for(let k=0;k<5;k++)p.arc(245,y-4,17+k*13,7+k*6,ink);g.restore();}break;
    case '1230-defense':
      p.rect(70,58,174,130,'#a0bdc8');p.rect(249,58,158,130,'#c7ab8c');p.rect(226+s.dx*7,75+s.dy*7,16,82,ink);p.ellipse(234+s.dx*7,157+s.dy*7,13,12,a);
      for(let j=0;j<8;j++)p.rect(246,80+j*10,13-j%2*6,2);break;
    case '1230-match':
      for(let i=0;i<2;i++){const x=68+i*207;p.rect(x,79,124,63,i?'#9ab5ad':'#c7b58f');p.rect(x+11,91,64,4);p.rect(x+11,102,47,3);}
      p.rect(39,151,400,15,ink);for(let j=0;j<24;j++)p.rect(51+j*16,152,2,j%4?5:10,a);break;
    case '1231-defense':
      p.rect(47,151,384,8);p.rect(48,170,383,4);{const x=100+n*30;p.ellipse(x+67,130,82,13,'#e9e5ca');p.rect(x+4,119,110,22,'#e9e5ca');for(let j=0;j<6;j++)p.rect(x+15+j*16,122,10,6,ink);}
      break;
    case '1231-match':
      for(let i=0;i<8;i++){const x=35+i*53,h=49+i%3*19;p.rect(x,170-h,48,h,i%2?'#ad9278':'#819788');
      for(let j=0;j<2;j++)for(let m=0;m<3;m++)p.rect(x+7+j*21,177-h+m*12,9,7,i<n*2?a:ink);}break;
    case '1217-defense':
      p.hills('#aec2c3');p.arc(146,88,83,51,'#bd7359',3.2,6.15);
      for(let j=0;j<7;j++)p.shape([[65+j*27,85],[228+s.dx*5,141+s.dy*5]],ink,false);
      p.shape([[219+s.dx*5,116+s.dy*5],[257+s.dx*5,119+s.dy*5],[271+s.dx*5,165+s.dy*5],[200+s.dx*5,161+s.dy*5]],ink);p.rect(240,67,2,113,a);break;
    case '1217-match':
      p.stars();for(let j=0;j<4;j++)for(let i=0;i<9;i++)p.rect(70+i*36,68+j*32,30,12,j%2?'#95a7b9':'#91ada1');
      if(n>0)p.shape(s.spec.points.slice(0,n),a,false);break;
    case '1218-defense':
      p.rect(59,75,367,12);p.rect(114,70,15,93);p.rect(368,70,15,93);p.arc(81,120,39,40);p.rect(130,111,205,13);
      p.rect(104,148,207,9,ink);p.rect(121,138,179,8,'#ebdbad');if(n>1)p.rect(151,134,8,17,a);if(n>2)p.rect(119,128,184,9,'#a25e50');break;
    case '1218-match':
      p.rect(59,69,156,109,ink);for(let j=0;j<4;j++)p.ellipse(96+j%2*68,98+Math.floor(j/2)*47,18+j*2,13,'#c2b599');
      p.rect(246,66,138,121,'#e5d6ac');p.rect(248+s.dx*6,67+s.dy*6,133,116,'#76958b');for(const y of [86,158])p.arc(243,y,6,6,a);break;
    case '1219-defense':
      for(const side of [-1,1]){const x=240+side*119;p.rect(x-76,141,152,10);p.rect(x-64,151,8,31);p.rect(x+55,151,8,31);
        const moved=n>(side<0?0:1);p.rect(x-36-(moved?side*77:0),108,74,31,side<0?'#658895':'#c9a478');}
      if(n>2)p.rect(181,94,117,13,a);break;
    case '1219-match':
      p.rect(91,59,233,9);p.rect(99,62,7,121);p.rect(308,62,7,121);p.ellipse(207,125,47,47,'#c99964');
      p.arc(207,125,31,32,ink);p.ellipse(207,125,11,11,a);p.shape([[362,167],[n===2?226:281,n===2?123:103]],ink,false);p.ellipse(n===2?226:281,n===2?123:103,11,9,ink);break;
    case '1220-defense':
      p.stars();for(let i=0;i<9;i++)p.antenna(132+(i%3)*102,65+Math.floor(i/3)*43);for(let j=0;j<3;j++)p.dish(95+j*140,165);if(n>1)p.shape(s.spec.points.slice(0,n),a,false);break;
    case '1220-match':
      p.waves();for(let j=0;j<2;j++)for(let i=0;i<8;i++){const x=68+i*49,y=82+j*76;p.arc(x,y,18,16,ink);const phase=n*.72;
        for(let h=0;h<4;h++){const a0=phase+h*Math.PI/2;p.shape([[x,y],[x+14*Math.cos(a0),y+13*Math.sin(a0)]],a,false);}}break;
    case '1221-defense':
      p.rect(78,69,319,118,'#adc39c');for(let j=0;j<16;j++)p.rect(89+j*19,73,1,106,ink);
      for(let j=0;j<13;j++)p.shape([[88,76+j*8],[171,70+j*8],[251,86+j*8],[338,71+j*8],[388,79+j*8]],j%3?ink:a,false);
      p.rect(240+s.dx*7,70+s.dy*7,3,110,a);break;
    case '1221-match':
      p.stars();p.rect(37,111,52,47,a);for(let i=0;i<5;i++){const x=92+i*66,y=92+(i%2)*(21-5*n);p.rect(x,y,61,52,'#60778f');
        for(let j=1;j<4;j++)p.rect(x+j*15,y,1,52,ink);p.rect(x,y+26,61,1,ink);}break;
    case '1212-defense':
      p.hills('#87a28e');for(let i=0;i<2;i++)p.shape(s.spec.points.map(([x,y])=>[x,y+7*i] as Pin),i?ink:'#aaceb7',false);
      for(let i=0;i<4;i++){const [x,y]=s.spec.points[i];p.rect(x-4,y-12,6,23,i<n?a:ink);}break;
    case '1212-match':
      for(let i=0;i<2;i++){g.save();if(i)g.translate(s.dx*7,s.dy*6);p.rect(58+i*183,52,182,128,'#d2c69b');
        for(let j=0;j<13;j++){const y=65+j*8;p.shape([[59+i*183,y],[119+i*183,y+12],[173+i*183,y-11],[239+i*183,y]],j%3?ink:a,false);}g.restore();}break;
    case '1213-defense':
      p.stars();p.ellipse(244,103,55,31,'#a69786');p.ellipse(292,115,30,23,'#a69786');p.antenna(77+60*n,157-9*n);p.rect(181,163,119,4,a);break;
    case '1213-match':
      p.stars();p.ellipse(62,153,23,22,'#c9c7b1');p.ellipse(401,151,38,35,'#729c9c');p.arc(238,174,178,105,a,3.3,6.03);
      {const [x,y]=s.spec.points[Math.min(n,3)];p.antenna(x,y);}break;
    case '1214-defense':
      p.hills('#9a8c7b');p.rect(206,90,76,43,'#cba569');for(const d of [-1,1]){p.shape([[242+d*35,123],[242+d*84,163+(n>(d<0?0:1)?7:0)]],ink,false);p.ellipse(242+d*84,166,20,4,a);}break;
    case '1214-match':
      p.waves();for(let i=0;i<9;i++)p.rect(89+i*34,128-5*Math.sin(i*.35),29,39,ink);
      p.arc(242,101,36,35,a);for(let i=0;i<4;i++){const b=i*Math.PI/2+n*.44;p.shape([[242,101],[242+32*Math.cos(b),101+32*Math.sin(b)]],a,false);}break;
    case '1215-defense':
      p.hills('#998c77');p.rect(64,76,150,87,'#c5b392');p.rect(253+s.dx*6,76+s.dy*6,150,87,'#c5b392');
      p.antenna(140,115);p.rect(281+s.dx*6,114+s.dy*6,74,19);for(let i=0;i<3;i++)p.ellipse(292+s.dx*6+i*25,136+s.dy*6,8,8);break;
    case '1215-match':
      for(let j=0;j<3;j++){const x=65+j*133;p.rect(x,72,91,100,'#eddcba');for(let i=0;i<5;i++)p.rect(x+12,91+i*9,47+i%3*8,2);if(n>j)p.arc(x+57,141,18,14,a);}break;
    case '1216-defense':
      p.stars();p.ellipse(231,145,62,46,'#708f88');for(let j=0;j<3;j++)p.arc(237,128,123-j*11,45+j*13,ink);
      p.dish(65,159);p.antenna(177,69);p.antenna(304,84);if(n>1)p.shape(s.spec.points.slice(0,n),a,false);break;
    case '1216-match':
      p.hills('#7e977b');p.shape(s.spec.points,ink,false);for(let j=0;j<6;j++)p.rect(125+j*27,133,5,39);
      {const [x,y]=s.spec.points[Math.min(3,n)];p.rect(x-25,y-12,52,12,'#ede0b6');for(let j=0;j<4;j++)p.rect(x-19+j*10,y-10,6,3,ink);}break;
    case '1207-defense':
      p.hills('#9daf81');p.dish(70,153);p.dish(349,143);p.antenna(207,66);
      for(let j=0;j<Math.min(3,n);j++)p.shape([s.spec.points[j],s.spec.points[j+1]],a,false);
      if(n>=4){p.rect(348,153,80,36,'#9cb789');p.shape([[350,174],[375,160],[397,180],[425,166]],ink,false);}break;
    case '1207-match':
      for(const side of [-1,1]){const x=238+side*135;p.rect(x-45,150,88,15);for(let j=0;j<4;j++)p.ellipse(x-31+j*21,166,8,8);p.rocket(x,146-(side<0?n:Math.max(0,n-2))*14,.86);}
      p.rect(205,87,74,42,'#ecddb3');p.arc(242,105,15,11,n>=2?a:ink);break;
    case '1208-defense':
      p.hills('#8ea5ac');p.shape([[128,171],[248,68],[339,165]],'#e2e8d9');p.shape([[207,111],[248,68],[266,93],[249,89],[230,108]],'#f9eed4');
      p.rect(246,67,4,38,ink);p.shape([[192+s.dx*8,92+s.dy*8],[306+s.dx*8,92+s.dy*8]],a,false);p.rect(248+s.dx*8,46+s.dy*8,2,95,a);break;
    case '1208-match':
      p.waves();for(const x of [64,163,311,405])p.rect(x,139,10,48);p.rect(35,135,139,8);p.rect(311,135,137,8);
      p.rect(174,88+Math.min(1,n/3)*47,137,8,a);p.shape([[135,147],[135,51],[258,51],[239,74]],ink,false);break;
    case '1209-defense':
      for(const x of [94,376]){p.rect(x-15,163,35,13);p.arc(x+(x<200?42:-42),152,66,61,'#8bbec6',3.2,6.05);}
      {const x=85+n*78;p.ellipse(x,137,41,8,a);p.shape([[x-6,136],[x-34,110],[x-15,114],[x+10,137]],ink);}break;
    case '1209-match':
      p.stars();for(let j=0;j<3;j++){p.arc(226,182,88+j*39,65+j*21,ink,3.25,6.10);const [x,y]=s.spec.points[j+1];p.ellipse(x,y,5,5,n>j+1?a:ink);}break;
    case '1210-defense':
      p.stars();p.antenna(68,68);p.antenna(406,156);for(let j=0;j<2;j++){const x=j?s.dx*8:0,y=j?s.dy*8:0;
      p.shape([[69+x,129+y],[173+x,129+y],[207+x,124+y],[231+x,69+y],[245+x,143+y],[265+x,125+y],[396+x,123+y]],j?a:ink,false);}break;
    case '1210-match':
      p.shape([[42,94],[176,63],[243,78],[241,181],[169,164],[44,184]],'#e9d8a8');
      p.shape([[247,79],[337,61],[440,77],[435,169],[334,157],[248,181]],'#f3e4bf');
      if(n>0)for(let j=0;j<5;j++)p.rect(64,105+9*j,65+j%3*13,2);
      if(n>1)for(let j=0;j<7;j++)p.ellipse(233+8*j,142-8*j,8,3,'#688756');if(n>2)p.ellipse(367,108,24,26,a);break;
    case '1211-defense':
      for(let j=0;j<12;j++)p.arc(226+j*6,128-j*3,54+j*7,25+j*4,j%3?ink:'#b6cbc5',.1,5.9);
      if(n>1)p.shape([...s.spec.points.slice(0,n)],a,false);break;
    case '1211-match':
      p.rect(65,98,352,83);p.rect(76,105,330,65,'#c5a779');for(let j=0;j<3;j++)p.rect(105,128-j*6,126,5,j%2?'#9b7354':a);
      if(n>0)p.rect(249,112,107,45,'#e8d7b6');if(n>1)p.rect(287,106,9,60);if(n>=3){p.rect(65,93,352,62,'#ac8564');p.rect(354,137,22,23,a);}break;

    case '1202-defense':
      p.stars();p.hills('#6f7773');p.rect(53,67,74,46);p.dish(85,62);
      for(const d of [0,10])p.shape([[99,88+d],[307,161+d],[437,170+d]],ink,false);
      {const x=91+n*59,y=Math.min(147,76+n*19);p.rect(x-19,y-9,37,10,a);for(const d of [-13,0,13])p.ellipse(x+d,y+4,5,5);}break;
    case '1202-match':
      p.ellipse(234,169,67,20);p.rect(167,121,134,48);p.ellipse(234,121,67,17,'#d9c596');
      p.rect(n?211:98,n?101:114,9,44,'#e2d8be');p.rect(n>1?237:316,125,40,21,'#977653');
      p.ellipse(234,73+Math.min(1,s.settled)*47,69,19,a);break;
    case '1202-skirmish':
      p.shape([[5,153],[467,39],[472,109],[17,211]],ink);
      for(let i=0;i<11;i++)p.shape([[53+33*i,165-i*8],[67+33*i,163-i*8],[72+33*i,180-i*8],[58+33*i,183-i*8]],'#e5dfbb');
      p.ellipse(247,111,24,12,'#709176');{const [x,y]=s.spec.points[Math.min(n,3)];p.ellipse(x-8,y-12,4,5,a);p.rect(x-10,y-8,4,10,a);}break;
    case '1202-rpg':
      p.hills('#ac7159');p.ellipse(239,151,45,30,'#d6c19e');
      for(const side of [-1,1]){const open=side<0?n>0:n>1;p.shape([[239+side*26,145],[239+side*(open?106:40),open?162:92],[239+side*51,162]],'#715947');}
      p.shape([[241,136],[243,n>2?56:104]],ink,false);p.arc(243,71,22,12,a);break;
    case '1203-defense':
      p.hills('#617c6e');p.ellipse(113,158,47,59);p.rect(67,154,92,57);
      p.rect(96+n*33,141,111,26,'#eee2bd');for(let j=0;j<6;j++)p.rect(104+n*33+j*15,146,9,6,'#467080');
      for(let j=0;j<3;j++)p.ellipse(195+j*77,107,6,7,j<n?a:ink);break;
    case '1203-match':
      p.stars();p.hills('#89938d');p.rocket(237,169-58*s.settled,.92);
      for(const d of [-1,1])p.shape([[237+d*52,181],[237+d*(n>(d<0?0:1)?80:23),139]],ink,false);break;
    case '1203-skirmish':
      p.rect(57,80,360,96,'#f5e8c7');for(let j=0;j<36;j++)p.rect(63+j*10,86,1,j%5?9:18);
      for(const d of [0,1]){const x=d?s.dx*7:0,y=d?s.dy*7:0;p.shape([[73+x,150+y],[170+x,145+y],[208+x,108+y],[225+x,146+y],[398+x,133+y]],d?a:ink,false);}break;
    case '1203-rpg':
      p.stars();p.ellipse(237,124,110,76,'#c39276');g.save();g.beginPath();g.ellipse(237,124,110,76,0,0,7);g.clip();
      for(let i=0;i<13;i++){const shift=i<7?0:s.dy*6;p.shape([[110,45+i*13+shift],[195,51+i*13+shift],[291,44+i*13+shift],[364,49+i*13+shift]],i%2?'#f3d5a3':'#935446',false);}
      p.ellipse(269+s.dx*7,144+s.dy*6,25,10,'#a86146');g.restore();break;
    case '1204-defense':
      p.hills('#8ca4b2');p.shape([[349,137],[359,90],[385,82],[402,130],[381,145]],'#bc8463');
      for(let j=0;j<4;j++){const [x,y]=s.spec.points[j];p.rect(x-3,y-9,5,29);p.ellipse(x,y-10,8,5,j<n?a:'#718992');}break;
    case '1204-match':
      p.stars();for(let k=0;k<9;k++){const x=54+k*43,y=78+k*31%74;p.shape([[x,175],[x+28,y],[x+88,61+k*13%42]],'#7ca5b3',false);p.ellipse(x+28+s.dx*6,y+s.dy*6,5,5,a);}break;
    case '1204-skirmish':
      p.rect(77,43,326,146);p.rect(88,54,303,121,'#bfab85');
      for(let j=0;j<9;j++){const x=104+j*34;p.rect(x,54,2,122);p.ellipse(x,64+(j===4&&n?16:0),14,7);
        for(let k=0;k<4;k++)p.ellipse(x,165-k*13-((j===2&&n>1||j===6&&n>2)&&k===3?12:0),13,6);}
      p.rect(82,91,315,8);break;
    case '1204-rpg':
      p.stars();for(let j=0;j<2;j++){const x=105+180*j;p.rect(x-45,89,114,59,'#c4c6b8');p.ellipse(x-46,118,15,30,ink);for(let k=0;k<5;k++)p.rect(x-21+k*17,89,3,59,ink);}
      p.rect(175,108,65,23);p.ellipse(348,118,12,14,n>=4?a:ink);break;
    case '1205-defense':
      p.waves();for(let j=0;j<15;j++){const x=14+j*32,h=15+j*17%67;p.rect(x,143-h,22,h,j%2?ink:'#608785');}
      p.arc(235,166,129,61);p.rect(60,148,359,6);for(let j=0;j<9;j++)p.rect(109+j*31,126-Math.sin(j*.4)*19,2,27);break;
    case '1205-match':
      p.rect(160,108,148,63,'#9d7154');p.ellipse(234,110,73,15,'#795236');p.rect(n?193:108,119,36,24,'#d5a467');
      p.shape([[163,105],[237,n>1?146:80],[307,105]],'#bc9063');if(n>1)p.rect(226,124,14,11,a);break;
    case '1205-skirmish':p.stars();p.dish(63,163);p.dish(414,160);p.antenna(178,71);p.antenna(322,53);
      for(let j=0;j<Math.min(n,4);j++){const [x,y]=s.spec.points[j];p.arc(x,y,26,20,a);}break;
    case '1205-rpg':
      p.waves();p.shape([[7,31],[466,31],[356,89],[231,105],[162,134],[21,144]],'#e9ebd8');p.shape([[152,207],[227,154],[316,155],[461,101],[471,207]],'#dde8df');
      {const [x,y]=s.spec.points[Math.min(n,3)];p.ship(x,y,.42);}break;
    case '1206-defense':
      p.stars();for(const d of [-1,1]){const x=237+d*58+(d>0?s.dx*6:0),y=118+(d>0?s.dy*6:0);p.antenna(x+d*49,y);p.rect(x-19,y-12,39,24,'#c2bfb0');
        for(const v of [-1,1])p.shape([[x,y+v*10],[x-d*32,y+v*19],[x-d*45,y+v*9]],a,false);}break;
    case '1206-match':p.hills('#668579');p.ellipse(60,153,30,35,ink);p.shape([...s.spec.points],ink,false);
      for(const x of [157,179,201,223])p.rect(x,136,6,44);{const [x,y]=s.spec.points[Math.min(n,3)];p.rect(x-24,y-14,46,12,'#e9d59f');}break;
    case '1206-skirmish':
      p.waves();p.hills('#819b87');for(let j=0;j<9;j++){const x=37+49*j,y=113+j*11%26;p.rect(x,y,28,25);p.shape([[x-4,y],[x+12,y-16],[x+33,y]],'#92634c');p.rect(x+6,y+7,6,7,j<n*3?a:'#95b3a6');}break;
    case '1206-rpg':
      p.shape([[211,203],[220,111],[257,111],[268,203]],'#dcd0ae');
      p.shape([[219+s.dx*9,108+s.dy*8],[238+s.dx*9,69+s.dy*8],[258+s.dx*9,108+s.dy*8]],'#f4ebcf');
      p.shape([[123,187],[123,45],[288,45],[241+s.dx*9,54]],ink,false);p.rect(238+s.dx*9,54,2,18+s.dy*8);break;
    case '1127-1895':
      p.rect(97,45,260,141,'#e5c99a');p.rect(108,54,238,125,'#f7eacc');
      for(let i=0;i<7;i++)p.rect(141,70+10*i,114+(i*33)%68,1.2,ink);
      if(n>0)p.shape([[108,179],[226,112],[346,179]],'#c6ae88');
      if(n>1)p.shape([[108,57],[226,113],[108,179]],'#d4bd93');
      if(n>2)p.ellipse(232,120,14,11,a);
      p.rect(394,111,10,64,'#fcdeb3');p.ellipse(399,102,4,10,a);break;
    case '1127-defense':
      for(let k=0;k<3;k++){const x=89+k*116;p.ellipse(x,175,43,35);p.rect(x-43,174,86,36);for(let j=0;j<5;j++)p.rect(x-28+j*13,166,6,8,k<n?a:'#6b7e79');}
      break;
    case '1127-match':
      p.waves();p.ship(227+65*s.settled,121+13*s.settled,1.5);p.shape([[33,181],[392,149]],ink,false);
      s.spec.points.forEach(([x,y],i)=>{if(i>=n)p.shape([[x-12,y+5],[x+9,y-7],[x+13,y+7]],'#986647');});break;
    case '1127-skirmish':p.stars();p.dish(66,169);p.antenna(222,59);p.dish(350,124);p.dish(419,166);break;
    case '1127-rpg':p.rect(138,86,204,87,'#d0b779');for(let i=0;i<=40;i++)p.rect(147+i*4.45+s.dx*(1-i/40)*4,94+s.dy*i/15,1,i%5?9:17);p.ellipse(104,162,24,16,'#d5e5de');p.ellipse(361,153,22,24,'#826158');break;
    case '1128-1964':p.stars();p.ellipse(95,134,54,53,'#b4684e');p.ellipse(84,119,19,8,'#a25b46');p.antenna(194,106);p.arc(307,81,17,17,a);break;
    case '1128-defense':p.reef();p.waves();p.ship(61+65*n,148-6*n,.47);for(const [x,y] of [[166,132],[276,100]]){p.rect(x-4,y-24,8,24);p.ellipse(x,y-25,5,3,a);}break;
    case '1128-match':for(let j=0;j<10;j++){const y=40+17*j;p.shape([[30,y],[100,y+11],[175,y-10],[230,y+7]],ink,false);
      g.save();g.translate(s.dx*8,s.dy*7);p.shape([[230,y+7],[279,y+3],[325,y-11],[438,y+3]],ink,false);g.restore();}break;
    case '1128-skirmish':p.stars();p.ellipse(298,162,84,65,'#a1a59e');for(let j=0;j<5;j++)p.arc(291+j*3,143,98+j*13,41+j*9);p.antenna(130,72);break;
    case '1128-rpg':p.reef();p.waves();p.shape([[20,210],[64,181],[116,166],[177,189],[219,168],[276,195],[363,171],[460,203]],'#658473');p.ship(63+75*n,157-10*n,.39);break;
    case '1129-1972':p.rect(28,27,424,174,'#243b36');for(let y=42;y<194;y+=9)p.rect(239,y,2,4,'#718a77');
      p.rect(53,s.paddle-24,8,48,'#e3dba5');p.rect(422,s.ballY-19,7,38,'#b3c9a1');p.rect(s.ballX-4,s.ballY-4,8,8,a);break;
    case '1129-defense':p.hills('#7d969d');p.rocket(237,185,1.54);for(let i=n;i<3;i++){p.rect(213,51+i*51,48,14,'#b5cdd2');p.rect(207,63+i*51,60,4,ink);}break;
    case '1129-match':p.hills('#6d875d');p.arc(234+9*Math.sin(t),88,56,36,a,Math.PI,Math.PI*2);
      for(let j=-2;j<=2;j++)p.shape([[234+j*26,86],[234,138]],ink,false);p.shape([[225,134],[243,134],[249,145],[220,145]]);break;
    case '1129-skirmish':p.stars();p.ellipse(250,140,73,68,'#9a9d98');p.arc(234,125,136,65);p.arc(243,131,91,77);p.antenna(387,151);break;
    case '1129-rpg':p.hills('#8ba8ae');p.dial(257,127);p.shape([[257,127],[267+s.dx*15,149+s.dy*15],[259,131]],ink);
      g.translate(s.settled*48,-s.settled*14);p.shape([[85,80],[150,69],[170,52],[179,54],[172,69],[201,70],[207,74],[168,78],[141,96],[134,96],[142,78]],ink);g.translate(-s.settled*48,s.settled*14);break;
    case '1130-1872':p.rect(42,48,396,145,'#7e9a65');p.arc(240,120,32,32,'#e6e1b5');p.rect(239,48,2,145,'#e6e1b5');
      for(let j=0;j<5;j++){p.ellipse(110+j*63,105+(j%2)*40,5,8,ink);p.ellipse(116+j*63,105+(j%2)*40,3,5,a);}break;
    case '1130-defense':p.stars();p.arc(240,116,105,86);for(const d of [-1,1]){p.rect(240+d*(n===3?102:54)-41,47,82,136,'#688381');for(let j=0;j<3;j++)p.ellipse(240+d*88+(j-1)*15,123,6,8,'#e7c49a');}break;
    case '1130-match':p.rocket(242,184,1.47);p.rect(289,40,12,143);for(let j=0;j<3;j++)p.rect(j<n?291:250,53+46*j,j<n?25:51,7,ink);break;
    case '1130-skirmish':p.dial(243,140);p.shape([[235,146],[240,60],[251,144]],ink);p.shape([[244,143],[282+s.dx*15,139+s.dy*15],[260,150]],'#a99a78');break;
    case '1130-rpg':p.waves();p.reef();p.ship(75+68*n,157-3*n,.50);p.arc(86+68*n,146-3*n,12,12,a);break;
    case '1201-1959':p.shape([[62,136],[144,67],[205,92],[242,51],[305,77],[348,60],[417,133],[355,151],[307,176],[224,162],[177,186],[100,160]],'#ebedde');
      for(let i=0;i<5;i++){p.arc(232,126,29+i*29,17+i*12,'#92acae',Math.PI/2,3*Math.PI/2);
        p.arc(232+s.dx*8,126+s.dy*8,29+i*29,17+i*12,'#92acae',-Math.PI/2,Math.PI/2);}break;
    case '1201-defense':p.stars();p.shape([[0,160],[73,147],[138,177],[227,153],[299,163],[387,140],[480,161],[480,216],[0,216]],'#a0a198');
      p.rect(222,68+n*18,36,19,a);for(const d of [-1,1])p.shape([[240+d*12,83+n*18],[240+d*24,99+n*18],[240+d*30,99+n*18]],ink,false);break;
    case '1201-match':p.hills('#b3c3c6');for(const dy of [-5,5])p.shape(s.spec.points.map(([x,y])=>[x,y+dy] as Pin),ink,false);
      p.rect(37+n*84,148-n*18,64,15,'#e9ebe5');p.rect(44+n*84,150-n*18,49,4,'#5d8193');break;
    case '1201-skirmish':p.rect(292,45,10,134);p.rect(384,45,10,134);p.rect(286,40,113,9);
      p.ellipse(343,102,36,38,'#cc9e5b');p.arc(343,102,28,30,ink);p.ellipse(343,102,9,10,ink);
      for(let j=0;j<2;j++){p.rect(70+j*112,146-j*19,62,13);p.rect(76+j*112,159-j*19,6,23);}break;
    case '1201-rpg':for(let j=0;j<7;j++)p.shape([[12,42+j*23],[159,53+j*20],[311,39+j*23],[467,55+j*21]],'#927558',false);
      p.rect(12,116,154+79*s.settled,36,'#59615c');p.rect(316-73*s.settled,116+s.dy*7,152+73*s.settled,36,'#59615c');
      p.arc(166+79*s.settled,133,17,23);p.arc(315-73*s.settled+s.dx*6,133+s.dy*7,17,23);break;
  }
  if(s.spec.type==='trace'||s.spec.type==='release'){
    if(s.spec.type==='trace'){g.setLineDash([4,5]);p.shape([...s.spec.points],ink,false);g.setLineDash([]);if(n>1){g.lineWidth=5;p.shape(s.spec.points.slice(0,n),a,false);}}
    s.spec.points.forEach(([x,y],i)=>{p.ellipse(x,y,12,12,i<n?a:ink);if(i===n)p.arc(x,y,17,17,a);g.fillStyle=i<n?ink:'#fff3d0';g.textAlign='center';g.font='bold 12px sans-serif';g.fillText(String(i+1),x,y+4);});
  }else if(s.spec.type==='catch'&&!s.done){
    const y=182,goal=s.spec.points[n][0];p.rect(66,y-3,348,6,ink);p.rect(goal-24,y-9,48,18,a);
    p.shape([[s.cursor,y-7],[s.cursor-7,y-24],[s.cursor+7,y-24]],'#fff8db');p.rect(s.cursor-1,y-8,2,13,'#fff8db');
  }else if(s.spec.type==='register'){
    const [x,y]=s.spec.points[0];p.arc(x,y,15,15,ink);p.rect(x-22,y-1,44,2);p.rect(x-1,y-22,2,44);
    const u=x+s.dx*15,v=y+s.dy*15;p.arc(u,v,22,22,a);p.rect(u-26,v-1,52,2,a);p.rect(u-1,v-26,2,52,a);
  }
  g.restore();g.strokeStyle=ink;g.lineWidth=2;g.strokeRect(10,12,460,202);
  for(const x of [17,463])for(const y of [19,207])p.ellipse(x,y,2,2,ink);
}
