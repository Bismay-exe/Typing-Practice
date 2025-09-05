/* FULL upgraded client script
   - Practice Modes (zen/speed/accuracy)
   - Sound Themes (typewriter, mechanical, silent)
   - Quote Mode + Code Mode + Word/Sentence
   - Achievements & badges
   - Custom lessons modal
   - Visual confetti / shake
   - Leaderboard + WPM chart
   - Ghost replay, daily, timed, WPM goal, progress
   - Bottom keyboard (in-page)
*/

// ==== DOM elements ====
const textDisplay = document.getElementById('textDisplay');
const ghostOverlay = document.getElementById('ghostOverlay');
const textInput = document.getElementById('textInput');
const accuracyEl = document.getElementById('accuracy');
const wpmEl = document.getElementById('wpm');
const streakEl = document.getElementById('streak');
const timerEl = document.getElementById('timer');
const goalInput = document.getElementById('goalInput');
const saveGoalBtn = document.getElementById('saveGoalBtn');
const goalLabel = document.getElementById('goalLabel');
const goalBar = document.getElementById('goalBar');
const progressBar = document.getElementById('progressBar');

const modeSelect = document.getElementById('mode');
const practiceModeSelect = document.getElementById('practiceMode');
const difficultySelect = document.getElementById('difficulty');
const timeModeSelect = document.getElementById('timeMode');
const soundThemeSelect = document.getElementById('soundTheme');

const reloadBtn = document.getElementById('reloadBtn');
const challengeBtn = document.getElementById('challengeBtn');
const dailyBtn = document.getElementById('dailyBtn');
const ghostBtn = document.getElementById('ghostBtn');
const customBtn = document.getElementById('customBtn');
const scoreBtn = document.getElementById('scoreBtn');

const keyboardEl = document.getElementById('keyboard');

// Modals
const customModal = document.getElementById('customModal');
const customText = document.getElementById('customText');
const useCustom = document.getElementById('useCustom');

const leaderboardModal = document.getElementById('leaderboardModal');
const leaderboardList = document.getElementById('leaderboardList');
const achievementsGrid = document.getElementById('achievementsGrid');
const wpmChartCanvas = document.getElementById('wpmChart');

// confetti container
const confettiRoot = document.getElementById('confetti');

// ==== State ====
let currentText = '';
let startTime = null;
let playerName = '';
let streak = 0;
let bestStreak = parseInt(localStorage.getItem('bestStreak') || '0', 10);
let totalWordsTyped = parseInt(localStorage.getItem('totalWords') || '0', 10);
let wpmHistory = JSON.parse(localStorage.getItem('wpmHistory') || '[]');
let ghostTrace = null;
let timerInterval = null;
let practiceMode = 'normal'; // zen, speed, accuracy
let accuracyMistakes = 0;
let speedModeDuration = 10; // seconds for speed
let achievements = JSON.parse(localStorage.getItem('typingAchievements') || '{}');
if (!achievements) achievements = {};

// ==== Sounds (base64 tiny) ====
const sounds = {
  typewriter: {
    key: new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='),
    error: new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=')
  },
  mechanical: {
    key: new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='),
    error: new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=')
  },
  silent: {
    key: { play: ()=>{} },
    error: { play: ()=>{} }
  }
};
let currentSoundTheme = 'typewriter';

// ==== Word bank & snippets & quotes ====
const wordBank = ["the","quick","brown","fox","jumps","over","lazy","dog","typing","games","help","improve","speed","accuracy","practice","perfect","keyboard","focus","code","developer","challenge","skill","train","fast","hands","mind","react","javascript","smooth","smart","level","random","ghost","daily","timer","heatmap","mobile"];

const codeSnippets = [
`function greet(name) {
  console.log("Hello, " + name);
}`,
`for (let i = 0; i < 10; i++) {
  console.log(i);
}`,
`def add(a, b):
    return a + b`,
`if __name__ == "__main__":
    print("Python ready!")`,
`#include <iostream>
using namespace std;
int main() {
  cout << "C++ typing test!";
  return 0;
}`
];

