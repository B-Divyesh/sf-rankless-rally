export type Direction = 'up' | 'down' | 'left' | 'right';
export type RunStatus = 'ready' | 'playing' | 'paused' | 'won' | 'lost';

export interface Point {
  x: number;
  y: number;
}

export interface Token extends Point {
  id: string;
  label: string;
  symbol: string;
}

export interface Board {
  id: string;
  label: string;
  seed: string;
  size: number;
  start: Point;
  exit: Point;
  relays: Token[];
  rescues: Token[];
  walls: Point[];
}

export interface Settings {
  assist: boolean;
  muted: boolean;
  lowMotion: boolean;
}

export interface Run {
  boardId: string;
  player: Point;
  route: Direction[];
  relays: string[];
  rescues: string[];
  status: RunStatus;
  timeRemaining: number;
  started: boolean;
  feedback: string;
}

export interface RallyCard {
  speed: number;
  elegance: number;
  rescues: number;
}

export const defaultSettings: Settings = {
  assist: false,
  muted: false,
  lowMotion: false
};

const vectors: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const replayLetters: Record<Direction, string> = {
  up: 'U',
  down: 'D',
  left: 'L',
  right: 'R'
};

const letterDirections: Record<string, Direction> = {
  U: 'up',
  D: 'down',
  L: 'left',
  R: 'right'
};

const pointKey = ({ x, y }: Point): string => `${x},${y}`;

export const equalPoint = (left: Point, right: Point): boolean => left.x === right.x && left.y === right.y;

export const initialSeconds = (settings: Settings): number => (settings.assist ? 135 : 90);

export const makeRun = (board: Board, settings: Settings): Run => ({
  boardId: board.id,
  player: { ...board.start },
  route: [],
  relays: [],
  rescues: [],
  status: 'ready',
  timeRemaining: initialSeconds(settings),
  started: false,
  feedback: 'Choose a direction to start the timer.'
});

const fixedBoard = (): Board => ({
  id: 'practice-01',
  label: 'Practice 01',
  seed: 'PRACTICE-01',
  size: 7,
  start: { x: 0, y: 6 },
  exit: { x: 6, y: 0 },
  relays: [
    { id: 'relay-1', label: 'Relay 1', symbol: '◆', x: 2, y: 6 },
    { id: 'relay-2', label: 'Relay 2', symbol: '▲', x: 5, y: 5 },
    { id: 'relay-3', label: 'Relay 3', symbol: '■', x: 6, y: 1 }
  ],
  rescues: [
    { id: 'rescue-1', label: 'Rescue 1', symbol: '○', x: 0, y: 3 },
    { id: 'rescue-2', label: 'Rescue 2', symbol: '○', x: 4, y: 2 },
    { id: 'rescue-3', label: 'Rescue 3', symbol: '○', x: 2, y: 0 }
  ],
  walls: [
    { x: 1, y: 5 }, { x: 1, y: 4 }, { x: 2, y: 4 }
  ]
});

const seedNumber = (seed: string): number => {
  let value = 2166136261;
  for (const char of seed) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
};

const seeded = (seed: string): (() => number) => {
  let value = seedNumber(seed) || 1;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
};

const generatedBoard = (id: string, label: string, seed: string, wallCount = 10): Board => {
  const random = seeded(seed);
  const size = 7;
  const relays: Token[] = [
    { id: 'relay-1', label: 'Relay 1', symbol: '◆', x: 2, y: 6 },
    { id: 'relay-2', label: 'Relay 2', symbol: '▲', x: 5, y: 5 },
    { id: 'relay-3', label: 'Relay 3', symbol: '■', x: 6, y: 1 }
  ];
  const start = { x: 0, y: 6 };
  const exit = { x: 6, y: 0 };
  const safe = new Set([
    pointKey(start), pointKey(exit), ...relays.map(pointKey),
    '1,6', '3,6', '4,6', '5,6', '5,5', '6,5', '6,4', '6,3', '6,2'
  ]);
  const walls: Point[] = [];
  while (walls.length < wallCount) {
    const point = { x: Math.floor(random() * size), y: Math.floor(random() * size) };
    if (!safe.has(pointKey(point)) && !walls.some((wall) => equalPoint(wall, point))) walls.push(point);
  }
  const rescues: Token[] = [];
  while (rescues.length < 3) {
    const point = { x: Math.floor(random() * size), y: Math.floor(random() * size) };
    if (!safe.has(pointKey(point)) && !walls.some((wall) => equalPoint(wall, point)) && !rescues.some((rescue) => equalPoint(rescue, point))) {
      rescues.push({ id: `rescue-${rescues.length + 1}`, label: `Rescue ${rescues.length + 1}`, symbol: '○', ...point });
    }
  }
  return { id, label, seed, size, start, exit, relays, rescues, walls };
};

const isoDate = (): string => new Date().toISOString().slice(0, 10);

export const dailyBoard = (): Board => {
  const date = isoDate();
  return generatedBoard(`daily-${date}`, `Daily board · ${date}`, `DAILY-${date}`);
};

