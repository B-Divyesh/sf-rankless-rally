import './styles.css';
import {
  boardById,
  dailyBoard,
  decodeReplay,
  defaultSettings,
  directionFromKey,
  encodeReplay,
  makeRun,
  practiceBoards,
  rallyCard,
  replayPositions,
  routeMove,
  type Board,
  type Direction,
  type RallyCard,
  type Run,
  type Settings
} from './game';

type Bests = Record<string, RallyCard>;
type Replay = { boardId: string; route: Direction[]; code: string };

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('The game could not start because its page container is missing.');

const storageRoot = 'rankless-rally';
let isDemo = false;
let settings: Settings = { ...defaultSettings };
let bests: Bests = {};
let board: Board = dailyBoard();
let run: Run = makeRun(board, settings);
let replay: Replay | null = null;
let ghostIndex = 0;
let ghostTimer: number | null = null;
let settingsOpen = false;
let pauseOpen = false;
let endConfirmation = false;
let pendingBoardId: string | null = null;
let demoNotice = '';
let simulationTicks = 0;
let ticksInSample = 0;
let sampleStarted = performance.now();
let lastFrame = performance.now();
let accumulated = 0;
let audioContext: AudioContext | null = null;

const storePrefix = (): string => `${isDemo ? 'demo:' : ''}${storageRoot}`;
const storeKey = (name: string): string => `${storePrefix()}:${name}`;

const readStore = <T>(name: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(storeKey(name));
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeStore = (name: string, value: unknown): void => {
  try {
    localStorage.setItem(storeKey(name), JSON.stringify(value));
  } catch {
    // The game remains playable if a browser blocks local storage.
  }
};

const clearDemoStore = (): void => {
  ['settings', 'bests', 'run'].forEach((name) => localStorage.removeItem(`demo:${storageRoot}:${name}`));
};

const escapeHtml = (value: string): string => value.replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
})[character] ?? character);

