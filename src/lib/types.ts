
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

export interface Order {
  id: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  orderDate: string; // ISO string format
}
