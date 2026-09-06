import './styles.css';
import {
  boardById,
  dailyBoard,
  defaultSettings,
  directionFromKey,
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
type VerifiedReplay = { code: string; board_id: string; moves: string };

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('The game could not start because its page container is missing.');

const storageRoot = 'rankless-rally';
const canonicalOrigin = 'https://rankless-rally.sociobot.in';
let isDemo = false;
let settings: Settings = { ...defaultSettings };
let bests: Bests = {};
let board: Board = dailyBoard();
let run: Run = makeRun(board, settings);
let replay: Replay | null = null;
let completedReplayCode: string | null = null;
let replayCodeSaving = false;
let replayCodeError = '';
let replayError = '';
let pendingReplayCode = '';
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

const demoReplayCode = 'RR2-DEMO-PRACTICE-01';
const demoReplayRoute: Direction[] = ['right', 'right', 'right', 'right', 'right', 'up', 'right', 'up', 'up', 'up', 'up', 'up'];

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

const removeStore = (name: string): void => {
  try {
    localStorage.removeItem(storeKey(name));
  } catch {
    // The game remains playable if a browser blocks local storage.
  }
};

const clearDemoStore = (): void => {
  ['settings', 'bests', 'run', 'completed-replay-code'].forEach((name) => localStorage.removeItem(`demo:${storageRoot}:${name}`));
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

const archiveRequested = (): boolean => pageName() === 'game' && new URLSearchParams(location.search).get('archive') === '1';

const setMetaContent = (selector: string, content: string): void => {
  document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content);
};

const setRouteMetadata = (page: ReturnType<typeof pageName>): void => {
  const metadata = page === 'privacy'
    ? { title: 'Privacy — Rankless Rally', description: 'See what Rankless Rally stores in this browser and how to remove it.' }
    : page === 'terms'
      ? { title: 'Terms — Rankless Rally', description: 'Read the free-play terms for Rankless Rally routing puzzles.' }
      : page === 'not-found'
        ? { title: 'Page not found — Rankless Rally', description: 'This Rankless Rally page is not available.' }
        : isDemo
          ? { title: 'Demo — Rankless Rally', description: 'Try a sample routing board without changing your saved game.' }
          : { title: 'Rankless Rally — play short routing puzzles', description: 'Play short routing puzzles, improve a personal route card, and share a replay code.' };
  document.title = metadata.title;
  setMetaContent('meta[name="description"]', metadata.description);
  setMetaContent('meta[property="og:title"]', metadata.title);
  setMetaContent('meta[property="og:description"]', metadata.description);
  setMetaContent('meta[name="twitter:title"]', metadata.title);
  setMetaContent('meta[name="twitter:description"]', metadata.description);
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical && page !== 'not-found') canonical.href = new URL(currentPath(), canonicalOrigin).toString();
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
  const savedReplayCode = readStore<unknown>('completed-replay-code', null);
  completedReplayCode = typeof savedReplayCode === 'string' && /^RR2-[A-Z0-9-]+$/.test(savedReplayCode) ? savedReplayCode : null;
  replayCodeSaving = false;
  replayCodeError = '';
  replayError = '';
  pendingReplayCode = '';
  if (isDemo && Object.keys(bests).length === 0) {
    bests = { 'practice-01': { speed: 74, elegance: 92, rescues: 2 } };
    saveBests();
  }
  const params = new URLSearchParams(location.search);
  const requestedReplayCode = params.get('replay');
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
  if (isDemo && !requestedReplayCode) {
    replay = { boardId: 'practice-01', route: demoReplayRoute, code: demoReplayCode };
    ghostIndex = 1;
  }
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
  render(archiveRequested() ? '#archive-title' : 'h1');
  hydrateReplayFromLocation();
};

const sandboxHeaders = (): HeadersInit => isDemo ? { 'X-Rankless-Sandbox': 'demo' } : {};

const routeFromServer = (candidate: unknown): Replay | null => {
  if (!candidate || typeof candidate !== 'object') return null;
  const replayCandidate = candidate as Partial<VerifiedReplay>;
  if (typeof replayCandidate.code !== 'string' || typeof replayCandidate.board_id !== 'string' || typeof replayCandidate.moves !== 'string') return null;
  const replayBoard = boardById(replayCandidate.board_id);
  if (!replayBoard || !/^RR2-[A-Z0-9-]+$/.test(replayCandidate.code) || !/^[UDLR]{1,512}$/.test(replayCandidate.moves)) return null;
  const directions: Record<string, Direction> = { U: 'up', D: 'down', L: 'left', R: 'right' };
  const route = [...replayCandidate.moves].map((move) => directions[move]);
  if (route.some((direction) => !direction)) return null;
  return { boardId: replayCandidate.board_id, route, code: replayCandidate.code };
};

