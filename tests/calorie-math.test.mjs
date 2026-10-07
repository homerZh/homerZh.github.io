import {test} from 'node:test';
import assert from 'node:assert/strict';
import {difference,totalDifference,endDate,planDays,planProgress,targetKcal,validCalories} from '../src/calorie-math.mjs';
test('missing meal contributes zero, explicit zero intake is a record',()=>{assert.equal(difference(undefined),0);assert.equal(difference({baseline:550,calories:0}),550);});
test('over baseline offsets savings',()=>assert.equal(totalDifference([{baseline:550,calories:400},{baseline:880,calories:1000}]),30));
test('no records produces no savings',()=>assert.equal(totalDifference([]),0));
test('snacks subtract and exercise adds to net savings',()=>{
 assert.equal(difference({meal:'snack',baseline:0,calories:200}),-200);
 assert.equal(difference({meal:'exercise',baseline:0,calories:350}),350);
 assert.equal(totalDifference([{meal:'breakfast',baseline:550,calories:400},{meal:'snack',baseline:0,calories:200},{meal:'exercise',baseline:0,calories:350}]),300);
});
test('multiple activity entries are counted separately with meals',()=>{
 const records=[{meal:'breakfast',baseline:550,calories:400},{kind:'snack',calories:100},{kind:'snack',calories:80},{kind:'exercise',calories:250},{kind:'exercise',calories:50}];
 assert.equal(totalDifference(records),270);
});
test('six calendar months handles short months and leap years',()=>{assert.equal(endDate('2026-08-31'),'2027-02-28');assert.equal(endDate('2023-08-31'),'2024-02-29');assert.equal(planDays('2026-09-21'),181);});
test('goal is explicit simplified conversion',()=>assert.equal(targetKcal(),115500));
test('remaining daily target uses recorded net savings and elapsed calendar days',()=>{
 const records=[{day:'2026-09-21',baseline:550,calories:400},{day:'2026-10-08',kind:'snack',calories:80},{day:'2026-10-08',kind:'exercise',calories:250}];
 assert.deepEqual(planProgress('2026-09-21',records,'2026-10-08'),{daysLeft:164,total:320,remaining:115180,daily:703});
 assert.equal(planProgress('2026-09-21',records,'2026-10-09').daysLeft,163);
 assert.equal(planProgress('2026-09-21',records,'2026-10-09').daily,707);
});
test('plan summary excludes records before start, after today and on deadline',()=>{
 const records=['2026-09-20','2026-10-09','2027-03-21'].map(day=>({day,kind:'exercise',calories:500}));
 assert.equal(planProgress('2026-09-21',records,'2026-10-08').total,0);
 assert.equal(planProgress('2026-09-21',records,'2027-03-21').total,500);
});
test('missing records increase daily target as time passes; overspending increases remainder',()=>{
 assert.equal(planProgress('2026-09-21',[],'2026-10-08').daily,705);
 assert.equal(planProgress('2026-09-21',[],'2026-10-09').daily,709);
 assert.equal(planProgress('2026-09-21',[{day:'2026-10-08',kind:'snack',calories:100}],'2026-10-08').remaining,115600);
});
test('remaining days clamp before start and at or after deadline without dividing by zero',()=>{
 assert.equal(planProgress('2026-09-21',[],'2026-09-01').daysLeft,181);
 for(const day of ['2027-03-21','2027-03-22']) {
  const summary=planProgress('2026-09-21',[],day);
  assert.equal(summary.daysLeft,0);assert.equal(summary.daily,null);assert.equal(summary.remaining,115500);
 }
 assert.equal(planProgress('2026-08-31',[],'2027-02-27').daysLeft,1);
});
test('achieved record target has no negative remaining daily target',()=>{
 const summary=planProgress('2026-09-21',[{day:'2026-10-08',kind:'exercise',calories:120000}],'2026-10-08');
 assert.equal(summary.remaining,0);assert.equal(summary.daily,0);
});
test('invalid, blank and fractional input rejected',()=>{for(const n of ['',-1,'bad',0.5,10001])assert.equal(validCalories(n),false);assert.equal(validCalories('0'),true);});
