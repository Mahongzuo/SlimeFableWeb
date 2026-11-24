import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCourse,floorAt,laneAt,openTarget,skirmishDays,targetPoint} from '../src/templates/january-skirmish';

assert.equal(skirmishDays.length,365);
for(const day of skirmishDays){
  test(day+' 两条实地路线跨过所有拼缝，四个交火靶均可完成',()=>{
    for(let seed=0;seed<40;seed++){
      const c=buildCourse(day,String(seed)),w=c.tiles[0].width,z=c.tiles[0].depth;
      for(const lane of [-1,1] as const){
        const x=lane*w,points=[[0,c.spawn[2]],[x,c.spawn[2]],[x,-z*1.5],[0,c.end[2]]];
        let height=0;for(let k=1;k<points.length;k++){
          const [a,b]=[points[k-1],points[k]];
          for(let i=0;i<=80;i++){
            const f=i/80,h=floorAt(c,a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f);
            assert.notEqual(h,null);assert.ok(Math.abs(h!-height)<.34);height=h!;
          }
        }
        assert.equal(laneAt(c,[x,floorAt(c,x,0)!,0]),lane);
      }
      const cleared=new Set<number>(),visited=new Set<-1|1>();
      assert.ok(openTarget(0,cleared,visited));cleared.add(0);
      assert.ok(!openTarget(1,cleared,visited));visited.add(-1);
      for(const i of [2,1,3]){assert.ok(openTarget(i,cleared,visited));cleared.add(i);assert.ok(!openTarget(i,cleared,visited));}
      for(let i=0;i<4;i++)for(let time=0;time<8;time+=.55){
        const [x,y,z]=targetPoint(c,i,time,false),h=floorAt(c,x,z);
        assert.notEqual(h,null);assert.ok(y+.75>h!);
      }
    }
  });
}