const formatTime = (seconds: number): string => {
  const whole = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

const currentPath = (): string => location.pathname.replace(/\/+$/, '') || '/';
const pageName = (): 'game' | 'privacy' | 'terms' | 'not-found' => {
  const path = currentPath();
  if (path === '/' || path === '/demo') return 'game';
  if (path === '/privacy') return 'privacy';
  if (path === '/terms') return 'terms';
  return 'not-found';
};

const saveSettings = (): void => writeStore('settings', settings);
const saveBests = (): void => writeStore('bests', bests);
const saveRun = (): void => writeStore('run', run);

const hasSavedRun = (candidate: unknown): candidate is Run => {
  if (!candidate || typeof candidate !== 'object') return false;
  const possible = candidate as Partial<Run>;
  return typeof possible.boardId === 'string' && typeof possible.timeRemaining === 'number' && Array.isArray(possible.route) && Boolean(boardById(possible.boardId));
};

const initialiseSession = (): void => {
  isDemo = currentPath() === '/demo' || new URLSearchParams(location.search).get('demo') === '1';
  settings = { ...defaultSettings, ...readStore<Partial<Settings>>('settings', {}) };
  bests = readStore<Bests>('bests', {});
  if (isDemo && Object.keys(bests).length === 0) {
    bests = { 'practice-01': { speed: 74, elegance: 92, rescues: 2 } };
    saveBests();
  }
  const params = new URLSearchParams(location.search);
  const replayCode = params.get('replay');
  const decoded = replayCode ? decodeReplay(replayCode) : null;
  const replayBoard = decoded ? boardById(decoded.boardId) : undefined;
  if (decoded && replayBoard) {
    board = replayBoard;
    run = makeRun(board, settings);
    replay = { ...decoded, code: replayCode ?? '' };
    ghostIndex = 0;
    return;
  }
  replay = null;
  const saved = readStore<unknown>('run', null);
  if (hasSavedRun(saved)) {
    const savedBoard = boardById(saved.boardId);
    if (savedBoard) {
      board = savedBoard;
      run = { ...saved, player: { ...saved.player }, feedback: saved.status === 'playing' ? 'Run restored. Resume when ready.' : saved.feedback };
      if (run.status === 'playing') run.status = 'paused';
      return;
    }
  }
  board = isDemo ? (boardById('practice-01') ?? dailyBoard()) : dailyBoard();
  run = makeRun(board, settings);
};

const navigate = (url: string): void => {
  if (`${location.pathname}${location.search}` === url) return;
  history.pushState({}, '', url);
  stopGhost();
  settingsOpen = false;
  pauseOpen = false;
  endConfirmation = false;
  pendingBoardId = null;
  initialiseSession();
  render(true);
};

const boardSymbol = (x: number, y: number): string => {
  const marker = (item: { x: number; y: number }): boolean => item.x === x && item.y === y;
  const ghost = replay ? replayPositions(board, replay.route)[Math.min(ghostIndex, replay.route.length)] : undefined;
  if (board.walls.some(marker)) return '<span class="tile-wall" aria-hidden="true"></span>';
  let symbols = '';
  if (board.exit.x === x && board.exit.y === y) symbols += '<span class="token exit" aria-hidden="true">↗</span>';
  const relay = board.relays.find(marker);
  if (relay) symbols += `<span class="token relay ${run.relays.includes(relay.id) ? 'done' : ''}" aria-hidden="true">${relay.symbol}</span>`;
  const rescue = board.rescues.find(marker);
  if (rescue && !run.rescues.includes(rescue.id)) symbols += '<span class="token rescue" aria-hidden="true">○</span>';
  if (ghost && ghost.x === x && ghost.y === y) symbols += '<span class="marker ghost" aria-label="Shared route marker">◇</span>';
  if (run.player.x === x && run.player.y === y) symbols += '<span class="marker player" aria-label="Your route marker">●</span>';
  return symbols;
};

const boardGrid = (): string => {
  const cells = Array.from({ length: board.size * board.size }, (_, index) => {
    const x = index % board.size;
    const y = Math.floor(index / board.size);
    return `<div class="tile" aria-hidden="true">${boardSymbol(x, y)}</div>`;
  }).join('');
  const goal = `Board ${board.label}. Connect Relay 1, Relay 2, and Relay 3 in order, then reach the exit. ${run.rescues.length} of ${board.rescues.length} optional rescues collected.`;
  return `<div class="board-wrap"><div class="board" role="img" aria-label="${escapeHtml(goal)}">${cells}</div><p class="board-key"><span><b class="key-player">●</b> You</span><span><b class="key-relay">◆</b> Relay</span><span><b class="key-rescue">○</b> Rescue</span><span><b class="key-exit">↗</b> Exit</span></p></div>`;
};

const cardMarkup = (card: RallyCard, label: string): string => `
  <section class="rally-card" aria-label="${escapeHtml(label)}">
    <p class="eyebrow">${escapeHtml(label)}</p>
    <div><strong>${card.speed}s</strong><span>speed left</span></div>
    <div><strong>${card.elegance}%</strong><span>elegance</span></div>
    <div><strong>${card.rescues}</strong><span>rescues</span></div>
  </section>`;

const currentCard = (): RallyCard => rallyCard(board, run);

const endMarkup = (): string => {
  if (run.status === 'won') {
    const code = encodeReplay(board.id, run.route);
    const shareUrl = new URL('/', location.origin);
    shareUrl.searchParams.set('replay', code);
    return `<section class="end-screen win" aria-labelledby="end-title">
      <p class="eyebrow">Board complete</p>
      <h2 id="end-title">You reached the exit</h2>
      <p>Replay this board to improve one part of your rally card.</p>
      ${cardMarkup(currentCard(), 'This run')}
      <div class="end-actions"><button class="button button-primary" type="button" data-action="restart">Play this board again</button><button class="button button-secondary" type="button" data-action="copy-code">Copy replay code</button></div>
      <label class="share-output">Replay code<input aria-label="Completed replay code" readonly value="${escapeHtml(code)}" /></label>
      <button class="text-button" type="button" data-action="copy-link" data-share-url="${escapeHtml(shareUrl.toString())}">Copy replay link</button>
    </section>`;
  }
  if (run.status === 'lost') {
    return `<section class="end-screen loss" aria-labelledby="end-title">
      <p class="eyebrow">Run over</p>
      <h2 id="end-title">The route was not completed</h2>
      <p>Try the same board again. Your previous best remains visible.</p>
      <div class="end-actions"><button class="button button-primary" type="button" data-action="restart">Restart this board</button><button class="button button-secondary" type="button" data-action="select-daily">Choose the daily board</button></div>
    </section>`;
  }
  return '';
};

const boardPicker = (): string => {
  const buttons = practiceBoards().map((practice) => `<button class="archive-board ${practice.id === board.id ? 'selected' : ''}" type="button" data-action="select-board" data-board="${practice.id}" aria-pressed="${practice.id === board.id}">${practice.label.replace('Practice ', '')}</button>`).join('');
  return `<section class="archive-section" id="archive" aria-labelledby="archive-title">
    <div class="section-heading"><p class="eyebrow">Permanent archive</p><h2 id="archive-title">Choose a practice board</h2><p>These 20 boards stay available. The daily board changes each day.</p></div>
    <div class="archive-controls"><button class="button button-secondary" type="button" data-action="select-daily">Play today’s board</button><span>Seed: <code>${escapeHtml(board.seed)}</code></span></div>
    ${pendingBoardId ? `<div class="inline-confirmation" role="alert"><p>Switch boards? The current run will end without a score.</p><button class="button button-danger" type="button" data-action="confirm-switch">Switch board</button><button class="button button-secondary" type="button" data-action="cancel-switch">Keep this board</button></div>` : ''}
    <div class="archive-grid" role="group" aria-label="Twenty permanent practice boards">${buttons}</div>
  </section>`;
};

const replayJoinMarkup = (): string => `<section class="replay-join" aria-labelledby="replay-title">
  <p class="eyebrow">Shared replay</p>
  <h2 id="replay-title">Watch a friend’s route</h2>
  <p>A replay code contains only a board and its moves. It contains no name or profile.</p>
  <form id="replay-form" novalidate>
    <label for="replay-code-input">Replay code</label>
    <div class="form-row"><input id="replay-code-input" name="replay-code" autocomplete="off" spellcheck="false" placeholder="RR1:practice-01:RRRR…" /><button class="button button-secondary" type="submit">Load replay code</button></div>
    <p id="replay-error" class="form-error" aria-live="assertive"></p>
  </form>
  ${replay ? `<div class="ghost-note" role="status"><strong>Shared route loaded.</strong> No account is shown. <button class="text-button" type="button" data-action="play-ghost">Play shared route</button></div>` : ''}
</section>`;

const gameControls = (): string => {
  const stateLabel = run.status === 'ready' ? 'Start run' : run.status === 'playing' ? 'Pause run' : 'Resume run';
  const action = run.status === 'playing' ? 'pause' : run.status === 'paused' ? 'resume-direct' : 'start';
  const disabled = run.status === 'won' || run.status === 'lost' ? 'disabled' : '';
  return `<div class="control-panel" aria-label="Game controls">
    <div class="direction-pad" aria-label="Move with buttons, Arrow keys, or WASD">
      <span></span><button type="button" class="direction" data-action="move" data-direction="up" aria-label="Move up" ${disabled}>↑</button><span></span>
      <button type="button" class="direction" data-action="move" data-direction="left" aria-label="Move left" ${disabled}>←</button><button type="button" class="direction" data-action="move" data-direction="down" aria-label="Move down" ${disabled}>↓</button><button type="button" class="direction" data-action="move" data-direction="right" aria-label="Move right" ${disabled}>→</button>
    </div>
    <div class="run-actions"><button class="button button-primary" type="button" data-action="${action}" ${disabled}>${stateLabel}</button><button class="button button-secondary" type="button" data-action="restart">Restart board</button><button class="text-button" type="button" data-action="settings">Settings</button></div>
  </div>`;
};

const settingsDialog = (): string => settingsOpen ? `<dialog id="settings-dialog" aria-labelledby="settings-title">
  <form method="dialog" class="dialog-content"><div class="dialog-heading"><h2 id="settings-title">Game settings</h2><button class="icon-button" type="button" data-action="close-settings" aria-label="Close settings">×</button></div>
  <label class="check-row"><input type="checkbox" data-setting="assist" ${settings.assist ? 'checked' : ''} /> <span><strong>Assist mode</strong><small>Adds 45 seconds to a new run.</small></span></label>
  <label class="check-row"><input type="checkbox" data-setting="muted" ${settings.muted ? 'checked' : ''} /> <span><strong>Mute route sounds</strong><small>Route sounds begin only after you move.</small></span></label>
  <label class="check-row"><input type="checkbox" data-setting="lowMotion" ${settings.lowMotion ? 'checked' : ''} /> <span><strong>Reduce movement</strong><small>Removes tile movement in this game.</small></span></label>
  <button class="button button-primary" type="button" data-action="close-settings">Save settings</button></form>
</dialog>` : '';

const pauseDialog = (): string => pauseOpen ? `<dialog id="pause-dialog" aria-labelledby="pause-title">
  <div class="dialog-content"><div class="dialog-heading"><h2 id="pause-title">Run paused</h2><button class="icon-button" type="button" data-action="resume" aria-label="Resume run">×</button></div>
  ${endConfirmation ? `<p>End this run? It will not add a rally card.</p><div class="dialog-actions"><button class="button button-danger" type="button" data-action="end-run">End run</button><button class="button button-secondary" type="button" data-action="keep-run">Keep playing</button></div>` : `<p>Your timer is stopped. Resume when you are ready.</p><div class="dialog-actions"><button class="button button-primary" type="button" data-action="resume">Resume run</button><button class="button button-secondary" type="button" data-action="ask-end">End this run</button></div>`}</div>
</dialog>` : '';

const header = (): string => `<header class="site-header"><a class="wordmark" href="/" data-route aria-label="Rankless Rally home"><span aria-hidden="true">⌁</span> Rankless Rally</a><nav aria-label="Main navigation"><a href="/demo" data-route>Demo</a><a href="/?archive=1" data-route>Archive</a><a href="/privacy" data-route>Privacy</a></nav></header>`;

const footer = (): string => `<footer class="site-footer"><p>Short routing puzzles with personal route cards.</p><p><a href="/privacy" data-route>Privacy</a> · <a href="/terms" data-route>Terms</a> · Built by Param Factory · Build 1.0.0</p><p class="asset-note">Route symbols and map artwork are original code-drawn assets.</p></footer>`;

const gamePage = (): string => {
  const best = bests[board.id];
  const demoMessage = demoNotice || 'Demo — sample data, nothing is saved to your real game.';
  const demoDetail = demoNotice ? 'The sample board was restored in demo storage.' : 'Practice 01 includes a sample best card and stays in demo storage.';
  const demoBanner = isDemo ? `<aside class="demo-banner" role="status"><strong>${demoMessage}</strong><span>${demoDetail}</span><button class="text-button" type="button" data-action="reset-demo">Reset demo</button><button class="text-button" type="button" data-action="start-real">Start for real</button></aside>` : '';
  return `${header()}<main id="main" tabindex="-1" class="game-main ${settings.lowMotion ? 'motion-reduced' : ''}">
    <section class="game-intro" aria-labelledby="game-title">
      <div class="intro-copy"><p class="eyebrow">A 90-second routing puzzle</p><h1 id="game-title">Connect every relay before time ends</h1><p class="lede">For puzzle players who want a personal route score, not a rank table.</p>
      <div class="intro-actions">${isDemo ? '<button class="button button-primary" type="button" data-action="start">Start the sample board</button>' : '<button class="button button-primary" type="button" data-action="try-demo">Try it with sample data</button>'}<span>${isDemo ? 'Start with a sample best card.' : 'Loads a practice board and a shared route. It does not change your game.'}</span></div>
      <ul class="plain-facts"><li>Free to play</li><li>No account required</li><li>Saves in this browser</li></ul></div>
      <div class="map-caption" aria-hidden="true"><span>◆</span><span>▲</span><span>■</span><i></i><b>↗</b></div>
    </section>
    ${demoBanner}
    <section class="game-stage" aria-labelledby="board-title">
      <div class="stage-heading"><div><p class="eyebrow">${escapeHtml(board.seed)}</p><h2 id="board-title">${escapeHtml(board.label)}</h2></div><div class="status-strip"><span>Time <strong id="timer" data-testid="timer">${formatTime(run.timeRemaining)}</strong></span><span>Relays <strong>${run.relays.length}/3</strong></span><span>Rescues <strong>${run.rescues.length}/3</strong></span></div></div>
      <p class="goal-line">Goal: connect ◆, ▲, ■ in order, then reach ↗. Optional ○ rescues improve your card.</p>
      <div class="play-area">${boardGrid()}<div class="play-side"><p id="game-feedback" class="feedback" aria-live="polite">${escapeHtml(run.feedback)}</p>${gameControls()}<p class="keyboard-note">Use Arrow keys or WASD. Touch the direction buttons on a phone.</p>${best ? cardMarkup(best, isDemo ? 'Sample best' : 'Your best') : '<p class="best-empty">Finish a board to save a personal best here.</p>'}<p class="runtime-note" id="runtime-rate" data-testid="runtime-rate">60 Hz update target</p></div></div>
      ${endMarkup()}
    </section>
    <section class="how-section" aria-labelledby="how-title"><p class="eyebrow">How it works</p><h2 id="how-title">Play one route at a time</h2><ol><li><strong>Pick a board.</strong> Use today’s board or any permanent practice board.</li><li><strong>Connect relays.</strong> Route them in number order before the exit opens.</li><li><strong>Improve a card.</strong> Beat your time, use fewer moves, or collect rescues.</li></ol></section>
    ${boardPicker()}
    ${replayJoinMarkup()}
    <section class="privacy-section" aria-labelledby="privacy-summary-title"><p class="eyebrow">Privacy</p><h2 id="privacy-summary-title">What this game stores and sends</h2><p>The game starts without an account. Browser storage holds settings, a saved run, and personal best cards. Sample play sends no third-party request.</p><a href="/privacy" data-route>Read the privacy details</a></section>
  </main>${footer()}${settingsDialog()}${pauseDialog()}<p id="route-announcement" class="sr-only" aria-live="polite"></p>`;
};

const informationPage = (kind: 'privacy' | 'terms'): string => {
  const privacy = kind === 'privacy';
  const title = privacy ? 'Privacy — Rankless Rally' : 'Terms — Rankless Rally';
  document.title = title;
  return `${header()}<main id="main" tabindex="-1" class="information-page"><p class="eyebrow">Rankless Rally</p><h1>${privacy ? 'Keep puzzle progress in your browser' : 'Play a free puzzle game'}</h1>${privacy ? `<p class="lede">Rankless Rally stores settings, a current run, and personal best cards in your browser. It does not require an account.</p><h2>What is stored</h2><p>The game uses local browser storage. Demo data uses a separate demo storage area and is removed when you leave or reset the demo.</p><h2>What is sent</h2><p>The game does not send gameplay, names, or tracking events to a service. A replay code contains a board identifier and move letters that you choose to copy.</p><h2>Remove your data</h2><p>Use your browser’s site-data controls to remove saved settings and cards. Reset demo removes only demo data.</p>` : `<p class="lede">Rankless Rally is free to play. It is for personal puzzle play and shareable replay codes.</p><h2>Using the game</h2><p>You may play the daily board and every practice board without an account. Do not use the game to send harmful material through replay codes.</p><h2>Availability</h2><p>The game is offered as is. Browser storage can be removed by your browser or its privacy settings.</p><h2>Contact</h2><p>This product is built by Param Factory. The product site has no payment or account service.</p>`}</main>${footer()}<p id="route-announcement" class="sr-only" aria-live="polite"></p>`;
};

const notFoundPage = (): string => {
  document.title = 'Page not found — Rankless Rally';
  return `${header()}<main id="main" tabindex="-1" class="not-found"><p class="eyebrow">404</p><h1>Choose a board that exists</h1><p>This page is not on the route map. Go back to the daily board or the practice archive.</p><a class="button button-primary" href="/" data-route>Play a board</a></main>${footer()}<p id="route-announcement" class="sr-only" aria-live="polite"></p>`;
};

const pageTitle = (): string => isDemo ? 'Demo — Rankless Rally' : 'Rankless Rally — play short routing puzzles';

const render = (moveFocus = false): void => {
  const page = pageName();
  if (page === 'game') {
    document.title = pageTitle();
    app.innerHTML = gamePage();
  } else if (page === 'privacy' || page === 'terms') {
    app.innerHTML = informationPage(page);
  } else {
    app.innerHTML = notFoundPage();
  }
  if (settingsOpen) document.querySelector<HTMLDialogElement>('#settings-dialog')?.showModal();
  if (pauseOpen) document.querySelector<HTMLDialogElement>('#pause-dialog')?.showModal();
  if (moveFocus) {
    requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('h1');
      heading?.focus();
      const announcement = document.querySelector<HTMLElement>('#route-announcement');
      if (announcement && heading) announcement.textContent = heading.textContent ?? '';
    });
  }
};

