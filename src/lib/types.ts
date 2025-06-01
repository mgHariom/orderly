
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
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  createdAt: string; // ISO Date String
}


export interface Order {
  id: string; 
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  orderDate: string; // ISO Date String
  category?: string; 
}