const replayRequestError = (): string => 'This replay code is not valid. Paste a server-checked code that starts with RR2.';

const loadServerReplay = async (code: string): Promise<void> => {
  pendingReplayCode = code.trim().toUpperCase();
  replayError = 'Checking this replay with the server.';
  render();
  try {
    const response = await fetch(`/api/replays/${encodeURIComponent(pendingReplayCode)}`, { headers: sandboxHeaders() });
    const payload = await response.json().catch(() => null);
    const nextReplay = response.ok ? routeFromServer(payload) : null;
    if (!nextReplay) {
      replayError = replayRequestError();
      render();
      return;
    }
    board = boardById(nextReplay.boardId) ?? board;
    run = makeRun(board, settings);
    replay = nextReplay;
    ghostIndex = 0;
    replayError = '';
    saveRun();
    render();
  } catch {
    replayError = 'The replay server is unavailable. Check your connection and try again.';
    render();
  }
};

const hydrateDemoReplay = async (): Promise<void> => {
  if (!isDemo || new URLSearchParams(location.search).has('replay')) return;
  try {
    const response = await fetch('/api/replays/demo', { headers: sandboxHeaders() });
    const nextReplay = response.ok ? routeFromServer(await response.json()) : null;
    if (!nextReplay || !isDemo || new URLSearchParams(location.search).has('replay')) return;
    const replayChanged = replay?.boardId !== nextReplay.boardId
      || replay.code !== nextReplay.code
      || replay.route.join(',') !== nextReplay.route.join(',')
      || ghostIndex !== 1;
    replay = nextReplay;
    ghostIndex = 1;
    if (replayChanged) render();
  } catch {
    // The bundled sample marker stays available even when a local server is stopped.
  }
};

const hydrateReplayFromLocation = (): void => {
  const requestedReplayCode = new URLSearchParams(location.search).get('replay');
  if (requestedReplayCode) {
    void loadServerReplay(requestedReplayCode);
  } else if (isDemo) {
    void hydrateDemoReplay();
  }
};

const saveVerifiedReplay = async (boardId: string, route: Direction[]): Promise<void> => {
  if (replayCodeSaving || completedReplayCode) return;
  replayCodeSaving = true;
  replayCodeError = '';
  render();
  const moves = route.map((direction) => ({ up: 'U', down: 'D', left: 'L', right: 'R' })[direction]).join('');
  try {
    const response = await fetch('/api/replays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...sandboxHeaders() },
      body: JSON.stringify({ board_id: boardId, moves })
    });
    const nextReplay = response.ok ? routeFromServer(await response.json()) : null;
    if (!nextReplay || nextReplay.boardId !== boardId || nextReplay.route.length !== route.length) throw new Error('The replay response was incomplete.');
    if (run.status !== 'won' || board.id !== boardId || run.route.map((direction) => ({ up: 'U', down: 'D', left: 'L', right: 'R' })[direction]).join('') !== moves) return;
    completedReplayCode = nextReplay.code;
    writeStore('completed-replay-code', completedReplayCode);
  } catch {
    replayCodeError = 'Your route is complete, but a replay code could not be saved. Check your connection, then try again.';
  } finally {
    replayCodeSaving = false;
    render();
  }
};

