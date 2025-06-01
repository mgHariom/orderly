"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Product, OrderItem, Order } from '@/lib/types';
import { getLocalStorageItem, setLocalStorageItem } from '@/lib/localStorage';
import Header from '@/components/Header';
import ProductManagement from '@/components/ProductManagement';
import OrderCreation from '@/components/OrderCreation';
import PastOrders from '@/components/PastOrders';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, PackagePlus, HistoryIcon, WorkflowIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

const PRODUCTS_STORAGE_KEY = 'orderflow-products';
const ORDERS_STORAGE_KEY = 'orderflow-orders';

export default function OrderFlowApp() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  const [currentOrderItems, setCurrentOrderItems] = useState<OrderItem[]>([]);
  const [currentCustomerName, setCurrentCustomerName] = useState<string>('');
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Wrapped in try-catch in case localStorage parsing fails (e.g. corrupted data)
    try {
      setProducts(getLocalStorageItem<Product[]>(PRODUCTS_STORAGE_KEY, []));
      setOrders(getLocalStorageItem<Order[]>(ORDERS_STORAGE_KEY, []));
    } catch (error) {
      console.error("Error loading data from localStorage:", error);
      toast({ title: "Load Error", description: "Could not load saved data. Starting fresh.", variant: "destructive"});
      // Optionally clear corrupted keys
      // window.localStorage.removeItem(PRODUCTS_STORAGE_KEY);
      // window.localStorage.removeItem(ORDERS_STORAGE_KEY);
    }
  }, [toast]); // Added toast to dependency array

  useEffect(() => {
    if(isClient) setLocalStorageItem(PRODUCTS_STORAGE_KEY, products);
  }, [products, isClient]);

  useEffect(() => {
    if(isClient) setLocalStorageItem(ORDERS_STORAGE_KEY, orders);
  }, [orders, isClient]);

  const handleAddProduct = useCallback((productData: Omit<Product, 'id'>) => {
    setProducts(prev => [...prev, { ...productData, id: crypto.randomUUID() }]);
  }, []);

  const handleUpdateProduct = useCallback((updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  }, []);

  const handleDeleteProduct = useCallback((productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  }, []);

  const handleAddItemToOrder = useCallback(({ productId, quantity }: { productId: string; quantity: number; }) => {
    const product = products.find(p => p.id === productId);
    if (!product) {
      toast({ title: "Error", description: "Product not found.", variant: "destructive" });
      return;
    }

    setCurrentOrderItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => item.productId === productId);
      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += quantity;
        toast({ title: "Quantity Updated", description: `${product.name} quantity increased to ${updatedItems[existingItemIndex].quantity}.` });
        return updatedItems;
      } else {
        toast({ title: "Item Added", description: `${product.name} (x${quantity}) added to order.` });
        return [...prevItems, { productId, productName: product.name, quantity, price: product.price }];
      }
    });
  }, [products, toast]);

  const handleUpdateItemQuantity = useCallback((productId: string, quantity: number) => {
    setCurrentOrderItems(prevItems => 
      prevItems.map(item => 
        item.productId === productId ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  }, []);

  const handleRemoveItemFromOrder = useCallback((productId: string) => {
    const item = currentOrderItems.find(i => i.productId === productId);
    setCurrentOrderItems(prevItems => prevItems.filter(item => item.productId !== productId));
    if (item) {
        toast({ title: "Item Removed", description: `${item.productName} removed from order.`, variant: "destructive" });
    }
  }, [currentOrderItems, toast]);

  const currentOrderTotal = useMemo(() => {
    return currentOrderItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [currentOrderItems]);

  const handleSaveOrder = useCallback(async () => {
    if (!currentCustomerName.trim()) {
       toast({ title: "Customer Name Required", description: "Please enter a customer name.", variant: "destructive" });
       return;
    }
    if (currentOrderItems.length === 0) {
       toast({ title: "Empty Order", description: "Cannot save an empty order.", variant: "destructive" });
       return;
    }
    setIsSavingOrder(true);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API call delay

    const newOrder: Order = {
      id: crypto.randomUUID(),
      customerName: currentCustomerName,
      items: currentOrderItems,
      totalAmount: currentOrderTotal,
      orderDate: new Date().toISOString(),
    };
    setOrders(prevOrders => [newOrder, ...prevOrders]);
    setCurrentOrderItems([]);
    setCurrentCustomerName('');
    setIsSavingOrder(false);
    toast({ title: "Order Saved!", description: `Order for ${newOrder.customerName} has been successfully saved.` });
  }, [currentCustomerName, currentOrderItems, currentOrderTotal, toast]);

  if (!isClient) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <div className="flex-grow container mx-auto px-4 py-8 text-center flex flex-col items-center justify-center">
          <WorkflowIcon className="h-16 w-16 text-primary mb-4 animate-pulse" />
          <p className="text-xl text-muted-foreground font-medium">Loading OrderFlow...</p>
          <p className="text-sm text-muted-foreground">Please wait a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-2 sm:px-4 py-6 sm:py-8">
        <Tabs defaultValue="create-order" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-6 h-auto sm:h-10 shadow-sm">
            <TabsTrigger value="create-order" className="py-2 sm:py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
              <ShoppingCart className="mr-2 h-4 w-4" /> Create Order
            </TabsTrigger>
            <TabsTrigger value="manage-products" className="py-2 sm:py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
              <PackagePlus className="mr-2 h-4 w-4" /> Manage Products
            </TabsTrigger>
            <TabsTrigger value="past-orders" className="py-2 sm:py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
              <HistoryIcon className="mr-2 h-4 w-4" /> Past Orders
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="create-order" className="mt-0">
            <OrderCreation
              products={products}
              currentOrderItems={currentOrderItems}
              customerName={currentCustomerName}
              onSetCustomerName={setCurrentCustomerName}
              onAddItemToOrder={handleAddItemToOrder}
              onUpdateItemQuantity={handleUpdateItemQuantity}
              onRemoveItemFromOrder={handleRemoveItemFromOrder}
              orderTotal={currentOrderTotal}
              onSaveOrder={handleSaveOrder}
              isSaving={isSavingOrder}
            />
          </TabsContent>
          <TabsContent value="manage-products" className="mt-0">
            <ProductManagement
              products={products}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
            />
          </TabsContent>
          <TabsContent value="past-orders" className="mt-0">
            <PastOrders orders={orders} />
          </TabsContent>
        </Tabs>
      </main>
      <footer className="text-center p-4 text-xs text-muted-foreground border-t mt-8">
        OrderFlow &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
