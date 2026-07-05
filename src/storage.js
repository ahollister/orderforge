import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB = './data/orders.json';

export function loadOrders() {
  if (!existsSync(DB)) return [];
  return JSON.parse(readFileSync(DB, 'utf8'));
}

export function saveOrder(order) {
  mkdirSync(dirname(DB), { recursive: true });
  const orders = loadOrders();
  orders.push(order);
  writeFileSync(DB, JSON.stringify(orders, null, 2));
}

export function loadOrder(id) {
  const orders = loadOrders();
  return orders.find((o) => o.id === id) ?? null;
}

export function updateOrder(updated) {
  mkdirSync(dirname(DB), { recursive: true });
  const orders = loadOrders();
  const idx = orders.findIndex((o) => o.id === updated.id);
  if (idx === -1) throw new Error(`order ${updated.id} not found`);
  orders[idx] = updated;
  writeFileSync(DB, JSON.stringify(orders, null, 2));
}