const playTone = (): void => {
  if (settings.muted) return;
  try {
    audioContext ??= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = 460;
    gain.gain.setValueAtTime(0.025, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.045);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.05);
  } catch {
    // Audio is optional and should never block a move.
  }
};

const persistAndRender = (): void => {
  saveRun();
  render();
};

const selectBoard = (id: string): void => {
  if (run.status === 'playing') {
    pendingBoardId = id;
    render();
    return;
  }
  const next = boardById(id);
  if (!next) return;
  board = next;
  run = makeRun(board, settings);
  replay = null;
  ghostIndex = 0;
  saveRun();
  render();
};

const startRun = (): void => {
  if (run.status === 'ready') {
    run = { ...run, status: 'playing', started: true, feedback: 'Timer started. Connect Relay 1 first.' };
    saveRun();
    render();
  }
};

const moveRun = (direction: Direction): void => {
  if (pageName() !== 'game' || run.status === 'paused' || run.status === 'won' || run.status === 'lost') return;
  run = routeMove(board, run, direction);
  playTone();
  if (run.status === 'won') {
    const candidate = currentCard();
    const previous = bests[board.id];
    if (!previous || candidate.speed > previous.speed || candidate.elegance > previous.elegance || candidate.rescues > previous.rescues) {
      bests = { ...bests, [board.id]: candidate };
      saveBests();
    }
  }
  persistAndRender();
};