const clearCompletedReplay = (): void => {
  completedReplayCode = null;
  replayCodeSaving = false;
  replayCodeError = '';
  removeStore('completed-replay-code');
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
  return `<div class="board-wrap"><div class="board" role="img" aria-label="${escapeHtml(goal)}" ${replay ? `data-ghost-step="${ghostIndex}" data-ghost-length="${replay.route.length}"` : ''}>${cells}</div><p class="board-key"><span><b class="key-player">●</b> You</span><span><b class="key-relay">◆</b> Relay</span><span><b class="key-rescue">○</b> Rescue</span><span><b class="key-exit">↗</b> Exit</span></p></div>`;
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
    const codeMarkup = completedReplayCode
      ? `<label class="share-output">Verified replay code<input aria-label="Completed replay code" readonly value="${escapeHtml(completedReplayCode)}" /></label>`
      : replayCodeError
        ? `<p class="form-error" role="alert">${escapeHtml(replayCodeError)}</p><button class="button button-secondary" type="button" data-action="retry-replay">Save verified replay code</button>`
        : `<p class="share-output" aria-live="polite">${replayCodeSaving ? 'Saving verified replay code.' : 'Checking your completed route with the server.'}</p>`;
    const shareUrl = completedReplayCode ? new URL('/', location.origin) : null;
    if (shareUrl && completedReplayCode) shareUrl.searchParams.set('replay', completedReplayCode);
    return `<section class="end-screen win" aria-labelledby="end-title">
      <p class="eyebrow">Board complete</p>
      <h2 id="end-title" tabindex="-1">You reached the exit</h2>
      <p>Replay this board to improve one part of your rally card.</p>
      ${cardMarkup(currentCard(), 'This run')}
      <div class="end-actions"><button class="button button-primary" type="button" data-action="restart">Play this board again</button>${completedReplayCode ? '<button class="button button-secondary" type="button" data-action="copy-code">Copy replay code</button>' : ''}</div>
      ${codeMarkup}
      ${shareUrl ? `<button class="text-button" type="button" data-action="copy-link" data-share-url="${escapeHtml(shareUrl.toString())}">Copy replay link</button>` : ''}
    </section>`;
  }
  if (run.status === 'lost') {
    return `<section class="end-screen loss" aria-labelledby="end-title">
      <p class="eyebrow">Run over</p>
      <h2 id="end-title" tabindex="-1">The route was not completed</h2>
      <p>Try the same board again. Your previous best remains visible.</p>
      <div class="end-actions"><button class="button button-primary" type="button" data-action="restart">Restart this board</button><button class="button button-secondary" type="button" data-action="select-daily">Choose the daily board</button></div>
    </section>`;
  }
  return '';
};

const boardPicker = (): string => {
  const buttons = practiceBoards().map((practice) => `<button class="archive-board ${practice.id === board.id ? 'selected' : ''}" type="button" data-action="select-board" data-board="${practice.id}" aria-pressed="${practice.id === board.id}">${practice.label.replace('Practice ', '')}</button>`).join('');
  return `<section class="archive-section" id="archive" aria-labelledby="archive-title">
    <div class="section-heading"><p class="eyebrow">Permanent archive</p><h2 id="archive-title" tabindex="-1">Choose a practice board</h2><p>These 20 boards stay available. The daily board changes each day.</p></div>
    <div class="archive-controls"><button class="button button-secondary" type="button" data-action="select-daily">Play today’s board</button><span>Seed: <code>${escapeHtml(board.seed)}</code></span></div>
    ${pendingBoardId ? `<div class="inline-confirmation" role="alert"><p>Switch boards? The current run will end without a score.</p><button class="button button-danger" type="button" data-action="confirm-switch">Switch board</button><button class="button button-secondary" type="button" data-action="cancel-switch">Keep this board</button></div>` : ''}
    <div class="archive-grid" role="group" aria-label="Twenty permanent practice boards">${buttons}</div>
  </section>`;
};