const quotes = [
  "The only way to do great work is to love what you do. — Steve Jobs",
  "Code is like humor. When you have to explain it, it’s bad. — Cory House",
  "First, solve the problem. Then, write the code. — John Johnson",
  "Simplicity is the soul of efficiency. — Austin Freeman"
];

// ==== Utilities ====
function saveState() {
  localStorage.setItem('wpmHistory', JSON.stringify(wpmHistory));
  localStorage.setItem('bestStreak', String(bestStreak));
  localStorage.setItem('totalWords', String(totalWordsTyped));
  localStorage.setItem('typingAchievements', JSON.stringify(achievements));
}
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])); }
function formatTime(s){ return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }

// ==== Name & initial load ====
function askName() {
  playerName = localStorage.getItem('typingPlayer') || '';
  if (!playerName) {
    playerName = prompt('Enter your name:') || 'Guest';
    localStorage.setItem('typingPlayer', playerName);
  }
}
askName();

// load WPM goal
const storedGoal = localStorage.getItem('typingGoal');
if (storedGoal) { goalInput.value = storedGoal; goalLabel.textContent = storedGoal; }

// ==== Generate text based on mode ====
function generateText() {
  const mode = modeSelect.value; // sentence, word, code, quote
  if (mode === 'code') {
    return codeSnippets[Math.floor(Math.random()*codeSnippets.length)];
  }
  if (mode === 'quote') {
    return quotes[Math.floor(Math.random()*quotes.length)];
  }
  if (mode === 'word') {
    return wordBank[Math.floor(Math.random()*wordBank.length)];
  }
  // sentence
  const diff = difficultySelect.value;
  const counts = { easy:5, medium:10, hard:18 };
  const n = counts[diff] || 10;
  const arr = [];
  for (let i=0;i<n;i++) arr.push(wordBank[Math.floor(Math.random()*wordBank.length)]);
  arr[0] = arr[0][0].toUpperCase() + arr[0].slice(1);
  return arr.join(' ') + '.';
}

// ==== Load text (with cursor) ====
function renderWithCursor(text, pos = 0) {
  if (!text) return '';
  let res = '';
  for (let i=0;i<text.length;i++) {
    const ch = escapeHtml(text[i]);
    if (i < pos) res += `<span class="correct">${ch}</span>`;
    else if (i === pos && pos < text.length) res += `<span class="pending cursor">${ch}</span>`;
    else res += `<span class="pending">${ch}</span>`;
  }
  return res;
}

function loadText({daily=false, custom=false}={}) {
  practiceMode = practiceModeSelect.value;
  accuracyMistakes = 0;
  if (custom && customLessonText) {
    currentText = customLessonText;
  } else if (daily) {
    const seed = new Date().toISOString().slice(0,10);
    // deterministic pseudo-random: pick based on seed hash
    const h = Math.abs(Array.from(seed).reduce((a,c)=>a*31 + c.charCodeAt(0), 0));
    const idx = h % 3;
    currentText = generateText();
    // simple variation: rotate code/quote/regular
    if (idx === 0) currentText = generateText();
    if (idx === 1) currentText = codeSnippets[h % codeSnippets.length];
    if (idx === 2) currentText = quotes[h % quotes.length];
  } else {
    currentText = generateText();
  }

  // UI resets
  textDisplay.classList.toggle('code-mode', modeSelect.value === 'code');
  textDisplay.innerHTML = renderWithCursor(currentText, 0);
  ghostOverlay.textContent = '';
  ghostOverlay.style.display = 'none';
  textInput.value = '';
  progressBar.style.width = '0%';
  accuracyEl.textContent = '0%';
  wpmEl.textContent = '0';
  streakEl.textContent = '0';
  startTime = null;
  ghostTrace = [];
  stopTimer();
  timerEl.textContent = (timeModeSelect.value === 'off' ? '—' : formatTime(parseInt(timeModeSelect.value)));
  updateModeInfo();
}

