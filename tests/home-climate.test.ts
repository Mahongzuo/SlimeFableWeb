import test from 'node:test';
import assert from 'node:assert/strict';
import {beijingSky,HomeClimate,naturalWeather,weatherMode} from '../src/home/climate';

test('Beijing midnight changes the home season at each boundary, including leap February',()=>{
  for (const [date,before,after] of [['2024-03-01',3,0],['2026-06-01',0,1],['2026-09-01',1,2],['2026-12-01',2,3]] as const){
    const midnight=Date.parse(date+'T00:00:00+08:00');
    assert.equal(beijingSky(midnight-1).season,before);assert.equal(beijingSky(midnight).season,after);
    assert.equal(beijingSky(midnight).date,date);
  }
  assert.equal(beijingSky(Date.parse('2024-02-29T13:00:00Z')).date,'2024-02-29');
});
test('automatic fronts are repeatable and seasonal; a running scene crosses midnight',()=>{
  const start=Date.parse('2026-11-30T23:59:59+08:00'),c=new HomeClimate(start);
  c.update(2,start+2000);assert.equal(c.sky.season,3);
  assert.equal(c.target,naturalWeather(start+2000,3));
  const choices=(s:number)=>Array.from({length:8},(_,i)=>naturalWeather(start+i*180000,s));
  assert.ok(choices(3).includes('snow'));assert.ok(!choices(1).includes('snow'));
  assert.equal(beijingSky(Date.parse('2026-11-25T12:00:00+08:00')).daylight,1);
  assert.equal(beijingSky(start).daylight,0);
});
test('weather transitions can be interrupted and leave wet ground and melting snow',()=>{
  const noon=Date.parse('2026-11-25T12:00:00+08:00'),c=new HomeClimate(noon),w=c.weather;
  c.mode='clear';c.update(180,noon);c.mode='rain';c.update(181,noon);
  assert.ok(w.rain>0 && w.rain<.5);const rain=w.rain;
  c.mode='snow';c.update(181,noon);assert.equal(w.rain,rain);
  c.update(193,noon);assert.ok(w.snow>.98 && w.cover>.7 && w.rain<.05);
  c.mode='clear';c.update(205,noon);assert.ok(w.snow<.02 && w.cover>.3);
  c.mode='rainbow';c.update(230,noon);assert.ok(w.rainbow>.99);
  c.mode='auto';c.update(231,noon);assert.equal(c.target,naturalWeather(noon,2));
  for(const invalid of ['unknown','constructor',null])assert.equal(weatherMode(invalid),'auto');
});
