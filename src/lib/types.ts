
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

export interface PendingOrder {
  id: string;
  customerName: string; // This will store the selected category
  items: OrderItem[]; // Current pending items/quantities
  totalAmount: number; // Total for current pending items
  originalItems: OrderItem[]; // Items as originally added to the batch
  originalTotalAmount: number; // Total as originally calculated for the batch
  createdAt: string; // ISO Date String
}


export interface Order {
  id: string;
  customerName: string; // This will be the category
  items: OrderItem[];
  totalAmount: number;
  orderDate: string; // ISO Date String
  // category?: string; // customerName now serves as category for the order
}