export const practiceBoards = (): Board[] => [
  fixedBoard(),
  ...Array.from({ length: 19 }, (_, index) => {
    const number = index + 2;
    const padded = String(number).padStart(2, '0');
    const wallCount = Math.min(10, 4 + Math.floor((number - 2) / 3));
    return generatedBoard(`practice-${padded}`, `Practice ${padded}`, `PRACTICE-${padded}`, wallCount);
  })
];

export const boardById = (id: string): Board | undefined => {
  if (id === dailyBoard().id) return dailyBoard();
  return practiceBoards().find((board) => board.id === id);
};

export const movePoint = (point: Point, direction: Direction): Point => ({
  x: point.x + vectors[direction].x,
  y: point.y + vectors[direction].y
});

export const isValidPoint = (board: Board, point: Point): boolean => (
  point.x >= 0 && point.y >= 0 && point.x < board.size && point.y < board.size && !board.walls.some((wall) => equalPoint(wall, point))
);

export const routeMove = (board: Board, run: Run, direction: Direction): Run => {
  if (run.status === 'won' || run.status === 'lost' || run.status === 'paused') return run;
  const next = movePoint(run.player, direction);
  const startedRun: Run = run.status === 'ready' ? { ...run, status: 'playing', started: true } : { ...run };
  if (!isValidPoint(board, next)) return { ...startedRun, feedback: 'That route is blocked. Choose another direction.' };

  const updated: Run = {
    ...startedRun,
    player: next,
    route: [...startedRun.route, direction],
    feedback: 'Route updated.'
  };
  const relay = board.relays.find((item) => equalPoint(item, next));
  if (relay && !updated.relays.includes(relay.id)) {
    const required = board.relays[updated.relays.length];
    if (relay.id === required.id) {
      updated.relays = [...updated.relays, relay.id];
      updated.feedback = `${relay.label} connected.`;
    } else {
      updated.feedback = `${required.label} must be connected first.`;
    }
  }
  const rescue = board.rescues.find((item) => equalPoint(item, next));
  if (rescue && !updated.rescues.includes(rescue.id)) {
    updated.rescues = [...updated.rescues, rescue.id];
    updated.feedback = `${rescue.label} collected.`;
  }
  if (equalPoint(board.exit, next)) {
    if (updated.relays.length === board.relays.length) {
      updated.status = 'won';
      updated.feedback = 'Board complete. Your rally card is ready.';
    } else {
      const required = board.relays[updated.relays.length];
      updated.feedback = `The exit is locked. Connect ${required.label} next.`;
    }
  }
  return updated;
};

export const rallyCard = (board: Board, run: Run): RallyCard => {
  const quickest = shortestRouteLength(board);
  return {
    speed: Math.max(0, Math.round(run.timeRemaining)),
    elegance: Math.min(100, Math.round((quickest / Math.max(quickest, run.route.length)) * 100)),
    rescues: run.rescues.length
  };
};

const neighbors = (board: Board, point: Point): Point[] => (Object.keys(vectors) as Direction[])
  .map((direction) => movePoint(point, direction))
  .filter((next) => isValidPoint(board, next));

const distance = (board: Board, from: Point, target: Point): number => {
  const queue: Array<{ point: Point; steps: number }> = [{ point: from, steps: 0 }];
  const visited = new Set([pointKey(from)]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    if (equalPoint(current.point, target)) return current.steps;
    for (const next of neighbors(board, current.point)) {
      if (!visited.has(pointKey(next))) {
        visited.add(pointKey(next));
        queue.push({ point: next, steps: current.steps + 1 });
      }
    }
  }
  return board.size * board.size;
};

export const shortestRouteLength = (board: Board): number => {
  const stops = [board.start, ...board.relays, board.exit];
  return stops.slice(1).reduce((total, point, index) => total + distance(board, stops[index], point), 0);
};

export const encodeReplay = (boardId: string, route: Direction[]): string => `RR1:${boardId}:${route.map((direction) => replayLetters[direction]).join('')}`;

export const decodeReplay = (code: string): { boardId: string; route: Direction[] } | null => {
  const result = /^RR1:([a-z0-9-]+):([UDLR]+)$/i.exec(code.trim());
  if (!result) return null;
  const route = [...result[2].toUpperCase()].map((letter) => letterDirections[letter]);
  if (route.some((direction) => !direction)) return null;
  return { boardId: result[1], route };
};

export const replayPositions = (board: Board, route: Direction[]): Point[] => {
  let current = { ...board.start };
  const positions = [{ ...current }];
  for (const direction of route) {
    const next = movePoint(current, direction);
    if (isValidPoint(board, next)) {
      current = next;
      positions.push({ ...current });
    }
  }
  return positions;
};

export const directionFromKey = (key: string): Direction | null => {
  const normalized = key.toLowerCase();
  if (normalized === 'arrowup' || normalized === 'w') return 'up';
  if (normalized === 'arrowdown' || normalized === 's') return 'down';
  if (normalized === 'arrowleft' || normalized === 'a') return 'left';
  if (normalized === 'arrowright' || normalized === 'd') return 'right';
  return null;
};