// ==== Timer functions ====
function startTimer(seconds) {
  stopTimer();
  let left = seconds;
  timerEl.textContent = formatTime(left);
  timerInterval = setInterval(()=>{
    left--; timerEl.textContent = formatTime(left);
    if (left <= 0) {
      completeRun(true); // forced finish
    }
  }, 1000);
}
function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }

// ==== Sound helpers ====
function playKeySound() {
  if (soundThemeSelect.value === 'silent') return;
  const s = sounds[soundThemeSelect.value] || sounds.typewriter;
  try { s.key.currentTime = 0; s.key.play(); } catch(e){}
}
function playErrorSound() {
  if (soundThemeSelect.value === 'silent') return;
  const s = sounds[soundThemeSelect.value] || sounds.typewriter;
  try { s.error.currentTime = 0; s.error.play(); } catch(e){}
}

// ==== Typing handler ====
let customLessonText = null;
textInput.addEventListener('input', (e) => {
  if (!startTime) {
    startTime = new Date();
    ghostTrace = [];
    // start timer if Time Mode active
    if (timeModeSelect.value !== 'off') startTimer(parseInt(timeModeSelect.value));
    // practice mode triggers
    if (practiceModeSelect.value === 'speed') {
      startTimer(speedModeDuration);
    }
  }

  const typed = textInput.value;
  ghostTrace.push({ t: Date.now() - startTime, len: typed.length });

  // build display & count correct
  let correct = 0;
  let pos = typed.length;
  let html = '';
  for (let i=0;i<currentText.length;i++) {
    const ch = escapeHtml(currentText[i]);
    if (i < typed.length) {
      if (typed[i] === currentText[i]) {
        html += `<span class="correct">${ch}</span>`; correct++;
      } else {
        html += `<span class="incorrect">${ch}</span>`;
        accuracyMistakes++;
        playErrorSound();
        shakeCard();
        streak = 0;
      }
    } else {
      if (i === typed.length && typed !== currentText) html += `<span class="pending cursor">${ch}</span>`;
      else html += `<span class="pending">${ch}</span>`;
    }
  }
  textDisplay.innerHTML = html;

  // accuracy
  let accuracy = ((correct / Math.max(typed.length,1))*100).toFixed(1);
  if (isNaN(accuracy)) accuracy = '0';
  accuracyEl.textContent = `${accuracy}%`;

  // WPM (words per minute based on typed words)
  const elapsedMin = Math.max((Date.now() - startTime)/1000/60, 1/600);
  const wordsTyped = typed.trim().split(/\s+/).filter(Boolean).length;
  const wpm = Math.round(wordsTyped / elapsedMin) || 0;
  wpmEl.textContent = wpm;

  // progress
  const prog = Math.min(100, (typed.length / currentText.length) * 100);
  progressBar.style.width = prog + '%';

  // streak handling (increment when last char correct)
  if (typed.length > 0 && typed[typed.length - 1] === currentText[typed.length - 1]) {
    streak++;
    streakEl.textContent = streak;
    if (streak > bestStreak) { bestStreak = streak; achievements['bestStreak'] = true; }
    playKeySound();
  }

  // practice mode: Accuracy mode ends on 3 mistakes
  if (practiceModeSelect.value === 'accuracy' && accuracyMistakes >= 3) {
    completeRun(true);
    return;
  }

  // test finishes when typed equals target
  if (typed === currentText) {
    completeRun(false);
  }
});

