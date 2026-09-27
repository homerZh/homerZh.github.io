import {test} from 'node:test';
import assert from 'node:assert/strict';
import {exerciseWeek,activityShortcuts,validDuration} from '../src/activity-tools.mjs';
test('seven days include selected day, missing durations stay separate',()=>{
 const rows=[{kind:'exercise',day:'2026-09-21',calories:100,duration_minutes:20},{kind:'exercise',day:'2026-09-27',calories:80,duration_minutes:null},{kind:'exercise',day:'2026-09-20',calories:999,duration_minutes:99},{kind:'snack',day:'2026-09-27',calories:500}];
 const week=exerciseWeek(rows,'2026-09-27');
 assert.equal(week.days.length,7);assert.equal(week.count,2);assert.equal(week.calories,180);assert.equal(week.minutes,20);assert.equal(week.missing,1);assert.equal(week.activeDays,2);
});
test('shortcuts require three matching activities and calories, use latest known duration',()=>{
 const rows=[{id:'1',day:'2026-09-01',kind:'exercise',note:'晚上步行20分钟',calories:130,duration_minutes:20},{id:'2',day:'2026-09-02',kind:'exercise',note:'晚饭前步行',calories:130,duration_minutes:null},{id:'3',day:'2026-09-03',kind:'exercise',note:'步行18分钟',calories:130,duration_minutes:18},{id:'4',day:'2026-09-04',kind:'exercise',note:'步行',calories:200,duration_minutes:30}];
 assert.deepEqual(activityShortcuts(rows,'exercise'),[{note:'步行',calories:130,count:3,duration_minutes:18}]);assert.deepEqual(activityShortcuts(rows.slice(0,2),'exercise'),[]);
});
test('duration accepts unknown but rejects invalid numeric values',()=>{
 assert.equal(validDuration(''),true);assert.equal(validDuration('25'),true);
 for(const value of ['0','-1','1.5','1441','bad'])assert.equal(validDuration(value),false);
});