const endRun = (message: string): void => {
  if (run.status !== 'playing' && run.status !== 'paused') return;
  run = { ...run, status: 'lost', feedback: message };
  pauseOpen = false;
  endConfirmation = false;
  persistAndRender();
};

const stopGhost = (): void => {
  if (ghostTimer !== null) window.clearTimeout(ghostTimer);
  ghostTimer = null;
};

const playGhost = (): void => {
  if (!replay) return;
  stopGhost();
  ghostIndex = 0;
  const positions = replayPositions(board, replay.route);
  const step = (): void => {
    ghostIndex += 1;
    render();
    if (ghostIndex < positions.length - 1) ghostTimer = window.setTimeout(step, settings.lowMotion || matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 220);
    else ghostTimer = null;
  };
  if (positions.length > 1) ghostTimer = window.setTimeout(step, 1);
};

const copy = async (value: string, success: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const temporary = document.createElement('textarea');
    temporary.value = value;
    temporary.className = 'copy-buffer';
    document.body.append(temporary);
    temporary.select();
    document.execCommand('copy');
    temporary.remove();
  }
  run = { ...run, feedback: success };
  render();
};

document.addEventListener('click', (event) => {
  const target = (event.target as Element | null)?.closest<HTMLElement>('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (action === 'try-demo') navigate('/demo');
  if (action === 'start') startRun();
  if (action === 'pause') {
    if (run.status === 'playing') {
      run = { ...run, status: 'paused', feedback: 'Run paused.' };
      pauseOpen = true;
      saveRun();
      render();
    }
  }
  if (action === 'resume' || action === 'resume-direct') {
    if (run.status === 'paused') {
      run = { ...run, status: 'playing', feedback: 'Run resumed.' };
      pauseOpen = false;
      endConfirmation = false;
      saveRun();
      render();
    }
  }
  if (action === 'restart') {
    run = makeRun(board, settings);
    replay = null;
    ghostIndex = 0;
    saveRun();
    render();
  }
  if (action === 'move' && target.dataset.direction) moveRun(target.dataset.direction as Direction);
  if (action === 'settings') {
    settingsOpen = true;
    render();
  }
  if (action === 'close-settings') {
    settingsOpen = false;
    render();
  }
  if (action === 'ask-end') {
    endConfirmation = true;
    render();
  }
  if (action === 'keep-run') {
    endConfirmation = false;
    render();
  }
  if (action === 'end-run') endRun('You ended this run. Start again when ready.');
  if (action === 'select-board' && target.dataset.board) selectBoard(target.dataset.board);
  if (action === 'select-daily') selectBoard(dailyBoard().id);
  if (action === 'confirm-switch' && pendingBoardId) {
    const id = pendingBoardId;
    pendingBoardId = null;
    const next = boardById(id);
    if (next) {
      board = next;
      run = makeRun(board, settings);
      replay = null;
      saveRun();
    }
    render();
  }
  if (action === 'cancel-switch') {
    pendingBoardId = null;
    render();
  }
  if (action === 'copy-code' && run.status === 'won') void copy(encodeReplay(board.id, run.route), 'Replay code copied.');
  if (action === 'copy-link' && target.dataset.shareUrl) void copy(target.dataset.shareUrl, 'Replay link copied.');
  if (action === 'play-ghost') playGhost();
  if (action === 'reset-demo' && isDemo) {
    clearDemoStore();
    demoNotice = 'Demo reset. Your real game was not changed.';
    initialiseSession();
    render();
  }
  if (action === 'start-real' && isDemo) {
    clearDemoStore();
    demoNotice = '';
    navigate('/');
  }
});

document.addEventListener('change', (event) => {
  const input = event.target as HTMLInputElement;
  const setting = input.dataset.setting as keyof Settings | undefined;
  if (!setting) return;
  settings = { ...settings, [setting]: input.checked };
  saveSettings();
  if (run.status === 'ready') run = makeRun(board, settings);
  saveRun();
  render();
});

document.addEventListener('submit', (event) => {
  const form = event.target as HTMLFormElement;
  if (form.id !== 'replay-form') return;
  event.preventDefault();
  const input = form.querySelector<HTMLInputElement>('[name="replay-code"]');
  const code = input?.value ?? '';
  const decoded = decodeReplay(code);
  const replayBoard = decoded ? boardById(decoded.boardId) : undefined;
  const error = document.querySelector<HTMLElement>('#replay-error');
  if (!decoded || !replayBoard) {
    if (error) error.textContent = 'This replay code is not valid. Paste a code that starts with RR1.';
    return;
  }
  board = replayBoard;
  run = makeRun(board, settings);
  replay = { ...decoded, code: code.trim() };
  ghostIndex = 0;
  saveRun();
  render();
});

document.addEventListener('keydown', (event) => {
  const element = event.target as HTMLElement | null;
  if (element?.matches('input, textarea, select')) return;
  if (event.key === 'Escape' && settingsOpen) {
    settingsOpen = false;
    render();
    return;
  }
  if (event.key === 'Escape' && pauseOpen) {
    if (run.status === 'paused') {
      run = { ...run, status: 'playing', feedback: 'Run resumed.' };
      saveRun();
    }
    pauseOpen = false;
    endConfirmation = false;
    render();
    return;
  }
  if (event.key.toLowerCase() === 'p' && run.status === 'playing') {
    event.preventDefault();
    run = { ...run, status: 'paused', feedback: 'Run paused.' };
    pauseOpen = true;
    saveRun();
    render();
    return;
  }
  const direction = directionFromKey(event.key);
  if (direction) {
    event.preventDefault();
    moveRun(direction);
  }
});

document.addEventListener('click', (event) => {
  const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[data-route]');
  if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigate(link.getAttribute('href') ?? '/');
});

window.addEventListener('popstate', () => {
  stopGhost();
  initialiseSession();
  render(true);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && run.status === 'playing') {
    run = { ...run, status: 'paused', feedback: 'Run paused because this tab was hidden.' };
    saveRun();
    if (pageName() === 'game') render();
  }
});

const updateRuntimeLabels = (): void => {
  const timer = document.querySelector<HTMLElement>('#timer');
  if (timer) timer.textContent = formatTime(run.timeRemaining);
  const rate = document.querySelector<HTMLElement>('#runtime-rate');
  const now = performance.now();
  if (now - sampleStarted >= 1000) {
    if (rate) rate.textContent = `${ticksInSample} Hz update sample`;
    ticksInSample = 0;
    sampleStarted = now;
  }
};

const gameLoop = (now: number): void => {
  const delta = Math.min(250, now - lastFrame);
  lastFrame = now;
  if (!document.hidden && run.status === 'playing') {
    accumulated += delta;
    while (accumulated >= 1000 / 60) {
      run = { ...run, timeRemaining: run.timeRemaining - (1 / 60) };
      accumulated -= 1000 / 60;
      simulationTicks += 1;
      ticksInSample += 1;
      if (run.timeRemaining <= 0) {
        endRun('Time ended before the exit was reached.');
        break;
      }
    }
    if (simulationTicks % 60 === 0) saveRun();
    updateRuntimeLabels();
  }
  requestAnimationFrame(gameLoop);
};

initialiseSession();
render(true);
requestAnimationFrame(gameLoop);
