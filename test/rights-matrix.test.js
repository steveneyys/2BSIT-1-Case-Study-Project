'use strict';

// S2-DEV-08: every Add / Edit / Delete (and Restore) route in the Customer and Product modules is checked per action.
// The routers are loaded with a tiny stand-in for express that records each route's middleware chain; the chain is then
// run with different people. No server or database is needed, and the test also works when express is installed.
const test = require('node:test');
const assert = require('node:assert');
const Module = require('node:module');
const { createPermissions } = require('../src/services/permissions');

function fakeExpress() {
  const routes = [];
  const uses = [];
  const router = { use: (...fns) => uses.push(...fns) };
  for (const method of ['get', 'post', 'put', 'delete', 'patch']) {
    router[method] = (path, ...fns) => routes.push({ method: method.toUpperCase(), path, fns });
  }
  const express = { Router: () => router };
  return { express, routes, uses };
}

function load(file) {
  const fake = fakeExpress();
  const original = Module._load;
  Module._load = function (request, ...rest) { return request === 'express' ? fake.express : original.call(this, request, ...rest); };
  try {
    const resolved = require.resolve(file);
    delete require.cache[resolved];
    const build = require(resolved);
    return { fake, build };
  } finally {
    Module._load = original;
  }
}

const perms = (rights) => createPermissions({ db: {}, repo: { listUserRights: async () => rights } });
const person = (role) => ({ user_id: 7, email: 'u@x.test', role, is_blocked: false, status: 'active' });

// Runs every middleware except the final handler. Result: 'pass', or the HTTP status that stopped it.
async function runChain(chain, req) {
  for (const fn of chain.slice(0, -1)) {
    const outcome = await new Promise((resolve) => {
      const res = { status(code) { this.code = code; return this; }, json() { resolve(this.code); } };
      fn(req, res, (err) => resolve(err ? 'error' : 'next'));
    });
    if (outcome !== 'next') return outcome;
  }
  return 'pass';
}

const MODULES = [
  {
    name: 'customers', file: '../src/routes/customers', all: ['CUST_ADD', 'CUST_EDIT', 'CUST_DELETE'],
    routes: [
      ['POST', '/', 'CUST_ADD'], ['PUT', '/:code', 'CUST_EDIT'], ['DELETE', '/:code', 'CUST_DELETE'], ['POST', '/:code/restore', 'ADMIN'],
    ],
  },
  {
    name: 'products', file: '../src/routes/products', all: ['PROD_ADD', 'PROD_EDIT', 'PROD_DELETE', 'PRICE_ADD', 'PRICE_EDIT', 'PRICE_DELETE'],
    routes: [
      ['POST', '/', 'PROD_ADD'], ['PUT', '/:code', 'PROD_EDIT'], ['DELETE', '/:code', 'PROD_DELETE'], ['POST', '/:code/restore', 'ADMIN'],
      ['POST', '/:code/prices', 'PRICE_ADD'], ['PUT', '/:code/prices/:effdate', 'PRICE_EDIT'], ['DELETE', '/:code/prices/:effdate', 'PRICE_DELETE'],
    ],
  },
];

for (const mod of MODULES) {
  test(`${mod.name}: every change route is guarded, and nothing guards more or less than listed`, () => {
    const { fake, build } = load(mod.file);
    build({}, perms([]));
    const changing = fake.routes.filter((r) => r.method !== 'GET');
    assert.deepStrictEqual(
      changing.map((r) => `${r.method} ${r.path}`).sort(),
      mod.routes.map(([m, p]) => `${m} ${p}`).sort(),
      'a route was added or removed: add it to this matrix with the right it needs'
    );
    for (const r of changing) assert.ok(r.fns.length >= 2, `${r.method} ${r.path} has no guard in front of its handler`);
    assert.ok(fake.uses.length >= 2, 'the module gate (sign-in + any module right) must be on the whole router');
  });

  for (const [method, path, needs] of mod.routes) {
    test(`${mod.name}: ${method} ${path} needs ${needs === 'ADMIN' ? 'an Admin' : needs}`, async () => {
      const outcome = async (rights, role, signedIn = true) => {
        const { fake, build } = load(mod.file);
        build({}, perms(rights));
        const route = fake.routes.find((r) => r.method === method && r.path === path);
        return runChain([...fake.uses, ...route.fns], signedIn ? { user: person(role) } : {});
      };
      assert.strictEqual(await outcome([], 'user', false), 401, 'signed out');
      assert.strictEqual(await outcome([], 'user'), 403, 'no rights at all');
      assert.strictEqual(await outcome(mod.all.filter((c) => c !== needs), 'user'), 403, 'every other right but not this one');
      if (needs === 'ADMIN') {
        assert.strictEqual(await outcome(mod.all, 'user'), 403, 'holding every right is still not an Admin');
        assert.strictEqual(await outcome([], 'admin'), 'pass');
        assert.strictEqual(await outcome([], 'superadmin'), 'pass');
      } else {
        assert.strictEqual(await outcome([needs], 'user'), 'pass', 'exactly this right is enough');
        assert.strictEqual(await outcome([], 'admin'), 'pass');
      }
    });
  }
}

test('reading is open to anyone holding at least one right of the module, and to nobody else', async () => {
  for (const mod of MODULES) {
    for (const right of mod.all) {
      const { fake, build } = load(mod.file);
      build({}, perms([right]));
      const get = fake.routes.find((r) => r.method === 'GET' && r.path === '/');
      assert.strictEqual(await runChain([...fake.uses, ...get.fns], { user: person('user') }), 'pass', `${mod.name} ${right}`);
    }
    const { fake, build } = load(mod.file);
    build({}, perms(['HR_ADD', 'USER_VIEW']));
    const get = fake.routes.find((r) => r.method === 'GET' && r.path === '/');
    assert.strictEqual(await runChain([...fake.uses, ...get.fns], { user: person('user') }), 403, `${mod.name} with other modules' rights`);
  }
});