// ==== Complete run ====
function completeRun(forced=false) {
  // show full green
  textDisplay.innerHTML = `<span class="correct">${escapeHtml(currentText)}</span>`;
  stopTimer();

  // compute stats
  const typed = textInput.value;
  const elapsedMin = Math.max((Date.now() - startTime)/1000/60, 1/600);
  const wordsTyped = typed.trim().split(/\s+/).filter(Boolean).length;
  const wpm = Math.round(wordsTyped / elapsedMin) || 0;
  const correctChars = Array.from(typed).filter((ch,i)=>currentText[i]===ch).length;
  const accuracy = ((correctChars / Math.max(typed.length,1))*100).toFixed(1);

  // save scores
  saveScore(Number(accuracy), wpm);

  // achievements checks
  totalWordsTyped += wordsTyped;
  if (wpm >= 50) achievements['50WPM'] = true;
  if (Number(accuracy) === 100) achievements['100Accuracy'] = true;
  if (bestStreak >= 50) achievements['50Streak'] = true;
  if (totalWordsTyped >= 1000) achievements['1000Words'] = true;

  // save ghost best if it's faster than previous
  const prevGhost = JSON.parse(localStorage.getItem('typingGhost') || 'null');
  const thisTrace = ghostTrace ? ghostTrace.slice() : null;
  if (thisTrace) {
    const record = { text: currentText, trace: thisTrace, wpm };
    if (!prevGhost || wpm > (prevGhost.wpm || 0)) {
      record.wpm = wpm;
      localStorage.setItem('typingGhost', JSON.stringify(record));
    }
  }

  // push to wpm history
  wpmHistory.push(wpm);
  if (wpmHistory.length > 12) wpmHistory.shift();
  saveState();

  // confetti for success (not on forced timeouts)
  if (!forced) {
    launchConfetti();
    achievements['completedTest'] = (achievements['completedTest']||0) + 1;
    if (achievements['completedTest'] >= 5) achievements['5Tests'] = true;
  }

  // show leaderboard automatically for speed/accuracy practice modes
  setTimeout(()=>loadText(), 1200);
}

// ==== Save score & leaderboard ====
function saveScore(accuracy, wpm) {
  const scores = JSON.parse(localStorage.getItem('typingScores') || '{}');
  if (!scores[playerName]) scores[playerName] = [];
  scores[playerName].push({ accuracy, wpm, ts: Date.now() });
  scores[playerName] = scores[playerName].sort((a,b)=>b.wpm - a.wpm).slice(0,5);
  localStorage.setItem('typingScores', JSON.stringify(scores));
}

// ==== Leaderboard & Achievements UI ====
function openLeaderboard() {
  // populate top scores
  leaderboardList.innerHTML = '';
  const scores = JSON.parse(localStorage.getItem('typingScores') || '{}');
  Object.keys(scores).forEach(player=>{
    const top = scores[player][0];
    if (!top) return;
    const li = document.createElement('li');
    li.textContent = `${player}: ${top.wpm} WPM | ${top.accuracy}%`;
    leaderboardList.appendChild(li);
  });

  // achievements grid
  achievementsGrid.innerHTML = '';
  const badges = [
    { key:'50WPM', title:'50 WPM', text:'Reach 50 WPM' },
    { key:'100Accuracy', title:'Perfect 100%', text:'100% accuracy test' },
    { key:'50Streak', title:'50 Streak', text:'50 correct chars in a row' },
    { key:'1000Words', title:'Word Master', text:'Type 1000 words total' },
    { key:'5Tests', title:'5 Tests', text:'Complete 5 tests' }
  ];
  badges.forEach(b=>{
    const div = document.createElement('div');
    div.className = 'badge ' + (achievements[b.key] ? '' : 'locked');
    div.innerHTML = `<strong>${b.title}</strong><div style="font-size:12px;color:var(--muted)">${b.text}</div>`;
    achievementsGrid.appendChild(div);
  });

  // chart
  new Chart(wpmChartCanvas, {
    type: 'line',
    data: {
      labels: wpmHistory.map((_,i)=>`Run ${i+1}`),
      datasets:[{ label:'WPM', data: wpmHistory, borderColor:'#4caf50', backgroundColor:'#4caf5044', fill:true, tension:0.25 }]
    },
    options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
  });

  leaderboardModal.style.display = 'block';
}

