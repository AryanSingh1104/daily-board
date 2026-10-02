import { GOAL, allQuestions, entries, totalItems, allowedMisses, cleanAnswers, status, getStats, answerBlank, answerMatch, answerSet, reveal, resultText } from './core.mjs';
const $ = s => document.querySelector(s);
const esc = v => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => n.toLocaleString('en-US');
const dialog=$('#game-dialog');
const formatNames={fill_blank:'Fill the blanks',matching:'Match pairs',name_set:'Name the set'};
let boards=[],boardIndex=0,answers={},activeId=null,selectedLeft=null,toastTimer;
let drafts={},seenCategories={};
const board=()=>boards[boardIndex];
const key=()=>`daily-board-threshold-v2:${board().id}`;
const active=()=>allQuestions(board()).find(q=>q.id===activeId);
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4000);}
function load(){try{answers=cleanAnswers(board(),JSON.parse(localStorage.getItem(key())||'{}'));}catch{answers={};}try{seenCategories=JSON.parse(localStorage.getItem(key()+':rules')||'{}')||{};}catch{seenCategories={};}}
function save(){try{localStorage.setItem(key(),JSON.stringify(answers));}catch{$('#save-note').textContent='Progress stays only for this visit.';}}
function setView(view){$('#play-view').hidden=view!=='play';$('#categories-view').hidden=view!=='categories';for(const [id,on]of[['#play-tab',view==='play'],['#categories-tab',view==='categories']]){$(id).classList.toggle('active',on);$(id).setAttribute('aria-pressed',String(on));}}
function renderBoard(){
  const b=board(),s=getStats(b,answers);
  $('#board-edition').textContent='BETA · BOARD 01';$('#score').textContent=fmt(s.score);
  $('#goal-fill').style.width=`${Math.min(100,s.score/GOAL*100)}%`;$('#goal-fill').style.background=s.won?'var(--green)':'var(--blue)';
  $('.goal-track').setAttribute('aria-valuenow',String(Math.min(GOAL,s.score)));
  $('#goal-label').innerHTML=s.won?'<strong>✓ Daily goal reached</strong>':'Daily goal <strong>1,200</strong>';
  $('#progress-copy').textContent=s.complete?'Board complete. A little wiser.':s.won?'Day won. Keep going if you like.':`${fmt(GOAL-s.score)} points to your daily win.`;
  $('#clue-count').textContent=`${s.cleared} / 12 cleared`;
  const headers=b.categories.map(c=>{const points=c.questions.reduce((n,q)=>n+(status(q,answers[q.id]).won?q.value:0),0);return `<div class="category-head"><span class="family">${esc(c.family)}</span><h2>${esc(c.title)}</h2><span class="format-tag">${formatNames[c.format]}</span><div class="mini-track" role="progressbar" aria-label="${esc(c.title)} points" aria-valuemin="0" aria-valuemax="600" aria-valuenow="${points}"><span style="width:${points/6}%"></span></div></div>`;}).join('');
  const tiles=[0,1,2].flatMap(row=>b.categories.map(c=>{const q=c.questions[row],st=status(q,answers[q.id]);return `<button class="clue ${st.won?'correct':st.lost?'incorrect':''}" data-question="${q.id}" aria-label="${esc(c.title)} for ${q.value} points, ${st.won?'cleared':st.lost?'closed':`get ${q.required} of ${totalItems(q)}`}" ><span class="tile-value">${st.won?'+':''}${st.lost?'—':q.value}</span><span class="tile-state">${st.won?'✓ CLEARED':st.lost?'CLOSED':st.correct.length?`${st.correct.length}/${q.required} FOUND`:`GET ${q.required} OF ${totalItems(q)}`}</span></button>`;})).join('');
  $('#board').innerHTML=headers+tiles;
}
function showDialog(html){$('#dialog-body').innerHTML=html;if(!dialog.open)dialog.showModal();}
function closeDialog(){dialog.close();if(activeId)$(`[data-question="${activeId}"]`)?.focus();activeId=null;selectedLeft=null;}
function categoryFor(q){return board().categories.find(c=>c.questions.includes(q));}
function showCategoryRules(){const q=active(),c=categoryFor(q);showDialog(`<p class="eyebrow">${esc(c.family)} · ${formatNames[c.format]}</p><h2 class="question-title" id="dialog-title">${esc(c.title)}</h2><p class="category-rule">${esc(c.intro.rule)}</p><div class="intro-example"><span>EXAMPLE ONLY</span><p>${esc(c.intro.example)}</p></div><p class="intro-target"><strong>Get ${q.required} of ${totalItems(q)} correct.</strong> One miss allowed.</p><p class="prototype-note">${q.type==='name_set'?'Repeated answers are free.':'One try per item.'} A second miss closes this tile.</p><div class="dialog-actions"><button class="primary-button" data-action="start-tile">${status(q,answers[q.id]).ended?'Review tile':`Start ${q.value}-point tile`}</button><button class="secondary-button" data-action="back">Back</button></div>`);dialog.scrollTop=0;}
function startQuestion(id){activeId=id;selectedLeft=null;const c=categoryFor(active());if(seenCategories[c.id]!==true)showCategoryRules();else renderQuestion();dialog.scrollTop=0;}
function sources(q){return [...new Set(entries(q).map(i=>i.source))].map((url,i)=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Source ${i+1}</a>`).join(' · ');}
function canonical(q,i){return q.type==='fill_blank'?q.items[i].answers[0]:q.type==='matching'?q.pairs[i].right:q.answers[i].name;}
function shuffled(q){let a=q.pairs.map((_,i)=>i),seed=[...q.id].reduce((n,c)=>n+c.charCodeAt(0),0);for(let i=a.length-1;i>0;i--){seed=(seed*9301+49297)%233280;const j=seed%(i+1);[a[i],a[j]]=[a[j],a[i]];}if(a.every((x,i)=>x===i))a.push(a.shift());return a;}
function blankBody(q,st){return `<div class="blank-list">${q.items.map((item,i)=>{
  const correct=st.correct.includes(i),wrong=st.wrong.includes(i),disabled=correct||wrong||st.ended;
  return `<form class="blank-row ${correct?'right-row':wrong?'wrong-row':''}" data-blank="${i}"><label for="blank-${i}"><span class="item-number">${i+1}.</span> ${esc(item.prompt)}</label><div class="blank-control"><input id="blank-${i}" name="answer" type="text" maxlength="100" autocomplete="off" spellcheck="false" value="${esc(correct||st.revealed?item.answers[0]:drafts[q.id]?.[i]||'')}" ${disabled?'disabled':''} aria-label="Answer ${i+1}"><button class="${disabled?'answer-status':'secondary-button'}" ${disabled?'disabled':''}>${correct?'✓':wrong?'×':st.ended?'—':'Check'}</button></div></form>`;
  }).join('')}</div>`;}
function matchBody(q,st){
  const button=(i,side)=>{const correct=st.correct.includes(i),wrong=st.wrong.includes(i),disabled=correct||st.ended||(side==='left'&&wrong);return `<button class="match-item ${correct?'matched':''} ${side==='left'&&wrong?'missed':''} ${side==='left'&&selectedLeft===i?'selected':''}" data-${side}="${i}" ${disabled?'disabled':''} ${side==='left'?`aria-pressed="${selectedLeft===i}"`:''}><span>${esc(q.pairs[i][side])}</span>${correct?'✓':side==='left'&&wrong?'×':''}</button>`;};
  return `<p class="format-instruction">Pick a place, then its country. One attempt per place.</p><div class="matching-grid"><div><p class="match-column-label">PLACE</p><div class="match-scroll" id="left-list">${q.pairs.map((_,i)=>button(i,'left')).join('')}</div></div><div><p class="match-column-label">COUNTRY</p><div class="match-scroll" id="right-list">${shuffled(q).map(i=>button(i,'right')).join('')}</div></div></div>${st.revealed?`<ul class="answer-review">${q.pairs.map(p=>`<li>${esc(p.left)} — ${esc(p.right)}</li>`).join('')}</ul>`:''}`;
}
function setBody(q,st){return `${!st.ended?'<form id="set-form" class="set-form"><label for="set-answer">One answer at a time, in any order</label><div class="blank-control"><input id="set-answer" name="answer" type="text" maxlength="100" autocomplete="off" spellcheck="false" placeholder="Type an answer"><button class="primary-button">Add</button></div></form>':''}<div class="set-slots">${q.answers.map((a,i)=>{const found=st.correct.includes(i);return `<div class="set-slot ${found?'found':''}">${found?`✓ ${esc(a.name)}`:st.revealed?esc(a.name):'<span aria-label="Unfound answer">· · ·</span>'}</div>`;}).join('')}</div><p class="question-hint">Repeated answers don’t count twice or cost a miss.</p>`;}
function renderQuestion(feedback=''){
  const q=active();if(!q)return;
  const st=status(q,answers[q.id]),c=board().categories.find(c=>c.questions.includes(q));
  const oldScroll=dialog.scrollTop,leftScroll=$('#left-list')?.scrollTop||0,rightScroll=$('#right-list')?.scrollTop||0;
  const progress=Array.from({length:q.required},(_,i)=>`<i class="${i<st.correct.length?'filled':''}"></i>`).join('');
  const remaining=st.ended?'':`${st.remaining} miss${st.remaining===1?'':'es'} left${st.remaining===0?' · next miss closes tile':''}`;
  const footer=st.ended?`<div class="tile-outcome"><h3>${st.won?`Enough to win. +${q.value} points.`:'This tile is closed.'}</h3><p>${st.won?'You reached the target. The remaining answers are optional to reveal.':'Your other points are safe. Try another part of the board.'}</p><div class="dialog-actions"><button class="primary-button" data-action="back">Back to the board</button>${!st.revealed?'<button class="secondary-button" data-action="reveal">Show answers</button>':''}</div>${st.revealed?`<p class="source-list">${sources(q)}</p>`:''}</div>`:'<div class="puzzle-bottom"><button class="text-button" data-action="back">Save & come back</button><button class="text-button" data-action="give-up">Give up this tile</button></div>';
  showDialog(`<div class="puzzle-heading"><p class="question-meta">${esc(c.title)} · ${q.value} POINTS</p><button class="text-button" data-action="rules">Rules</button></div><h2 class="question-title" id="dialog-title">${esc(q.prompt)}</h2><div class="threshold-panel"><div><strong>${st.correct.length} / ${q.required} needed</strong><span>${st.won?'✓ Points earned':st.lost?'Tile closed':remaining}</span></div><div class="threshold-dots" aria-hidden="true">${progress}</div></div><p class="puzzle-feedback" role="status">${feedback||`Choose the ${q.required} you know. You don’t need all ${totalItems(q)}.`}</p>${q.type==='fill_blank'?blankBody(q,st):q.type==='matching'?matchBody(q,st):setBody(q,st)}${footer}`);
  dialog.scrollTop=oldScroll;if($('#left-list'))$('#left-list').scrollTop=leftScroll;if($('#right-list'))$('#right-list').scrollTop=rightScroll;
}
function applyAttempt(attempt,focusIndex){
  const q=active(),wasWon=getStats(board(),answers).won;
  answers[q.id]=attempt.state;save();renderBoard();
  const messages={correct:'That’s one. Keep going.',wrong:'Not this one. Your other answers are safe.',empty:'Type an answer first.',duplicate:'Already tried that. No miss used.',locked:'This item is already finished.'};
  const st=status(q,answers[q.id]);
  renderQuestion(st.won?'Target reached! Points added to your board.':st.lost?'No more misses available on this tile.':messages[attempt.result]);
  if(st.ended){$('.tile-outcome').scrollIntoView({block:'nearest',behavior:'auto'});$('[data-action="back"]').focus({preventScroll:true});}
  else if(q.type==='name_set')$('#set-answer')?.focus({preventScroll:true});
  else if(q.type==='fill_blank'){
    const next=q.items.findIndex((_,i)=>i>focusIndex&&!st.correct.includes(i)&&!st.wrong.includes(i));
    const fallback=q.items.findIndex((_,i)=>!st.correct.includes(i)&&!st.wrong.includes(i));
    const input=$(`#blank-${attempt.result==='empty'?focusIndex:next<0?fallback:next}`);input?.focus({preventScroll:true});input?.scrollIntoView({block:'nearest'});
  }
  if(!wasWon&&getStats(board(),answers).won)toast('1,200 points! You’ve won the day.');
}
function showResults(){activeId=null;const s=getStats(board(),answers);const squares=[0,1,2].flatMap(row=>board().categories.map(c=>{const q=c.questions[row],st=status(q,answers[q.id]);return `<span class="result-square ${st.won?'correct':st.lost?'incorrect':''}" aria-label="${esc(c.title)} ${q.value}: ${st.won?'cleared':st.lost?'closed':'unfinished'}">${st.won?'✓':st.lost?'×':st.correct.length?'◐':'·'}</span>`;})).join('');showDialog(`<p class="eyebrow">BETA BOARD</p><h2 class="question-title" id="dialog-title">${s.won?'A little triumph, earned.':'Your board so far.'}</h2><div class="result-score">${fmt(s.score)}</div><p class="result-description">of 2,400 points · ${s.cleared} tiles cleared<br>${s.correct} answers found · ${s.misses} misses</p><div class="results-grid">${squares}</div><div class="dialog-actions"><button class="primary-button" data-action="copy-results">Copy results</button><button class="secondary-button" data-action="back">Back to board</button></div><div id="copy-fallback"></div>`);}
function showHelp(){activeId=null;showDialog('<p class="eyebrow">KNOW ENOUGH. WIN THE TILE.</p><h2 class="question-title" id="dialog-title">Leave a few blanks.</h2><div class="rules-table"><div><strong>100 points</strong><span>Get 1 of 2 · one miss allowed</span></div><div><strong>200 points</strong><span>Get 2 of 3 · one miss allowed</span></div><div><strong>300 points</strong><span>Get 3 of 4 · one miss allowed</span></div></div><ol class="rules"><li>Pick any tile. Each column has a consistent format.</li><li>Fill a blank, match a pair, or name a member of a set.</li><li>For blanks and matching, you get one attempt per item. For sets, each new incorrect guess uses a miss. Duplicates are free.</li><li>Meet the target to earn the tile’s points. Too many misses close that tile; other points stay safe.</li><li>Earn 1,200 points to win the day. No timer and no need to finish everything.</li></ol><p class="result-description">Capitalization, accents, punctuation, and listed common aliases are accepted. You can save an unfinished tile and come back.</p><p class="prototype-note">One fixed playtest board. A daily content schedule is not connected yet.</p><div class="dialog-actions"><button class="primary-button" data-action="back">Let’s play</button></div>');}
async function copyText(text){try{await navigator.clipboard.writeText(text);toast('Copied. Ready to share.');}catch{const target=$('#copy-fallback');if(target){target.innerHTML=`<textarea class="share-fallback" aria-label="Text to copy" readonly>${esc(text)}</textarea>`;target.querySelector('textarea').select();}}}
function showFeedback(){activeId=null;showDialog('<p class="eyebrow">HELP SHAPE THE NEXT BOARD</p><h2 class="question-title" id="dialog-title">How did it feel?</h2><form id="feedback-form"><label class="feedback-label" for="favorite">Favorite format</label><select id="favorite" name="favorite"><option>Fill the blanks</option><option>Match pairs</option><option>Name the set</option></select><label class="feedback-label" for="difficulty">The 3-of-4 tiles felt…</label><select id="difficulty" name="difficulty"><option>About right</option><option>Too long</option><option>Too hard</option><option>Too easy</option><option>I haven’t tried one yet</option></select><label class="feedback-label" for="notes">Anything to change?</label><textarea id="notes" name="notes" rows="3" maxlength="1000" placeholder="An answer we should accept? A category you want?"></textarea><div class="dialog-actions"><button class="primary-button">Copy feedback</button></div></form><p class="prototype-note">Nothing is sent automatically. Copy and send it to the person who shared this game.</p><div id="copy-fallback"></div>');}
const families=[
  ['Music','Bands, albums, instruments, and the stories behind the sound.',['Band Together','Album Match','Sound Makers','Soundtrack Connections','Decade Drop']],
  ['Movies & TV','Characters, creators, locations, and worlds from the screen.',['Animation Station','On Location','Character Roll Call','From Page to Screen','First in Film']],
  ['World & Geography','Countries, capitals, borders, and remarkable places.',['Passport Stamps','Capital Ideas','Border Check','Island Hopping','Rivers & Ranges']],
  ['Science & Nature','Living things, outer space, and the science hiding in everyday life.',['Creature Features','Space Oddities','Everyday Science','Element ID','Plant Life']],
  ['Words & Language','Double meanings, borrowed words, and satisfying little connections.',['Word Twins','Borrowed Words','Letter Swap','Phrase Finder','Hidden Connection']],
  ['Food & Everyday Life','What we eat, the tools we use, and the things we do for fun.',['On the Menu','Ingredient Detective','Kitchen Kit','Things We Use','Hobbies at Home']],
  ['History & Culture','Past civilizations, creative achievements, myths, and milestones.',['Ancient Worlds','Firsts & Inventions','Art Clues','Turning Points','Myth & Legend']],
  ['Sports & Games','Playing fields, tabletop favorites, and worlds you can play in.',['Name the Sport','Rules of Play','Olympic Events','Tabletop Shelf','Video Game Worlds']]
];
function renderLibrary() {
  $('#category-library').innerHTML='<div class="rotation-note"><strong>Four themes. A different mix each day.</strong>Our proposed rotation pairs world trivia with entertainment, a knowledge or everyday-life theme, and a wildcard. Music and movies both get regular turns.</div>'+families.map(([name,about,themes],i)=>`<article class="library-card"><div><span class="eyebrow">${String(i+1).padStart(2,'0')}</span><h2>${name}</h2></div><div><p>${about}</p><div class="theme-tags">${themes.map(t=>`<span class="theme-tag">${t}</span>`).join('')}</div></div></article>`).join('')+'<p class="prototype-note">These are proposed theme families. This playtest includes two fill-in columns, a matching column, and a name-the-set column.</p>';
}
$('#board').addEventListener('click',e=>{const tile=e.target.closest('[data-question]');if(tile)startQuestion(tile.dataset.question);});
$('#dialog-body').addEventListener('input',e=>{const form=e.target.closest('[data-blank]');if(form){drafts[activeId]??={};drafts[activeId][form.dataset.blank]=e.target.value;}});
$('#dialog-body').addEventListener('submit',async e=>{
 e.preventDefault();const form=e.target;
 if(form.matches('[data-blank]')){const i=Number(form.dataset.blank);applyAttempt(answerBlank(active(),answers[activeId],i,new FormData(form).get('answer')),i);}
 else if(form.id==='set-form')applyAttempt(answerSet(active(),answers[activeId],new FormData(form).get('answer')));
 else if(form.id==='feedback-form'){const f=new FormData(form);await copyText(`Daily Board beta feedback\nFavorite: ${f.get('favorite')}\n3-of-4 tiles: ${f.get('difficulty')}\nNotes: ${f.get('notes')}\n\n${resultText(board(),answers)}`);}
});
$('#dialog-body').addEventListener('click',async e=>{
 const left=e.target.closest('[data-left]'),right=e.target.closest('[data-right]');
 if(left&&!left.disabled){selectedLeft=Number(left.dataset.left);renderQuestion('Now choose its country.');return;}
 if(right&&!right.disabled){if(selectedLeft===null){renderQuestion('Pick a place first.');return;}const i=selectedLeft;selectedLeft=null;applyAttempt(answerMatch(active(),answers[activeId],i,Number(right.dataset.right)));return;}
 const action=e.target.closest('[data-action]')?.dataset.action;if(!action)return;
 if(action==='back')closeDialog();
 if(action==='rules')showCategoryRules();
 if(action==='start-tile'){const c=categoryFor(active());seenCategories[c.id]=true;try{localStorage.setItem(key()+':rules',JSON.stringify(seenCategories));}catch{}renderQuestion();dialog.scrollTop=0;}
 if(action==='copy-results')await copyText(resultText(board(),answers)+'\n'+location.href.split(/[?#]/)[0]);
 if(action==='give-up'){answers[activeId]={...status(active(),answers[activeId]),gaveUp:true};save();renderBoard();renderQuestion();}
 if(action==='reveal'){answers[activeId]=reveal(active(),answers[activeId]);save();renderBoard();renderQuestion();}
 if(action==='confirm-restart'){answers={};seenCategories={};drafts={};save();try{localStorage.removeItem(key()+':rules');}catch{}renderBoard();closeDialog();toast('A fresh board. Try another path.');}
});
$('#close-dialog').addEventListener('click',closeDialog);
dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog();});
$('#help-button').addEventListener('click',showHelp);
$('#results-button').addEventListener('click',showResults);
$('#feedback-button').addEventListener('click',showFeedback);
$('#play-tab').addEventListener('click',()=>setView('play'));
$('#categories-tab').addEventListener('click',()=>setView('categories'));
$('#restart-button').addEventListener('click',()=>{activeId=null;showDialog('<p class="eyebrow">TRY ANOTHER PATH</p><h2 class="question-title" id="dialog-title">Restart this board?</h2><p class="result-description">This clears your saved answers and score for this beta board.</p><div class="dialog-actions"><button class="primary-button" data-action="confirm-restart">Restart board</button><button class="secondary-button" data-action="back">Keep playing</button></div>');});
async function init(){try{const response=await fetch('./boards.json');if(!response.ok)throw new Error('Question bank unavailable.');const data=await response.json();if(!Array.isArray(data.boards)||!data.boards.length)throw new Error('Empty bank.');boards=data.boards;load();renderBoard();renderLibrary();}catch{$('#board').innerHTML='<div class="load-error"><h2>The board couldn’t load.</h2><p>Refresh to try again.</p></div>';for(const id of ['#results-button','#restart-button','#help-button','#feedback-button'])$(id).disabled=true;}}
init();
