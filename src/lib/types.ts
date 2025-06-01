
import type { Timestamp } from 'firebase/firestore';

export interface Product {
  id: string; // Firestore document ID
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
  id: string; // Firestore document ID
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  createdAt: Timestamp | Date; // Firestore Timestamp or JS Date
}


export interface Order {
  id: string; // Firestore document ID
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  orderDate: Timestamp | Date; // Firestore Timestamp or JS Date
  category?: string; // Optional category for the order
}
