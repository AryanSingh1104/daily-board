import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {allQuestions,totalItems,allowedMisses,status,getStats,answerBlank,answerMatch,answerSet,reveal,cleanAnswers,resultText} from '../docs/core.mjs';
const b=JSON.parse(readFileSync(new URL('../docs/boards.json',import.meta.url))).boards[0];
const [music,identify,countries,wildcard]=b.categories;
test('beta content has 36 sourced items, with targets 1/2/3 and one miss per tile',()=>{
 assert.equal(allQuestions(b).reduce((n,q)=>n+totalItems(q),0),36);
 for(const c of b.categories)for(const [i,q]of c.questions.entries()){
  assert.equal(q.value,(i+1)*100);assert.equal(q.required,i+1);assert.equal(totalItems(q),i+2);assert.equal(allowedMisses(q),1);
  for(const item of q.items||q.pairs||q.answers)assert.match(item.source,/^https:\/\//);
 }
});
test('one correct clears 100 points immediately; later attempts cannot add more',()=>{
 const q=music.questions[0];const first=answerBlank(q,{},0,'FREDDIE MERCURY!');assert.equal(first.result,'correct');assert.ok(status(q,first.state).won);
 assert.equal(getStats(b,{[q.id]:first.state}).score,100);assert.equal(answerBlank(q,first.state,1,'Liverpool').result,'locked');
});
test('one miss still permits 3 of 4; second miss closes and preserves other score',()=>{
 const q=music.questions[2];let s=answerBlank(q,{},0,'wrong').state;assert.ok(!status(q,s).ended);
 for(const i of [1,2,3])s=answerBlank(q,s,i,q.items[i].answers[0]).state;assert.ok(status(q,s).won);
 let failed=answerBlank(q,{},0,'wrong').state;failed=answerBlank(q,failed,1,'also wrong').state;assert.ok(status(q,failed).lost);
 assert.equal(answerBlank(q,failed,2,'Sax').result,'locked');const easy=music.questions[0];assert.equal(getStats(b,{[q.id]:failed,[easy.id]:answerBlank(easy,{},0,'Mercury').state}).score,100);
});
test('wrong matching choice closes only that place, leaving chosen country usable',()=>{
 const q=countries.questions[1];let s=answerMatch(q,{},0,1).state;assert.deepEqual(s.wrong,[0]);assert.equal(answerMatch(q,s,0,0).result,'locked');
 s=answerMatch(q,s,1,1).state;assert.deepEqual(s.correct,[1]);assert.equal(answerMatch(q,s,2,1).result,'locked');
 s=answerMatch(q,s,2,2).state;assert.ok(status(q,s).won);
});
test('set aliases and repeats are free; two distinct wrong guesses close',()=>{
 const q=wildcard.questions[2];let a=answerSet(q,{},'French Open');assert.equal(a.result,'correct');a=answerSet(q,a.state,'Roland Garros');assert.equal(a.result,'duplicate');assert.equal(a.state.misses,0);
 a=answerSet(q,a.state,'Wrong');assert.equal(a.state.misses,1);a=answerSet(q,a.state,'Wrong!');assert.equal(a.result,'duplicate');a=answerSet(q,a.state,'Another');assert.ok(status(q,a.state).lost);
});
test('empty input is free; punctuation, accents and documented aliases accepted',()=>{
 const q=music.questions[1];assert.equal(answerBlank(q,{},1,'   ').result,'empty');assert.equal(answerBlank(q,{},1,'INC.').result,'correct');
 const set=wildcard.questions[2];assert.equal(answerSet(set,{},'Róland-Garros').result,'correct');
});
test('reveal forfeits unfinished tile, retains earned points and save sanitizes data',()=>{
 const q=music.questions[0];const lost=reveal(q,{});assert.ok(status(q,lost).lost);assert.equal(answerBlank(q,lost,0,'Mercury').result,'locked');
 const won=answerBlank(q,{},0,'Mercury').state;assert.ok(status(q,reveal(q,won)).won);
 const restored=cleanAnswers(b,JSON.parse(JSON.stringify({[q.id]:won,unknown:{correct:[1]}})));assert.equal(getStats(b,restored).score,100);assert.equal(restored.unknown,undefined);
 const safe=cleanAnswers(b,{[q.id]:{correct:[-1,0,0,99],wrong:[0,1]}});assert.deepEqual(safe[q.id].correct,[0]);assert.deepEqual(safe[q.id].wrong,[1]);
});
test('a complete board earns 2400, uses 24 correct, and share text contains no answers',()=>{
 const a={};for(const q of allQuestions(b)){let s={};for(let i=0;i<q.required;i++)s=(['fill_blank','identify'].includes(q.type)?answerBlank(q,s,i,q.items[i].answers[0]):q.type==='matching'?answerMatch(q,s,i,i):answerSet(q,s,q.answers[i].name)).state;a[q.id]=s;}
 const stats=getStats(b,a);assert.equal(stats.score,2400);assert.equal(stats.correct,24);assert.ok(stats.complete);const text=resultText(b,a);assert.match(text,/1\/2 · 2\/3 · 3\/4/);assert.ok(!text.includes('Mercury'));
 assert.throws(()=>answerMatch(countries.questions[0],{},-1,0));
});

test('description clues accept names and symbols, retain the one-attempt rule',()=>{
 const q=identify.questions[1];let s=answerBlank(q,{},0,'Austen').state;assert.equal(s.correct.length,1);assert.equal(answerBlank(q,s,0,'Jane Austen').result,'locked');s=answerBlank(q,s,1,'Gold').state;assert.ok(status(q,s).won);
 const hard=identify.questions[2];assert.equal(answerBlank(hard,{},1,'Wolfram').result,'correct');assert.equal(answerBlank(hard,{},0,'Pierre Curie').result,'wrong');
});
test('four distinct formats, source links and local accessible picture cards',()=>{
 assert.deepEqual(b.categories.map(c=>c.format),['fill_blank','identify','matching','name_set']);
 const pictures=countries.questions.flatMap(q=>q.pairs).filter(p=>p.image);assert.equal(pictures.length,5);
 for(const p of pictures){assert.ok(p.image.alt.includes(p.left));const svg=readFileSync(new URL('../docs/'+p.image.src.replace('./',''),import.meta.url),'utf8');assert.match(svg,/<svg/);assert.ok(!svg.includes('<script'));}
 const answers=allQuestions(b).flatMap(q=>q.items?.flatMap(i=>i.answers)||q.pairs?.map(p=>p.right)||q.answers?.map(a=>a.name));assert.ok(!answers.includes('Mars'));
});
