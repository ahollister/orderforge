import { readFileSync } from 'node:fs';
import { processOrder, isEligibleForFreeShip } from './src/orders.js';

const sample = {
  id: 'ord-1001',
  lines: [
    { sku: 'A1', qty: 2, unitPriceCents: 500 },
    { sku: 'B2', qty: 1, unitPriceCents: 1200 },
  ],
};

const order = await processOrder(sample);
console.log('placed', order);

const { freeShipThresholdCents } = JSON.parse(
  readFileSync('./config/shipping.json', 'utf8'),
);
console.log('free shipping:', isEligibleForFreeShip(order, freeShipThresholdCents));
