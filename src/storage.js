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
