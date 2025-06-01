
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
  // Product category can be looked up from Product[] using productId when needed
  // or could be denormalized here if frequently accessed without product context.
  // For now, we'll look it up.
}

export interface Order {
  id: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  orderDate: string; // ISO string format
  category?: string; // Added category for the order
}
