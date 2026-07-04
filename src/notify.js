export async function notifyOrderPlaced(order) {
  console.log(`[notify] order ${order.id} placed, total ${order.totalCents}`);
}

export async function notifyOrderCancelled(order) {
  console.log(`[notify] order ${order.id} cancelled at ${order.cancelledAt}`);
}