const replayJoinMarkup = (): string => `<section class="replay-join" aria-labelledby="replay-title">
  <p class="eyebrow">Shared replay</p>
  <h2 id="replay-title">Watch a friend’s route</h2>
  <p>A replay code names a server-checked route. It contains no name or profile.</p>
  <form id="replay-form" novalidate>
    <label for="replay-code-input">Replay code</label>
    <div class="form-row"><input id="replay-code-input" name="replay-code" autocomplete="off" spellcheck="false" value="${escapeHtml(pendingReplayCode)}" placeholder="RR2-…" /><button class="button button-secondary" type="submit">Load replay code</button></div>
    <p id="replay-error" class="form-error" aria-live="assertive">${escapeHtml(replayError)}</p>
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
  <label class="check-row"><input type="checkbox" data-setting="lowMotion" ${settings.lowMotion ? 'checked' : ''} /> <span><strong>Reduce movement</strong><small>Shows shared replays without route animation.</small></span></label>
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
  const demoDetail = demoNotice ? 'The sample board and route were restored in demo storage.' : 'Practice 01 includes a sample best card and shared route.';
  const demoBanner = isDemo ? `<aside class="demo-banner" aria-label="Demo sandbox"><strong>${demoMessage}</strong><span>${demoDetail}</span><button class="text-button" type="button" data-action="reset-demo">Reset demo</button><button class="text-button" type="button" data-action="start-real">Start for real</button></aside>` : '';
  return `${header()}<main id="main" tabindex="-1" class="game-main ${settings.lowMotion ? 'motion-reduced' : ''}">
    <section class="game-intro" aria-labelledby="game-title">
      <div class="intro-copy"><p class="eyebrow">A 90-second routing puzzle</p><h1 id="game-title" tabindex="-1">Connect every relay before time ends</h1><p class="lede">For puzzle players who want a personal route score, not a rank table.</p>
      <div class="intro-actions">${isDemo ? '<button class="button button-primary" type="button" data-action="start">Start the sample board</button>' : '<button class="button button-primary" type="button" data-action="try-demo">Try it with sample data</button>'}<span>${isDemo ? 'Start with a sample best card and shared route.' : 'Loads a practice board with a shared route. It does not change your game.'}</span></div>
      <ul class="plain-facts"><li>Free to play</li><li>No account required</li><li>Saves in this browser</li></ul></div>
      <div class="map-caption" aria-hidden="true"><span>◆</span><span>▲</span><span>■</span><i></i><b>↗</b></div>
    </section>
    ${demoBanner}
    <section class="game-stage" aria-labelledby="board-title">
      <div class="stage-heading"><div><p class="eyebrow">${escapeHtml(board.seed)}</p><h2 id="board-title">${escapeHtml(board.label)}</h2></div><div class="status-strip"><span>Time <strong id="timer" data-testid="timer">${formatTime(run.timeRemaining)}</strong></span><span>Relays <strong>${run.relays.length}/3</strong></span><span>Rescues <strong>${run.rescues.length}/3</strong></span>${replay ? '<span data-testid="shared-route-status">Shared route <strong>loaded</strong></span>' : ''}</div></div>
      <p class="goal-line">Goal: connect ◆, ▲, ■ in order, then reach ↗. Fewer moves and optional ○ rescues improve your card.</p>
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
  return `${header()}<main id="main" tabindex="-1" class="information-page"><p class="eyebrow">Rankless Rally</p><h1 tabindex="-1">${privacy ? 'Keep puzzle progress in your browser' : 'Play a free puzzle game'}</h1>${privacy ? `<p class="lede">Rankless Rally stores settings, a current run, and personal best cards in your browser. It does not require an account.</p><h2>What is stored</h2><p>The game uses local browser storage. Demo data uses a separate demo storage area and is removed when you leave or reset the demo.</p><h2>What is sent</h2><p>When you ask for a replay code, this product checks the board and moves on its server. Replay records store a board ID, moves, an opaque code, a tenant, and a creation time. Demo records also have a 24-hour expiry. It stores no account, name, profile, or browser settings.</p><p>Replay requests use a temporary address-based limit held in memory for up to one minute.</p><h2>Remove your data</h2><p>Use your browser’s site-data controls to remove saved settings and cards. Reset demo removes only demo data.</p>` : `<p class="lede">Rankless Rally is free to play. It is for personal puzzle play and shareable replay codes.</p><h2>Using the game</h2><p>You may play the daily board and every practice board without an account. Do not use the game to send harmful material through replay codes.</p><h2>Availability</h2><p>The game is offered as is. Browser storage can be removed by your browser or its privacy settings.</p><h2>Contact</h2><p>This product is built by Param Factory. The product site has no payment or account service.</p>`}</main>${footer()}<p id="route-announcement" class="sr-only" aria-live="polite"></p>`;
};

const notFoundPage = (): string => {
  return `${header()}<main id="main" tabindex="-1" class="not-found"><p class="eyebrow">404</p><h1 tabindex="-1">Choose a board that exists</h1><p>This page is not on the route map. Go back to the daily board or the practice archive.</p><a class="button button-primary" href="/" data-route>Play a board</a></main>${footer()}<p id="route-announcement" class="sr-only" aria-live="polite"></p>`;
};

