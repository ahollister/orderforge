import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { cancelOrder } from '../src/orders.js';

const DB = './data/orders.json';

function seedOrders(orders) {
  mkdirSync('./data', { recursive: true });
  writeFileSync(DB, JSON.stringify(orders, null, 2));
}

function cleanDb() {
  if (existsSync(DB)) rmSync(DB);
}

// ── helpers to build test orders ──────────────────────────────────────────────

function freshOrder(overrides = {}) {
  return {
    id: 'ord-test-1',
    lines: [{ sku: 'X1', qty: 1, unitPriceCents: 100 }],
    subtotalCents: 100,
    taxCents: 8,
    discountCents: 0,
    totalCents: 108,
    status: 'placed',
    placedAt: new Date().toISOString(),   // right now → within 24 h
    ...overrides,
  };
}

function oldOrder(overrides = {}) {
  const twoDaysAgo = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
  return freshOrder({ placedAt: twoDaysAgo, ...overrides });
}

// ── tests ─────────────────────────────────────────────────────────────────────

test('cancelOrder marks a fresh order as cancelled and returns ok', async (t) => {
  t.after(cleanDb);
  seedOrders([freshOrder()]);

  const result = await cancelOrder('ord-test-1');

  assert.equal(result.ok, true);
  assert.equal(result.order.status, 'cancelled');
  assert.ok(result.order.cancelledAt, 'cancelledAt should be set');
});

test('cancelOrder refuses an order older than 24 hours with too_late', async (t) => {
  t.after(cleanDb);
  seedOrders([oldOrder()]);

  const result = await cancelOrder('ord-test-1');

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'too_late');
});

test('cancelOrder refuses an already-cancelled order', async (t) => {
  t.after(cleanDb);
  seedOrders([freshOrder({ status: 'cancelled', cancelledAt: new Date().toISOString() })]);

  const result = await cancelOrder('ord-test-1');

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'already_cancelled');
});

test('cancelOrder refuses a shipped order', async (t) => {
  t.after(cleanDb);
  seedOrders([freshOrder({ status: 'shipped' })]);

  const result = await cancelOrder('ord-test-1');

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'already_shipped');
});

test('cancelOrder persists the cancelled status to storage', async (t) => {
  t.after(cleanDb);
  seedOrders([freshOrder()]);

  await cancelOrder('ord-test-1');

  // Read back from disk to verify persistence
  const { readFileSync } = await import('node:fs');
  const orders = JSON.parse(readFileSync(DB, 'utf8'));
  const saved = orders.find((o) => o.id === 'ord-test-1');

  assert.equal(saved.status, 'cancelled');
  assert.ok(saved.cancelledAt);
});

test('cancelOrder throws when the order does not exist', async (t) => {
  t.after(cleanDb);
  seedOrders([]);

  await assert.rejects(
    () => cancelOrder('ord-missing'),
    /not found/,
  );
});