// ==== Ghost Replay ====
ghostBtn.addEventListener('click', ()=> {
  const best = JSON.parse(localStorage.getItem('typingGhost') || 'null');
  if (!best || best.text !== currentText) {
    // no ghost for this exact text
    alert('No saved ghost for this text (best ghosts saved when you beat your previous best).');
    return;
  }
  // animate ghost overlay by timestamps
  ghostOverlay.style.display = 'block';
  ghostOverlay.textContent = '';
  const trace = best.trace;
  const chars = best.text.split('');
  let i = 0;
  const start = performance.now();
  function step(now){
    const elapsed = now - start;
    while (i < trace.length && elapsed >= trace[i].t) i++;
    ghostOverlay.textContent = chars.slice(0, i).join('');
    if (i < trace.length) requestAnimationFrame(step);
    else setTimeout(()=>ghostOverlay.style.display='none', 600);
  }
  requestAnimationFrame(step);
});

// ==== Custom lessons modal handlers ====
customBtn.addEventListener('click', ()=> openModal('customModal'));
useCustom.addEventListener('click', ()=> {
  customLessonText = customText.value.trim();
  if (!customLessonText) { alert('Paste some text first'); return; }
  closeModalById('customModal');
  loadText({ custom:true });
});

// ==== UI helpers for modals & controls ====
document.querySelectorAll('[data-close]').forEach(btn=>{
  btn.addEventListener('click', ()=> closeModalById(btn.getAttribute('data-close')));
});
document.querySelectorAll('.close').forEach(c=>{
  c.addEventListener('click', ()=> {
    const target = c.getAttribute('data-close');
    if (target) closeModalById(target);
  });
});
function openModal(id){ document.getElementById(id).style.display = 'block'; }
function closeModalById(id){ document.getElementById(id).style.display = 'none'; }

// score modal close
document.querySelector('[data-close="leaderboardModal"]').addEventListener('click', ()=> closeModalById('leaderboardModal'));

