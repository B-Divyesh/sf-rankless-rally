import assert from 'node:assert/strict';

const origin = new URL(process.argv[2] ?? 'https://rankless-rally.sociobot.in');
const includeRateLimit = process.argv.includes('--rate-limit');
const completedMoves = 'RRRRRURUUUUU';
const runId = Date.now().toString(16);

if (origin.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(origin.hostname)) {
  throw new Error('The public verifier requires HTTPS.');
}

const call = async (path, init = {}) => {
  const response = await fetch(new URL(path, origin), {
    signal: AbortSignal.timeout(10_000),
    ...init,
    headers: {
      accept: 'application/json',
      ...init.headers
    }
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { response, body };
};

const expectStatus = (result, status, label) => {
  assert.equal(
    result.response.status,
    status,
    `${label}: expected ${status}, received ${result.response.status} with ${JSON.stringify(result.body)}`
  );
};

const health = await call('/health');
expectStatus(health, 200, 'health');
assert.equal(health.body.status, 'ok');
assert.equal(health.body.database, 'ready');
assert.match(health.body.build, /^[0-9a-f]{40}$/);

const demoHeaders = {
  'x-forwarded-for': `2001:db8:1::${runId}`,
  'x-rankless-sandbox': 'demo'
};
const demo = await call('/api/replays/demo', { headers: demoHeaders });
expectStatus(demo, 200, 'demo replay');
assert.equal(demo.body.board_id, 'practice-01');
assert.equal(demo.body.moves, completedMoves);

const publicCannotReadDemo = await call(`/api/replays/${demo.body.code}`, {
  headers: { 'x-forwarded-for': `2001:db8:2::${runId}` }
});
expectStatus(publicCannotReadDemo, 404, 'public tenant reading demo replay');

const publicHeaders = {
  'content-type': 'application/json',
  'x-forwarded-for': `2001:db8:3::${runId}`
};
const incomplete = await call('/api/replays', {
  method: 'POST',
  headers: publicHeaders,
  body: JSON.stringify({ board_id: 'practice-01', moves: 'R' })
});
expectStatus(incomplete, 422, 'incomplete replay');
assert.match(incomplete.body.error, /does not complete/i);

const completed = await call('/api/replays', {
  method: 'POST',
  headers: publicHeaders,
  body: JSON.stringify({ board_id: 'practice-01', moves: completedMoves })
});
expectStatus(completed, 201, 'completed replay');
assert.match(completed.body.code, /^RR2-[A-Z0-9-]+$/);

const independent = await call(`/api/replays/${completed.body.code}`, {
  headers: { 'x-forwarded-for': `2001:db8:4::${runId}` }
});
expectStatus(independent, 200, 'independent replay read');
assert.deepEqual(independent.body, completed.body);

const demoCannotReadPublic = await call(`/api/replays/${completed.body.code}`, {
  headers: {
    'x-forwarded-for': `2001:db8:5::${runId}`,
    'x-rankless-sandbox': 'demo'
  }
});
expectStatus(demoCannotReadPublic, 404, 'demo tenant reading public replay');

if (includeRateLimit) {
  const statuses = [];
  let limitedResponse;
  const rateHeaders = { 'x-forwarded-for': `2001:db8:6::${runId}` };
  for (let request = 1; request <= 320; request += 1) {
    const result = await call(`/api/replays/RR2-RATE-${runId}-${request}`, { headers: rateHeaders });
    statuses.push(result.response.status);
    if (result.response.status === 429 && !limitedResponse) limitedResponse = result.response;
  }
  const firstLimited = statuses.indexOf(429);
  // A public proxy can replace the synthetic forwarded address. In that case,
  // the six API outcomes above and this probe correctly share one bucket.
  const priorRequestsInBucket = firstLimited === 294 ? 6 : 0;
  assert.ok(
    [294, 300].includes(firstLimited),
    `expected 300 total allowed API requests, first 429 was probe request ${firstLimited + 1}`
  );
  assert.equal(firstLimited + priorRequestsInBucket, 300);
  assert.deepEqual(statuses.slice(0, firstLimited), Array(firstLimited).fill(404));
  assert.deepEqual(statuses.slice(firstLimited), Array(320 - firstLimited).fill(429));
  assert.equal(limitedResponse?.headers.get('retry-after'), '60');
  assert.equal(limitedResponse?.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(limitedResponse?.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  console.log(`rate allowance: ${priorRequestsInBucket} validation + ${firstLimited} probe requests`);
}

console.log(JSON.stringify({
  origin: origin.origin,
  build: health.body.build,
  demo_replay: 'passed',
  incomplete_replay: 'passed',
  completed_replay: 'passed',
  tenant_isolation: 'passed',
  independent_read: 'passed',
  rate_limit: includeRateLimit ? '300 allowed, then 429 with Retry-After 60' : 'not requested',
  replay_code: completed.body.code
}, null, 2));
