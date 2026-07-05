import { processOrder, isEligibleForFreeShip, cancelOrder } from './src/orders.js';

const action = process.argv[2]; // 'place' | 'cancel'

if (action === 'cancel') {
  const orderId = process.argv[3];
  if (!orderId) {
    console.error('usage: node index.js cancel <orderId>');
    process.exit(1);
  }
  const result = await cancelOrder(orderId);
  if (result.ok) {
    console.log('cancelled', result.order);
  } else {
    console.log('cannot cancel:', result.reason);
  }
} else {
  // default: place a sample order
  const sample = {
    id: 'ord-1001',
    lines: [
      { sku: 'A1', qty: 2, unitPriceCents: 500 },
      { sku: 'B2', qty: 1, unitPriceCents: 1200 },
    ],
  };

  const order = await processOrder(sample);
  console.log('placed', order);
  console.log('free shipping:', isEligibleForFreeShip(order));
}
