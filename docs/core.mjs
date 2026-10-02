export const GOAL = 1200;
export const allQuestions = board => board.categories.flatMap(c => c.questions);
export const entries = q => q.items || q.pairs || q.answers;
export const totalItems = q => entries(q).length;
export const allowedMisses = q => totalItems(q) - q.required;
export const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]/g,'');
export function cleanState(q, input = {}) {
  const valid = values => [...new Set((Array.isArray(values)?values:[]).filter(i => Number.isInteger(i) && i >= 0 && i < totalItems(q)))];
  const correct = valid(input?.correct);
  const wrong = valid(input?.wrong).filter(i => !correct.includes(i));
  const guesses = [...new Set((Array.isArray(input?.guesses)?input.guesses:[]).filter(s=>typeof s==='string'&&s.length<=100))].slice(0,20);
  const misses = q.type === 'name_set' ? Math.min(allowedMisses(q)+1, Number.isInteger(input?.misses)&&input.misses>=0?input.misses:0) : wrong.length;
  return {correct,wrong,guesses,misses,gaveUp:input?.gaveUp===true,revealed:input?.revealed===true};
}
export function cleanAnswers(board, input = {}) {
  const result = {};
  for(const q of allQuestions(board)) if(input?.[q.id] && typeof input[q.id]==='object') result[q.id]=cleanState(q,input[q.id]);
  return result;
}
export function status(q, input) {
  const s=cleanState(q,input);
  const won=s.correct.length>=q.required;
  const lost=!won&&(s.gaveUp||s.misses>allowedMisses(q));
  return {...s,won,lost,ended:won||lost,remaining:Math.max(0,allowedMisses(q)-s.misses),needed:Math.max(0,q.required-s.correct.length)};
}
export function getStats(board, answers) {
  const states=allQuestions(board).map(q=>({q,s:status(q,answers[q.id])}));
  const score=states.reduce((n,{q,s})=>n+(s.won?q.value:0),0);
  return {score,cleared:states.filter(x=>x.s.won).length,finished:states.filter(x=>x.s.ended).length,total:states.length,correct:states.reduce((n,{s})=>n+s.correct.length,0),misses:states.reduce((n,{s})=>n+s.misses,0),won:score>=GOAL,complete:states.every(x=>x.s.ended)};
}
function validIndex(q, index) { if(!Number.isInteger(index)||index<0||index>=totalItems(q)) throw new Error('Invalid item.'); }
export function answerBlank(q,input,index,value) {
  if(q.type!=='fill_blank')throw new Error('Wrong question format.');validIndex(q,index);
  const s=cleanState(q,input), normalized=normalize(value);
  if(status(q,s).ended||s.correct.includes(index)||s.wrong.includes(index))return {state:s,result:'locked'};
  if(!normalized)return {state:s,result:'empty'};
  const correct=q.items[index].answers.some(a=>normalize(a)===normalized);
  return {state:{...s,[correct?'correct':'wrong']:[...s[correct?'correct':'wrong'],index],misses:s.misses+(correct?0:1)},result:correct?'correct':'wrong'};
}
export function answerMatch(q,input,left,right) {
  if(q.type!=='matching')throw new Error('Wrong question format.');validIndex(q,left);validIndex(q,right);
  const s=cleanState(q,input);
  if(status(q,s).ended||s.correct.includes(left)||s.wrong.includes(left)||s.correct.includes(right))return {state:s,result:'locked'};
  const correct=left===right;
  return {state:{...s,[correct?'correct':'wrong']:[...s[correct?'correct':'wrong'],left],misses:s.misses+(correct?0:1)},result:correct?'correct':'wrong'};
}
export function answerSet(q,input,value) {
  if(q.type!=='name_set')throw new Error('Wrong question format.');
  const s=cleanState(q,input),n=normalize(value);
  if(status(q,s).ended)return {state:s,result:'locked'};
  if(!n)return {state:s,result:'empty'};
  const i=q.answers.findIndex(a=>[a.name,...a.aliases].some(x=>normalize(x)===n));
  if((i>=0&&s.correct.includes(i))||s.guesses.includes(n))return {state:s,result:'duplicate'};
  return {state:{...s,correct:i>=0?[...s.correct,i]:s.correct,misses:s.misses+(i<0?1:0),guesses:[...s.guesses,n]},result:i>=0?'correct':'wrong'};
}
export function reveal(q,input) { const s=cleanState(q,input);return {...s,revealed:true,gaveUp:status(q,s).won?s.gaveUp:true}; }
export function resultText(board,answers) {
  const s=getStats(board,answers);
  const grid=[0,1,2].map(row=>board.categories.map(c=>{const st=status(c.questions[row],answers[c.questions[row].id]);return st.won?'🟦':st.lost?'⬛':st.correct.length?'🟨':'⬜';}).join('')).join('\n');
  return `Daily Board · Beta\n${s.score.toLocaleString('en-US')} / 2,400 points · ${s.cleared}/12 tiles cleared\n${grid}\n1/2 · 2/3 · 3/4\n${s.correct} answers found · ${s.misses} misses\n${s.won?'Daily goal reached!':s.complete?'Board complete.':'Still playing.'}`;
}
