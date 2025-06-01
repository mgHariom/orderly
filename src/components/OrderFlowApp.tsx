
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { Product, OrderItem, Order } from '@/lib/types';
import { getLocalStorageItem, setLocalStorageItem } from '@/lib/localStorage';
import Header from '@/components/Header';
import ProductManagement from '@/components/ProductManagement';
import OrderCreation from '@/components/OrderCreation';
import PastOrders from '@/components/PastOrders';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, PackageSearch, HistoryIcon, WorkflowIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

const PRODUCTS_STORAGE_KEY = 'orderflow-products';
const ORDERS_STORAGE_KEY = 'orderflow-orders';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export default function OrderFlowApp() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [initialAgedOrderCheckDone, setInitialAgedOrderCheckDone] = useState(false);

  // State for OrderCreation to reset itself
  const [orderCreationKey, setOrderCreationKey] = useState(Date.now());


  useEffect(() => {
    setIsClient(true);
    try {
      setProducts(getLocalStorageItem<Product[]>(PRODUCTS_STORAGE_KEY, []));
      const loadedOrders = getLocalStorageItem<Order[]>(ORDERS_STORAGE_KEY, []);
      setOrders(loadedOrders);
    } catch (error) {
      console.error("Error loading data from localStorage:", error);
      toast({ title: "Load Error", description: "Could not load saved data. Starting fresh.", variant: "destructive"});
    }
  }, [toast]);

  useEffect(() => {
    if (isClient && orders.length > 0 && !initialAgedOrderCheckDone) {
      const now = Date.now();
      orders.forEach(order => {
        try {
          const orderTimestamp = new Date(order.orderDate).getTime();
          if (now - orderTimestamp > TWENTY_FOUR_HOURS_MS) {
            toast({
              title: "Aged Order Alert",
              description: `Order for ${order.customerName} (ID: ...${order.id.slice(-6)}) placed on ${format(new Date(order.orderDate), "MMM d, yyyy 'at' h:mm a")} is older than 24 hours.`,
              variant: "default", 
              duration: 7000, 
            });
          }
        } catch (e) {
            console.error("Error parsing order date for aged check:", e, order.orderDate);
        }
      });
      setInitialAgedOrderCheckDone(true);
    }
  }, [orders, isClient, initialAgedOrderCheckDone, toast]);


  useEffect(() => {
    if(isClient) setLocalStorageItem(PRODUCTS_STORAGE_KEY, products);
  }, [products, isClient]);

  useEffect(() => {
    if(isClient) setLocalStorageItem(ORDERS_STORAGE_KEY, orders);
  }, [orders, isClient]);

  const handleAddProduct = useCallback((productData: Omit<Product, 'id' | 'category'> & { category?: string }) => {
    setProducts(prev => [...prev, { ...productData, id: crypto.randomUUID(), category: productData.category || '' }]);
    toast({ title: "Product Added", description: `${productData.name} has been added to the catalog.`});
  }, [toast]);

  const handleUpdateProduct = useCallback((updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    toast({ title: "Product Updated", description: `${updatedProduct.name} has been updated.`});
  }, [toast]);

  const handleDeleteProduct = useCallback((productId: string) => {
    const product = products.find(p => p.id === productId);
    setProducts(prev => prev.filter(p => p.id !== productId));
    toast({ title: "Product Deleted", description: `${product?.name || 'Product'} has been deleted.`, variant: "destructive" });
  }, [products, toast]);


  const handleSaveOrder = useCallback(async (orderData: { customerName: string; items: OrderItem[] }) => {
    if (!orderData.customerName.trim()) {
       toast({ title: "Customer Name Required", description: "Please enter a customer name.", variant: "destructive" });
       return;
    }
    if (orderData.items.length === 0) {
       toast({ title: "Empty Order", description: "Cannot save an empty order.", variant: "destructive" });
       return;
    }
    setIsSavingOrder(true);
    await new Promise(resolve => setTimeout(resolve, 300)); 

    const totalAmount = orderData.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    let orderCategory: string | undefined = undefined;
    for (const item of orderData.items) {
      const productDetails = products.find(p => p.id === item.productId);
      if (productDetails && productDetails.category) {
        orderCategory = productDetails.category;
        break; 
      }
    }

    const newOrder: Order = {
      id: crypto.randomUUID(),
      customerName: orderData.customerName,
      items: orderData.items,
      totalAmount: totalAmount,
      orderDate: new Date().toISOString(),
      category: orderCategory,
    };
    setOrders(prevOrders => [newOrder, ...prevOrders].sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()));
    
    setIsSavingOrder(false);
    toast({ title: "Order Saved!", description: `Order for ${newOrder.customerName} has been successfully saved.` });
    
    // Trigger re-render of OrderCreation to reset its internal state
    setOrderCreationKey(Date.now());

  }, [products, toast]);

  const handleOrderCreationReset = useCallback(() => {
    // This function is passed to OrderCreation and called internally by it after a successful save
    // to signal OrderFlowApp that it can clear relevant states or trigger resets.
    // In this new setup, we re-key OrderCreation to force a reset.
    setOrderCreationKey(Date.now());
  }, []);


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
              <PackageSearch className="mr-2 h-4 w-4" /> Manage Products
            </TabsTrigger>
            <TabsTrigger value="past-orders" className="py-2 sm:py-1.5 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
              <HistoryIcon className="mr-2 h-4 w-4" /> Past Orders
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="create-order" className="mt-0">
            <OrderCreation
              key={orderCreationKey} // Re-key to reset state after save
              products={products}
              onSaveOrder={handleSaveOrder}
              isSaving={isSavingOrder}
              onOrderSaved={handleOrderCreationReset} // Pass reset callback
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
            <PastOrders orders={orders} products={products} />
          </TabsContent>
        </Tabs>
      </main>
      <footer className="text-center p-4 text-xs text-muted-foreground border-t mt-8">
        OrderFlow &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
