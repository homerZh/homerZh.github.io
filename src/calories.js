import { app } from './cloudbase-client.js';
import {MEALS,RECORD_TYPES,todayShanghai,endDate,planDays,difference,totalDifference,targetKcal,validCalories,describeDifference} from './calorie-math.mjs';
const $=id=>document.getElementById(id), config=window.CLOUDBASE_CONFIG;
const names={breakfast:'早餐',lunch:'中餐',dinner:'晚餐',snack:'加餐',exercise:'运动消耗'};
const entryDates=Object.fromEntries(RECORD_TYPES.map(m=>[m,todayShanghai()]));
const drafts={};
const auth=app.auth, db=app.rdb();
let plan={id:'main',start_date:todayShanghai(),breakfast:550,lunch:880,dinner:770}, records=[],loaded=false,allowed=false,busy=false;
$('date').value=todayShanghai();$('date').max=todayShanghai();
function checked(r){if(r.error)throw r.error;return r.data;}
function status(s,error=false){if(!error)$('retry').hidden=true;$('status').textContent=s;$('status').classList.toggle('error',error);}
function admin(session){return session?.user?.id===config.adminUid;}
function controls(){document.querySelectorAll('button').forEach(b=>b.disabled=busy||(!loaded&&b.closest('#meals, #settings-form')));$('date').disabled=busy;document.querySelectorAll('#meals input').forEach(i=>i.disabled=busy||!loaded);}
function render(){
 $('period').textContent=`${plan.start_date} 至 ${endDate(plan.start_date)}（${planDays(plan.start_date)} 天）`;
 $('daily-target').textContent=`日均计划差额 ${Math.round(targetKcal()/planDays(plan.start_date))} 千卡`;
 $('start-date').value=plan.start_date;
 MEALS.forEach(m=>$(`base-${m}`).value=plan[m]);
 const date=$('date').value,day=records.filter(r=>r.day===date);
 const total=totalDifference(records.filter(r=>r.day>=plan.start_date&&r.day<endDate(plan.start_date)));
 $('intake').textContent=loaded?`${day.filter(r=>r.meal!=='exercise').reduce((s,r)=>s+r.calories,0).toLocaleString()} 千卡`:'—';
 $('coverage').textContent=loaded?`${day.filter(r=>MEALS.includes(r.meal)).length} / 3 餐已记录`:'登录后查看';
 $('day-diff').textContent=loaded?`${totalDifference(day).toLocaleString()} 千卡`:'—';
 $('total-diff').textContent=loaded?`${total.toLocaleString()} 千卡`:'—';
 $('progress-text').textContent=loaded?`目标进度 ${(total/targetKcal()*100).toFixed(1)}%`:'登录后查看';
 $('progress').style.width=`${loaded?Math.min(100,Math.max(0,total/targetKcal()*100)):0}%`;
 $('meals').replaceChildren();
 for(const meal of RECORD_TYPES){
  const date=entryDates[meal];
  const r=records.find(r=>r.day===date&&r.meal===meal),card=document.createElement('form');card.className='meal';
  card.innerHTML=`<div class="meal-top"><h2>${names[meal]}</h2><span>${r?'已记录':'未记录'}</span></div><label class="entry-date" for="date-${meal}">日期<input id="date-${meal}" type="date" value="${date}" max="${todayShanghai()}" required></label><p class="baseline">${meal==='exercise'?'运动消耗计入净减少':meal==='snack'?'加餐摄入抵扣净减少':`对比基准 ${r?r.baseline:plan[meal]} 千卡`}</p><label for="input-${meal}">${meal==='exercise'?'当天运动总消耗':meal==='snack'?'当天加餐总摄入':'本餐总摄入'} · 千卡<input id="input-${meal}" type="number" min="0" max="10000" step="1" placeholder="输入千卡" required></label><p class="result${difference(r)<0?' over':''}">${r?(meal==='exercise'?`消耗 ${r.calories.toLocaleString()} 千卡`:describeDifference(difference(r))):'差额 0 千卡'}</p><div class="meal-actions"><button type="submit">${r?'更新记录':'保存记录'}</button>${r?'<button class="secondary" type="button">清除记录</button>':''}</div>`;
  const input=card.querySelector(`#input-${meal}`);const key=`${date}_${meal}`;input.value=drafts[key]??(r?r.calories:'');input.disabled=!loaded;
  input.addEventListener('input',()=>{drafts[key]=input.value;});
  card.querySelector(`#date-${meal}`).addEventListener('change',e=>{entryDates[meal]=e.target.value&&e.target.value<=todayShanghai()?e.target.value:todayShanghai();render();});
  card.addEventListener('submit',e=>{e.preventDefault();void run(async()=>{
   if(!validCalories(input.value))throw new Error('请输入 0–10000 的整数千卡。');
   if(!date||date>todayShanghai())throw new Error('请选择今天或之前的日期。');
   await requireAdmin();
   checked(await db.from('calorie_meals').upsert({id:`${date}_${meal}`,day:date,meal,calories:Number(input.value),baseline:MEALS.includes(meal)?(r?r.baseline:plan[meal]):0},{onConflict:'id'}));
   delete drafts[key];$('date').value=date;await afterSave(`${date} 的${names[meal]}已保存。`);
  });});
  card.querySelector('.secondary')?.addEventListener('click',()=>{if(!confirm(`清除 ${date} 的${names[meal]}记录？清除后差额为 0。`))return;void run(async()=>{await requireAdmin();checked(await db.from('calorie_meals').delete().eq('id',r.id));delete drafts[key];$('date').value=date;await afterSave('记录已清除，差额按 0 计算。');});});
  $('meals').append(card);
 }
 controls();
}
async function requireAdmin(){const data=checked(await auth.getSession());if(!admin(data?.session)){clearPrivate();throw new Error('请先用 homer 登录。');}}
function clearPrivate(){for(const key of Object.keys(drafts))delete drafts[key];allowed=false;loaded=false;records=[];plan={id:'main',start_date:todayShanghai(),breakfast:550,lunch:880,dinner:770};$('login').hidden=false;$('logout').hidden=true;render();}
async function load(){
 await requireAdmin();
 const plans=checked(await db.from('calorie_plan').select('*').eq('id','main'));
 if(!plans?.length)throw new Error('计划尚未初始化，请先执行饮食记录数据库脚本。');
 const all=[];
 for(let offset=0;;offset+=500){const rows=checked(await db.from('calorie_meals').select('id,day,meal,calories,baseline').order('id').range(offset,offset+499));all.push(...rows);if(rows.length<500)break;}
 if(!allowed)return;
 plan=plans[0];records=all;loaded=true;render();
}
async function afterSave(message){try{await load();status(message);}catch{loaded=false;records=[];render();status('已保存，但刷新失败。请刷新页面重新读取，不要重复提交。',true);}}
async function run(fn){if(busy)return;busy=true;controls();try{await fn();}catch(e){const code=String(e?.code||'');const msg=/PGRST205|42P01/.test(code)?'饮食记录表尚未创建，请先执行 calories.sql。':/42501/.test(code)?'数据库拒绝访问，请检查表权限。':e instanceof Error&&!code?e.message:'连接失败，请检查网络或数据库配置。';const safeCode=/^[A-Za-z0-9_.-]{1,80}$/.test(code)?code:'';status(msg+(safeCode?'（错误码：'+safeCode+'）':''),true);$('retry').hidden=false;if(!allowed){$('login').hidden=false;}}finally{busy=false;controls();}}
$('retry').addEventListener('click',()=>void run(async()=>{status('正在重新连接…');const data=checked(await auth.getSession());if(!admin(data?.session)){clearPrivate();status('请重新登录。');return;}allowed=true;$('login').hidden=true;$('logout').hidden=false;await load();status('已从云端读取。');}));
$('date').addEventListener('change',()=>{if(!$('date').value||$('date').value>todayShanghai())$('date').value=todayShanghai();render();});
$('login').addEventListener('submit',e=>{e.preventDefault();void run(async()=>{status('正在登录…');const password=$('password').value;$('password').value='';checked(await auth.signInWithPassword({username:$('username').value.trim(),password}));const data=checked(await auth.getSession());if(!admin(data?.session)){checked(await auth.signOut());throw new Error('此账号没有记录权限。');}allowed=true;$('login').hidden=true;$('logout').hidden=false;await load();status('已从云端读取。');});});
$('logout').addEventListener('click',()=>void run(async()=>{checked(await auth.signOut());clearPrivate();status('已退出登录。');}));
$('settings-form').addEventListener('submit',e=>{e.preventDefault();void run(async()=>{await requireAdmin();const next={id:'main',start_date:$('start-date').value};if(!/^\d{4}-\d{2}-\d{2}$/.test(next.start_date)||next.start_date<'2000-01-01'||next.start_date>'2100-01-01')throw new Error('请填写有效的开始日期。');for(const m of MEALS){const v=$(`base-${m}`).value;if(!validCalories(v)||Number(v)<1)throw new Error('餐次基准必须是 1–10000 的整数。');next[m]=Number(v);}checked(await db.from('calorie_plan').upsert(next,{onConflict:'id'}));await afterSave('设置已保存，已有餐次的对比基准保持不变。');});});
auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){clearPrivate();status('已退出登录。');}});
render();
void run(async()=>{const data=checked(await auth.getSession());if(!admin(data?.session)){clearPrivate();status('登录后可以记录与查看个人数据。');return;}allowed=true;$('logout').hidden=false;await load();status('已从云端读取。');});