const render = (focusTarget?: string): void => {
  const page = pageName();
  setRouteMetadata(page);
  if (page === 'game') {
    app.innerHTML = gamePage();
  } else if (page === 'privacy' || page === 'terms') {
    app.innerHTML = informationPage(page);
  } else {
    app.innerHTML = notFoundPage();
  }
  if (settingsOpen) document.querySelector<HTMLDialogElement>('#settings-dialog')?.showModal();
  if (pauseOpen) document.querySelector<HTMLDialogElement>('#pause-dialog')?.showModal();
  if (focusTarget) {
    requestAnimationFrame(() => {
      const focusable = document.querySelector<HTMLElement>(focusTarget);
      if (focusTarget === '#archive-title') focusable?.scrollIntoView({ block: 'start', behavior: 'auto' });
      focusable?.focus({ preventScroll: true });
      const announcement = document.querySelector<HTMLElement>('#route-announcement');
      if (announcement && focusable) announcement.textContent = focusable.textContent ?? '';
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
  clearCompletedReplay();
  saveRun();
  render();
};

const startRun = (): void => {
  if (run.status === 'ready') {
    clearCompletedReplay();
    run = { ...run, status: 'playing', started: true, feedback: 'Timer started. Connect Relay 1 first.' };
    saveRun();
    render();
  }
};

const moveRun = (direction: Direction): void => {
  if (pageName() !== 'game' || run.status === 'paused' || run.status === 'won' || run.status === 'lost') return;
  const movesBefore = run.route.length;
  run = routeMove(board, run, direction);
  if (run.route.length > movesBefore) playTone();
  if (run.status === 'won') {
    const candidate = currentCard();
    const previous = bests[board.id];
    if (!previous || candidate.speed > previous.speed || candidate.elegance > previous.elegance || candidate.rescues > previous.rescues) {
      bests = { ...bests, [board.id]: candidate };
      saveBests();
    }
    persistAndRender();
    void saveVerifiedReplay(board.id, run.route);
    return;
  }
  persistAndRender();
};

const endRun = (message: string): void => {
  if (run.status !== 'playing' && run.status !== 'paused') return;
  run = { ...run, status: 'lost', feedback: message };
  pauseOpen = false;
  endConfirmation = false;
  saveRun();
  render('#end-title');
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
  if (settings.lowMotion || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    ghostIndex = positions.length - 1;
    render();
    return;
  }
  const step = (): void => {
    ghostIndex += 1;
    render();
    if (ghostIndex < positions.length - 1) ghostTimer = window.setTimeout(step, 220);
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
      render('[data-action="pause"]');
    }
  }
  if (action === 'restart') {
    run = makeRun(board, settings);
    replay = null;
    ghostIndex = 0;
    clearCompletedReplay();
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
    render('[data-action="settings"]');
  }
  if (action === 'ask-end') {
    endConfirmation = true;
    render('[data-action="end-run"]');
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
      clearCompletedReplay();
      saveRun();
    }
    render();
  }
  if (action === 'cancel-switch') {
    pendingBoardId = null;
    render();
  }
  if (action === 'copy-code' && completedReplayCode) void copy(completedReplayCode, 'Replay code copied.');
  if (action === 'copy-link' && target.dataset.shareUrl) void copy(target.dataset.shareUrl, 'Replay link copied.');
  if (action === 'retry-replay' && run.status === 'won') void saveVerifiedReplay(board.id, run.route);
  if (action === 'play-ghost') playGhost();
  if (action === 'reset-demo' && isDemo) {
    clearDemoStore();
    demoNotice = 'Demo reset. Your real game was not changed.';
    initialiseSession();
    render('[data-action="reset-demo"]');
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
  render(`[data-setting="${setting}"]`);
});

document.addEventListener('submit', (event) => {
  const form = event.target as HTMLFormElement;
  if (form.id !== 'replay-form') return;
  event.preventDefault();
  const input = form.querySelector<HTMLInputElement>('[name="replay-code"]');
  void loadServerReplay(input?.value ?? '');
});

document.addEventListener('keydown', (event) => {
  const element = event.target as HTMLElement | null;
  if (element?.matches('input, textarea, select')) return;
  if (event.key === 'Escape' && settingsOpen) {
    settingsOpen = false;
    render('[data-action="settings"]');
    return;
  }
  if (event.key === 'Escape' && pauseOpen) {
    if (run.status === 'paused') {
      run = { ...run, status: 'playing', feedback: 'Run resumed.' };
      saveRun();
    }
    pauseOpen = false;
    endConfirmation = false;
    render('[data-action="pause"]');
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
  render(archiveRequested() ? '#archive-title' : 'h1');
  hydrateReplayFromLocation();
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
render(archiveRequested() ? '#archive-title' : undefined);
hydrateReplayFromLocation();
requestAnimationFrame(gameLoop);
