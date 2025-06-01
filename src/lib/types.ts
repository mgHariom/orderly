
export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface PendingOrder { // This interface might be identical to Order, but represents a different stage
  id: string; // Temporary client-side ID for pending orders
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  // Potentially add status fields here later if needed, e.g., 'pending_delivery', 'partially_delivered'
}


export interface Order {
  id: string; // Permanent ID once saved
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  orderDate: string; // ISO string format
}
