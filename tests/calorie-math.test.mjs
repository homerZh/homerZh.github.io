import {test} from 'node:test';
import assert from 'node:assert/strict';
import {difference,totalDifference,endDate,planDays,targetKcal,validCalories} from '../src/calorie-math.mjs';
test('missing meal contributes zero, explicit zero intake is a record',()=>{assert.equal(difference(undefined),0);assert.equal(difference({baseline:550,calories:0}),550);});
test('over baseline offsets savings',()=>assert.equal(totalDifference([{baseline:550,calories:400},{baseline:880,calories:1000}]),30));
test('no records produces no savings',()=>assert.equal(totalDifference([]),0));
test('six calendar months handles short months and leap years',()=>{assert.equal(endDate('2026-08-31'),'2027-02-28');assert.equal(endDate('2023-08-31'),'2024-02-29');assert.equal(planDays('2026-09-21'),181);});
test('goal is explicit simplified conversion',()=>assert.equal(targetKcal(),115500));
test('invalid, blank and fractional input rejected',()=>{for(const n of ['',-1,'bad',0.5,10001])assert.equal(validCalories(n),false);assert.equal(validCalories('0'),true);});
