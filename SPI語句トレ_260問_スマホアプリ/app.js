/* SPI 語句トレ - 外部通信なし、学習記録は端末内のみ */
(() => {
  'use strict';
  const QUESTIONS = window.SPI_QUESTIONS || [];
  const STORAGE_KEY = 'spi-goi-training-progress-v1';
  const CONFIG_KEY = 'spi-goi-training-config-v1';
  const $ = id => document.getElementById(id);
  const focusParts = [
    '味','足','腕','手','顔','口','腹','身','空','時','め','もの','あいだ','通り','通る','通じる','ばかり','おさめる','落ちる','かかる','きく','きた','たつ',
    'つとめる','つまる','出る','とる','とれる','流れる','のぞむ','のばす','入る','はかる','走る','はらう','控える','あける','はる','見る','もつ','危ない','よい','が','なり','まい','あげる','ように','だ','で','幅'
  ];
  function safeParse(key, fallback) {
    try { const value = JSON.parse(localStorage.getItem(key)); return value && typeof value === 'object' ? value : fallback; }
    catch { return fallback; }
  }
  let progress = safeParse(STORAGE_KEY, {});
  const config = safeParse(CONFIG_KEY, {});
  const state = {
    view: 'study', category: ['all','vocab','multiple'].includes(config.category) ? config.category : 'all',
    scope: ['all','new','wrong'].includes(config.scope) ? config.scope : 'all',
    shuffle: config.shuffle !== false, listFilter: 'all',
    queue: [], index: 0, revealed: false, sessionCorrect: 0, sessionAgain: 0
  };
  function saveProgress() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch {} }
  function saveConfig() {
    try { localStorage.setItem(CONFIG_KEY, JSON.stringify({ category: state.category, scope: state.scope, shuffle: state.shuffle })); } catch {}
  }
  function getStatus(q) {
    const entry = progress[q.id];
    return entry && (entry.last === 'good' || entry.last === 'wrong') ? entry.last : 'new';
  }
  function matches(q) {
    if (state.category !== 'all' && q.kind !== state.category) return false;
    const status = getStatus(q);
    if (state.scope === 'new' && status !== 'new') return false;
    if (state.scope === 'wrong' && status !== 'wrong') return false;
    return true;
  }
  function shuffled(items) {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  function initQueue(firstId) {
    const eligible = QUESTIONS.filter(matches);
    state.queue = state.shuffle ? shuffled(eligible) : eligible;
    if (firstId) {
      const pos = state.queue.findIndex(q => q.id === firstId);
      if (pos >= 0) state.queue.unshift(...state.queue.splice(pos, 1));
    }
    state.index = 0;
    state.revealed = false;
    state.sessionCorrect = 0;
    state.sessionAgain = 0;
    renderCard();
  }
  function renderStats() {
    const good = QUESTIONS.filter(q => getStatus(q) === 'good').length;
    const wrong = QUESTIONS.filter(q => getStatus(q) === 'wrong').length;
    const left = QUESTIONS.length - good - wrong;
    const learned = QUESTIONS.length - left;
    $('goodCount').textContent = good;
    $('badCount').textContent = wrong;
    $('newCount').textContent = left;
    const percent = QUESTIONS.length ? Math.round((learned / QUESTIONS.length) * 100) : 0;
    $('progressPercent').textContent = percent + '%';
    $('progressFill').style.width = percent + '%';
  }
  function addHighlightedText(element, sentence, part) {
    element.replaceChildren();
    const at = sentence.indexOf(part);
    if (at < 0 || !part) { element.textContent = sentence; return; }
    element.append(document.createTextNode(sentence.slice(0, at)));
    const mark = document.createElement('u');
    mark.className = 'underlined-word';
    mark.textContent = part;
    element.append(mark, document.createTextNode(sentence.slice(at + part.length)));
  }
  function renderCard() {
    const q = state.queue[state.index];
    const available = Boolean(q);
    $('studyArea').hidden = !available;
    $('emptyCard').hidden = available;
    renderStats();
    if (!q) {
      const none = state.queue.length === 0;
      $('emptyTitle').textContent = none ? '該当する問題がありません' : 'このセットは終了！';
      $('emptyMessage').textContent = none
        ? (state.scope === 'wrong' ? '「要復習」の問題はまだありません。間違えた問題はここに集まります。' : state.scope === 'new' ? 'この範囲はすべて学習済みです。' : '出題範囲を変更してください。')
        : `今回の学習：覚えた ${state.sessionCorrect} 問 ／ もう一度 ${state.sessionAgain} 問。お疲れさまでした！`;
      $('restartBtn').textContent = none ? 'すべての問題を学習する' : 'もう一周する';
      return;
    }
    const vocab = q.kind === 'vocab';
    $('quizKind').textContent = vocab ? '頻出語句' : '複数の意味';
    $('quizKind').classList.toggle('multiple', !vocab);
    $('quizPosition').textContent = `${state.index + 1} / ${state.queue.length}`;
    $('questionLabel').textContent = vocab ? '次の意味にあてはまる語句は？' : '下線部分と同じ意味の別の用例は？';
    if (vocab) $('questionText').textContent = q.meaning;
    else addHighlightedText($('questionText'), `「${q.question}」`, focusParts[Number(q.id.slice(1)) - 1]);
    $('hintText').textContent = vocab ? '語句を頭の中で答えよう' : '別の使い方の例を考えよう';
    $('pageNote').textContent = `出典の掲載ページ：${q.page} ページ`;
    $('answerSection').hidden = true;
    $('revealBtn').hidden = false;
    $('gradeActions').hidden = true;
    $('sessionStatus').textContent = '答えを確認して、自分で判定しよう';
    state.revealed = false;
  }
  function revealAnswer() {
    const q = state.queue[state.index];
    if (!q || state.revealed) return;
    state.revealed = true;
    $('answerSection').hidden = false;
    $('answerEyebrow').textContent = q.kind === 'vocab' ? '正解' : '解答例';
    $('revealBtn').hidden = true;
    $('gradeActions').hidden = false;
    if (q.kind === 'vocab') {
      $('answerWord').textContent = q.word;
      $('answerExtra').textContent = `意味：${q.meaning}`;
    } else {
      addHighlightedText($('answerWord'), q.answer, focusParts[Number(q.id.slice(1)) - 1]);
      $('answerExtra').textContent = `共通する意味：${q.meaning}`;
    }
    $('sessionStatus').textContent = '正しく答えられた？';
  }
  function grade(result) {
    const q = state.queue[state.index];
    if (!q || !state.revealed) return;
    const p = progress[q.id] || {good: 0, wrong: 0, attempts: 0};
    p.attempts = (p.attempts || 0) + 1;
    p[result] = (p[result] || 0) + 1;
    p.last = result;
    p.time = Date.now();
    progress[q.id] = p;
    saveProgress();
    if (result === 'good') state.sessionCorrect++;
    else state.sessionAgain++;
    state.index++;
    renderCard();
  }
  function showView(view) {
    state.view = view;
    const map = {study:'studyView', list:'listView', settings:'settingsView'};
    for (const [name, id] of Object.entries(map)) $(id).hidden = name !== view;
    document.querySelectorAll('.nav-button').forEach(el => {
      const selected = el.dataset.view === view;
      el.classList.toggle('selected', selected);
      if (selected) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });
    if (view === 'list') renderList();
    if (view === 'study') renderCard();
    window.scrollTo({top:0,behavior:'auto'});
  }
  function renderList() {
    const val = $('searchInput').value.trim().toLowerCase();
    const entries = QUESTIONS.filter(q => {
      if (state.listFilter === 'wrong') { if (getStatus(q) !== 'wrong') return false; }
      else if (state.listFilter !== 'all' && q.kind !== state.listFilter) return false;
      const terms = q.kind === 'vocab' ? `${q.word} ${q.meaning}` : `${q.question} ${q.answer} ${q.meaning}`;
      return terms.toLowerCase().includes(val);
    });
    $('listCount').textContent = `${entries.length} 件の問題`;
    const list = $('questionList');
    const frag = document.createDocumentFragment();
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className='list-empty'; empty.textContent='一致する問題はありません。'; frag.append(empty);
    }
    entries.forEach(q => {
      const status = getStatus(q);
      const item = document.createElement('button');
      item.type = 'button'; item.className = 'list-item';
      const main = document.createElement('span'); main.className='list-item-main';
      const title = document.createElement('div'); title.className='list-item-title';
      title.textContent = q.kind === 'vocab' ? q.word : q.question;
      const sub = document.createElement('div'); sub.className='list-item-sub';
      sub.textContent = `${q.page}ページ · ${q.kind === 'vocab' ? q.meaning : `同じ意味：${q.answer}`}`;
      main.append(title,sub);
      const badge = document.createElement('span'); badge.className=`list-item-status ${status}`;
      badge.textContent = status === 'good' ? '覚えた' : status === 'wrong' ? '要復習' : '未学習';
      item.append(main,badge);
      item.addEventListener('click', () => {
        state.category = q.kind;
        state.scope = 'all';
        $('categorySelect').value=state.category;
        $('scopeSelect').value='all';
        saveConfig();
        initQueue(q.id);
        showView('study');
      });
      frag.append(item);
    });
    list.replaceChildren(frag);
  }
  document.querySelectorAll('.nav-button').forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));
  $('categorySelect').value = state.category;
  $('scopeSelect').value = state.scope;
  $('shuffleToggle').checked = state.shuffle;
  $('categorySelect').addEventListener('change', e => {state.category=e.target.value;saveConfig();initQueue();});
  $('scopeSelect').addEventListener('change', e => {state.scope=e.target.value;saveConfig();initQueue();});
  $('shuffleToggle').addEventListener('change', e => {state.shuffle=e.target.checked;saveConfig();initQueue();});
  $('revealBtn').addEventListener('click',revealAnswer);
  $('correctBtn').addEventListener('click',()=>grade('good'));
  $('againBtn').addEventListener('click',()=>grade('wrong'));
  $('restartBtn').addEventListener('click',()=>{
    if (state.queue.length === 0) {state.scope='all';$('scopeSelect').value='all';saveConfig();}
    initQueue();
  });
  document.querySelectorAll('[data-listfilter]').forEach(btn => btn.addEventListener('click',()=>{
    state.listFilter=btn.dataset.listfilter;
    document.querySelectorAll('[data-listfilter]').forEach(b=>b.classList.toggle('active',b===btn));
    renderList();
  }));
  $('searchInput').addEventListener('input',renderList);
  $('resetBtn').addEventListener('click',()=>{
    if (!confirm('すべての学習記録を削除します。元に戻せません。よろしいですか？')) return;
    progress={};saveProgress();initQueue();renderList();
    showView('study');
  });
  document.addEventListener('keydown',e=>{
    if (state.view!=='study' || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))return;
    if(e.code==='Space' && !e.repeat){e.preventDefault();if(!state.revealed)revealAnswer();}
    if(state.revealed && (e.key==='1'||e.key==='2')){e.preventDefault();grade(e.key==='1'?'good':'wrong');}
  });
  if ('serviceWorker' in navigator && (location.protocol==='https:' || location.hostname==='localhost')) {
    window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }
  initQueue();
})();
