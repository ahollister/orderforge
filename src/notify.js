export async function notifyOrderPlaced(order) {
  console.log(`[notify] order ${order.id} placed, total ${order.totalCents}`);
}
