// Isolated UI fixture, never a production API. It cannot write to the Finance ledger.
// Start with: node scripts/qa/android-launcher-server.mjs
import http from 'node:http';
const port = Number(process.env.LAUNCHER_QA_PORT ?? 8095);
let generation = 0;
let access = '';
let refresh = '';
let accessExpired = false;
let refreshExpired = false;
let currentUser = 'primary';
const users = {
  primary: { id: 990001, name: 'Pruebas Android', email: 'launcher@example.test', password: 'LauncherTest2026' },
  secondary: { id: 990002, name: 'Otra prueba Android', email: 'other@example.test', password: 'OtherTest2026' },
};
const summaries = {
  primary: { balance: 350000, income: 1200000, expense: 235000 },
  secondary: { balance: 91000, income: 400000, expense: 12000 },
};
let connectionLost = false;
let nextConfirmation = null;
let fakeMovementId = 0;
const requests = [];
const accounts = [
  { id: 1, name: 'Cuenta QA Android', type: 'BANK', currency: 'COP', active: true },
  { id: 2, name: 'Ahorro QA Android', type: 'SAVINGS', currency: 'COP', active: true },
];
const issue = () => {
  access = `fixture-access-${++generation}`;
  refresh = `fixture-refresh-${generation}`;
  accessExpired = false;
  refreshExpired = false;
  return { accessToken: access, refreshToken: refresh, tokenType: 'Bearer', expiresIn: 3600 };
};
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname.replace(/^\/api\/v1/, '');
  const reply = (status, body) => {
    if (!path.startsWith('/__qa')) requests.push({ method: req.method, path, status });
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  if (path === '/__qa/status') return reply(200, {
    requests,
    financialWrites: requests.filter((r) => r.method !== 'GET' && !r.path.startsWith('/auth/')),
    summary: summaries[currentUser],
    currentUser,
    connectionLost,
  });
  if (req.method === 'POST' && path === '/__qa/summary') {
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      const next = JSON.parse(body);
      if (![next.balance, next.income, next.expense].every(Number.isFinite)) return reply(400, {});
      summaries[currentUser] = next;
      return reply(200, summaries[currentUser]);
    } catch { return reply(400, {}); }
  }
  if (req.method === 'POST' && path === '/__qa/connection') {
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      connectionLost = JSON.parse(body).lost === true;
      return reply(200, { lost: connectionLost });
    } catch { return reply(400, {}); }
  }
  if (req.method === 'POST' && path === '/__qa/next-confirmation') {
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      const next = JSON.parse(body);
      if (!['expense', 'income'].includes(next.kind) ||
          ![next.summary?.balance, next.summary?.income, next.summary?.expense].every(Number.isFinite))
        return reply(400, {});
      nextConfirmation = { kind: next.kind, summary: next.summary };
      return reply(200, { armed: true, kind: next.kind });
    } catch { return reply(400, {}); }
  }
  if (req.method === 'POST' && path === '/__qa/expire') {
    accessExpired = true; refreshExpired = true;
    return reply(200, { expired: true });
  }
  if (req.method === 'POST' && path === '/__qa/expire-access') {
    accessExpired = true;
    return reply(200, { accessExpired: true });
  }
  let input = {};
  if (req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    try { input = body ? JSON.parse(body) : {}; } catch { return reply(400, {}); }
  }
  if (path === '/auth/login' && req.method === 'POST') {
    const match = Object.entries(users).find(([, user]) => input.email === user.email && input.password === user.password);
    if (!match) return reply(401, { message: 'Credenciales de prueba incorrectas.' });
    currentUser = match[0];
    return reply(200, issue());
  }
  if (path === '/auth/refresh' && req.method === 'POST') {
    return input.refreshToken === refresh && refresh && !refreshExpired
      ? reply(200, issue()) : reply(401, { message: 'Sesión de prueba vencida.' });
  }
  if (path === '/auth/logout' && req.method === 'POST') {
    access = ''; refresh = '';
    return reply(200, {});
  }
  if (!access || accessExpired || req.headers.authorization !== `Bearer ${access}`) return reply(401, {});
  if (req.method === 'POST' && (path === '/expenses' || path === '/incomes')) {
    const kind = path === '/expenses' ? 'expense' : 'income';
    if (!nextConfirmation || nextConfirmation.kind !== kind)
      return reply(409, { message: 'La prueba no permite registros contables sin una confirmación ficticia preparada.' });
    // A fixture-provided server response, not a parallel balance or ledger calculation.
    summaries[currentUser] = nextConfirmation.summary;
    nextConfirmation = null;
    return reply(201, { id: ++fakeMovementId });
  }
  if (req.method !== 'GET') return reply(409, { message: 'La prueba no permite registros contables.' });
  if (path === '/me') return reply(200, users[currentUser]);
  if (path === '/accounts') return reply(200, accounts);
  if (path === '/categories') return reply(200, [{ id: 1, name: 'Categoría QA', type: url.searchParams.get('type') ?? 'EXPENSE', active: true }]);
  if (path === '/dashboard/month') {
    if (connectionLost) {
      requests.push({ method: req.method, path, status: 'CONNECTION_LOST' });
      req.socket.destroy();
      return;
    }
    const summary = summaries[currentUser];
    return reply(200, {
    totalIncome: summary.income, totalExpense: summary.expense, balance: summary.balance, netCashFlow: 0,
    accounts: accounts.map((a) => ({ ...a, balance: a.id === 1 ? summary.balance : 0 })),
    assetsByCurrency: { COP: summary.balance }, liabilitiesByCurrency: {}, overdueByCurrency: {},
    netWorthByCurrency: { COP: summary.balance }, savings: [], topCategories: [], alerts: [], credits: [], recentTransactions: [],
    budgets: { totalBudgeted: 0, totalSpent: 0, remaining: 0 },
  });
  }
  if (path === '/transactions') return reply(200, { content: [], totalElements: 0, totalPages: 0, last: true });
  if (path === '/recurrences/upcoming') return reply(200, { from: new Date().toISOString().slice(0, 10), total: 0, entries: [] });
  return reply(200, []);
}).listen(port, '127.0.0.1', () => console.log(`Launcher QA fixture listening on 127.0.0.1:${port}; no real data.`));
