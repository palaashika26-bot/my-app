import type { OrderRow } from '@/lib/mockData';

export interface OrderLineItemRow {
  id: string;
  name: string;
  quantity: number;
}

export function resolveOrderFromParam(param: string, orders: OrderRow[]): OrderRow | undefined {
  const decoded = decodeURIComponent(param);
  return orders.find((o) => o.id === decoded || o.orderId === decoded);
}

/** Prefer explicit lineItems on the order; otherwise derive a single line from itemNames. */
export function getOrderLineItems(order: OrderRow): OrderLineItemRow[] {
  if (order.lineItems?.length) return order.lineItems;
  const name = order.itemNames?.trim() || 'Order items';
  return [{ id: `${order.id}-line-0`, name, quantity: order.itemCount || 1 }];
}
