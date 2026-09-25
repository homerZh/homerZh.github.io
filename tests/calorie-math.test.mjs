import {test} from 'node:test';
import assert from 'node:assert/strict';
import {difference,totalDifference,endDate,planDays,targetKcal,validCalories} from '../src/calorie-math.mjs';
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
test('invalid, blank and fractional input rejected',()=>{for(const n of ['',-1,'bad',0.5,10001])assert.equal(validCalories(n),false);assert.equal(validCalories('0'),true);});