// click outside to close modals
window.addEventListener('click', (e)=> {
  if (e.target.classList && e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});

// ==== Keyboard (UI only) ====
function createKeyboard() {
  const rows = [
    "1234567890-=",
    "qwertyuiop[]",
    "asdfghjkl;'",
    "zxcvbnm,./"
  ];
  keyboardEl.innerHTML = '';
  rows.forEach(row=>{
    const r = document.createElement('div'); r.className = 'key-row';
    row.split('').forEach(ch=>{
      const k = document.createElement('div'); k.className='key'; k.textContent = ch; k.dataset.key = ch;
      r.appendChild(k);
    });
    keyboardEl.appendChild(r);
  });
  const spaceRow = document.createElement('div'); spaceRow.className='key-row';
  const sp = document.createElement('div'); sp.className='key wide'; sp.textContent='Space'; sp.dataset.key=' ';
  spaceRow.appendChild(sp); keyboardEl.appendChild(spaceRow);
}
createKeyboard();

document.addEventListener('keydown', (e)=>{
  const key = document.querySelector(`.key[data-key="${e.key}"]`);
  if (key) { key.classList.add('active'); setTimeout(()=>key.classList.remove('active'), 120); }
});
document.addEventListener('keyup', (e)=>{
  const key = document.querySelector(`.key[data-key="${e.key}"]`);
  if (key) key.classList.remove('active');
});

// ==== Confetti & animations ====
function launchConfetti() {
  // small lightweight confetti (DOM-based)
  for (let i=0;i<30;i++){
    const el = document.createElement('div');
    el.className = 'confetti-p';
    el.style.position = 'absolute';
    el.style.left = Math.random()*100 + '%';
    el.style.top = '-10%';
    el.style.width = '8px'; el.style.height = '12px';
    el.style.background = `hsl(${Math.random()*360} 80% 60%)`;
    el.style.opacity = 0.95;
    el.style.transform = `rotate(${Math.random()*360}deg)`;
    el.style.borderRadius = '2px';
    el.style.pointerEvents = 'none';
    el.style.zIndex = 999;
    confettiRoot.appendChild(el);
    const fall = el.animate([
      { transform: `translateY(0) rotate(${Math.random()*360}deg)`, opacity:1 },
      { transform: `translateY(120vh) rotate(${Math.random()*720}deg)`, opacity:0.3 }
    ], { duration: 1200 + Math.random()*800, easing: 'cubic-bezier(.2,.7,.4,1)'});
    fall.onfinish = ()=> el.remove();
  }
}

// shake card on mistake
function shakeCard() {
  const c = document.getElementById('typingCard');
  c.animate([{ transform: 'translateX(0)'},{ transform: 'translateX(-6px)'},{ transform: 'translateX(6px)'},{ transform: 'translateX(0)'}], { duration: 220 });
}

// ==== Goals and settings ====
saveGoalBtn.addEventListener('click', ()=>{
  const g = parseInt(goalInput.value, 10);
  if (g && g > 0) {
    localStorage.setItem('typingGoal', g);
    goalLabel.textContent = g;
  }
});

// change sound theme
soundThemeSelect.addEventListener('change', ()=> {
  currentSoundTheme = soundThemeSelect.value;
});

// ==== Buttons ====
reloadBtn.addEventListener('click', ()=> loadText());
challengeBtn.addEventListener('click', ()=> {
  const modes = ['word','sentence','code','quote'];
  const diffs = ['easy','medium','hard'];
  modeSelect.value = modes[Math.floor(Math.random()*modes.length)];
  difficultySelect.value = diffs[Math.floor(Math.random()*diffs.length)];
  loadText();
});
dailyBtn.addEventListener('click', ()=> loadText({ daily:true }));
scoreBtn.addEventListener('click', ()=> openLeaderboard());
ghostBtn.addEventListener('click', ()=> {
  const best = JSON.parse(localStorage.getItem('typingGhost') || 'null');
  if (!best || best.text !== currentText) { alert('No ghost available for this text'); return; }
  // show ghost overlay simple
  ghostOverlay.style.display = 'block'; ghostOverlay.textContent = '';
  const trace = best.trace;
  const chars = best.text.split('');
  let i=0; const start = performance.now();
  (function step(now){
    const elapsed = now - start;
    while (i<trace.length && elapsed >= trace[i].t) i++;
    ghostOverlay.textContent = chars.slice(0,i).join('');
    if (i < trace.length) requestAnimationFrame(step);
    else setTimeout(()=>ghostOverlay.style.display='none', 600);
  })(performance.now());
});

// open custom
document.getElementById('customModal').querySelectorAll('[data-close]').forEach(btn=>{
  btn.addEventListener('click', ()=> closeModalById(btn.getAttribute('data-close')));
});
document.querySelectorAll('[data-close]').forEach(btn=>{
  btn.addEventListener('click', ()=> closeModalById(btn.getAttribute('data-close')));
});
document.querySelectorAll('.close').forEach(c=> {
  c.addEventListener('click', () => { const id = c.getAttribute('data-close') || 'leaderboardModal'; closeModalById(id); });
});

// custom open / use handlers
customBtn.addEventListener('click', ()=> openModal('customModal'));
function openModal(id){ document.getElementById(id).style.display = 'block'; }
function closeModalById(id){ document.getElementById(id).style.display = 'none'; }

useCustom.addEventListener('click', ()=> {
  customLessonText = customText.value.trim();
  if (!customLessonText) { alert('Please paste some text first'); return; }
  closeModalById('customModal');
  loadText({ custom:true });
});

// ==== initial load and helpers ====
function updateModeInfo(){
  document.getElementById('modeInfo').textContent = `Mode: ${modeSelect.value.charAt(0).toUpperCase()+modeSelect.value.slice(1)} • ${practiceModeSelect.value.charAt(0).toUpperCase()+practiceModeSelect.value.slice(1)}`;
}
modeSelect.addEventListener('change', ()=> { updateModeInfo(); loadText(); });
practiceModeSelect.addEventListener('change', ()=> updateModeInfo());
difficultySelect.addEventListener('change', ()=> loadText());
timeModeSelect.addEventListener('change', ()=> {
  if (timeModeSelect.value !== 'off') { timerEl.textContent = formatTime(parseInt(timeModeSelect.value)); } else { timerEl.textContent = '—'; }
});
window.addEventListener('load', ()=> {
  updateModeInfo();
  loadText();
  renderAchievementsUI();
  // close modal on ESC
  window.addEventListener('keydown', (e)=> { if (e.key === 'Escape') { document.querySelectorAll('.modal').forEach(m=>m.style.display='none'); } });
});

// achievements UI
function renderAchievementsUI(){
  // populate grid (static badges)
  const badges = [
    { key:'50WPM', title:'50 WPM', txt:'Reach 50 WPM' },
    { key:'100Accuracy', title:'100% Accuracy', txt:'Finish test with 100% accuracy' },
    { key:'50Streak', title:'50 Streak', txt:'50 correct chars in a row' },
    { key:'1000Words', title:'1000 Words', txt:'Type 1000 words total' },
    { key:'5Tests', title:'5 Tests', txt:'Complete 5 tests' }
  ];
  achievementsGrid.innerHTML = '';
  badges.forEach(b=>{
    const div = document.createElement('div'); div.className = 'badge ' + (achievements[b.key] ? '' : 'locked');
    div.innerHTML = `<strong>${b.title}</strong><div style="font-size:12px;color:var(--muted)">${b.txt}</div>`;
    achievementsGrid.appendChild(div);
  });
}

// saving state
function saveState(){
  localStorage.setItem('typingAchievements', JSON.stringify(achievements));
  localStorage.setItem('wpmHistory', JSON.stringify(wpmHistory));
  localStorage.setItem('bestStreak', bestStreak);
  localStorage.setItem('totalWords', totalWordsTyped);
}
window.addEventListener('beforeunload', saveState);

// ==== small helpers and start ====
loadText();

// Code editor-like behavior in Code Mode
textInput.addEventListener("keydown", (e) => {
  if (modeSelect.value !== "code") return;

  const start = textInput.selectionStart;
  const end = textInput.selectionEnd;
  const value = textInput.value;

  // Handle Tab
  if (e.key === "Tab") {
    e.preventDefault();
    const tabSpaces = "  "; // 2 spaces (change to "    " for 4 spaces)

    if (e.shiftKey) {
      // Shift+Tab -> outdent
      const before = value.substring(0, start);
      const after = value.substring(end);
      const lineStart = before.lastIndexOf("\n") + 1;
      if (before.substring(lineStart, lineStart + tabSpaces.length) === tabSpaces) {
        textInput.value =
          before.substring(0, lineStart) +
          before.substring(lineStart + tabSpaces.length) +
          after;
        textInput.selectionStart = textInput.selectionEnd =
          start - tabSpaces.length;
      }
    } else {
      // Insert tab spaces
      textInput.value = value.substring(0, start) + tabSpaces + value.substring(end);
      textInput.selectionStart = textInput.selectionEnd = start + tabSpaces.length;
    }
    textInput.dispatchEvent(new Event("input"));
  }

  // Handle Enter
 if (e.key === "Enter") {
   e.preventDefault();
   const before = value.substring(0, start);
   const after = value.substring(end);

   // Find start of current line
   const lineStart = before.lastIndexOf("\n") + 1;
   const currentLine = before.substring(lineStart);

   // Match leading whitespace (indentation)
   const indentMatch = currentLine.match(/^\s+/);
   const indent = indentMatch ? indentMatch[0] : "";

   // Insert newline + same indentation
   textInput.value = before + "\n" + indent + after;

   // Place cursor after the newline + indentation
   textInput.selectionStart = textInput.selectionEnd = start + 1 + indent.length;

   textInput.dispatchEvent(new Event("input"));
 }

});

// ==== Bounce effect for all buttons ====
document.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.remove('bounce'); // reset if already bouncing
    void btn.offsetWidth; // reflow to restart animation
    btn.classList.add('bounce');
  });
});

