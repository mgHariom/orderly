
"use client";

import type { Product, OrderItem, Order } from '@/lib/types';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getLocalStorageItem, setLocalStorageItem } from '@/lib/localStorage';
import Header from '@/components/Header';
import ProductManagement from '@/components/ProductManagement';
import OrderCreation from '@/components/OrderCreation';
import PastOrders from '@/components/PastOrders';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Removed CardFooter
import { ShoppingCart, PackageSearch, HistoryIcon, UserCircle, WorkflowIcon, CheckCircle2, Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

const PRODUCTS_STORAGE_KEY = 'orderflow-products';
const ORDERS_STORAGE_KEY = 'orderflow-orders';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

interface PendingOrder {
  id: string; // Temporary client-side ID
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
}

export default function OrderFlowApp() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [stagedItems, setStagedItems] = useState<OrderItem[]>([]); // Staged items in OrderCreation, passed down

  const [isSavingOrder, setIsSavingOrder] = useState<string | null>(null); // Store ID of order being saved
  const [isClient, setIsClient] = useState(false);
  const [initialAgedOrderCheckDone, setInitialAgedOrderCheckDone] = useState(false);

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

  const handleAddItemsToPendingList = useCallback((customerName: string, itemsToAdd: OrderItem[]) => {
    if (!customerName.trim()) {
      toast({ title: "Customer Name Required", description: "Please ensure a customer name is set in the staging area.", variant: "destructive" });
      return;
    }
    if (itemsToAdd.length === 0) {
      toast({ title: "No Items Staged", description: "Please stage some items first.", variant: "destructive" });
      return;
    }

    const totalAmount = itemsToAdd.reduce((total, item) => total + (item.price * item.quantity), 0);
    const newPendingOrder: PendingOrder = {
      id: crypto.randomUUID(), // Temporary ID for client-side management
      customerName,
      items: itemsToAdd,
      totalAmount,
    };

    setPendingOrders(prev => [...prev, newPendingOrder]);
    setStagedItems([]); // Clear staged items in OrderCreation by re-passing empty array (or allow OrderCreation to clear itself)
    toast({ title: "Order Staged", description: `Order for ${customerName} with ${itemsToAdd.length} item type(s) added to pending list.` });
  }, [toast]);
  
  const handleSavePendingOrder = useCallback(async (pendingOrderId: string) => {
    const orderToSave = pendingOrders.find(po => po.id === pendingOrderId);
    if (!orderToSave) {
      toast({ title: "Error", description: "Could not find the order to save.", variant: "destructive" });
      return;
    }

    setIsSavingOrder(pendingOrderId);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate async save

    const newOrder: Order = {
      id: crypto.randomUUID(), // Generate new permanent ID
      customerName: orderToSave.customerName,
      items: orderToSave.items,
      totalAmount: orderToSave.totalAmount,
      orderDate: new Date().toISOString(),
    };
    setOrders(prevOrders => [newOrder, ...prevOrders].sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()));
    setPendingOrders(prev => prev.filter(po => po.id !== pendingOrderId));
    
    setIsSavingOrder(null);
    toast({ title: "Order Saved!", description: `Order for ${newOrder.customerName} has been successfully saved.` });
    
  }, [pendingOrders, toast]);

  const handleRemovePendingOrder = useCallback((pendingOrderId: string) => {
    const orderToRemove = pendingOrders.find(po => po.id === pendingOrderId);
    setPendingOrders(prev => prev.filter(po => po.id !== pendingOrderId));
    if (orderToRemove) {
        toast({ title: "Pending Order Removed", description: `Pending order for ${orderToRemove.customerName} has been removed.`, variant: "destructive" });
    }
  }, [pendingOrders, toast]);


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
          
          <TabsContent value="create-order" className="mt-0 space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline flex items-center"><UserCircle className="mr-2 h-5 w-5" />Pending Orders Queue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 {pendingOrders.length > 0 ? (
                  <div className="space-y-6">
                    {pendingOrders.map((pendingOrder) => (
                      <Card key={pendingOrder.id} className="bg-muted/20 shadow-md">
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg text-primary">{pendingOrder.customerName}</CardTitle>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleRemovePendingOrder(pendingOrder.id)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                                disabled={isSavingOrder === pendingOrder.id}
                            >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Remove Pending Order</span>
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1 text-sm border p-3 rounded-md bg-background">
                            {pendingOrder.items.map(item => (
                              <li key={item.productId} className="flex justify-between">
                                <span>{item.productName} (x{item.quantity})</span>
                                <span>${(item.price * item.quantity).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t">
                            <p className="font-semibold text-lg">Subtotal: <span className="text-primary">${pendingOrder.totalAmount.toFixed(2)}</span></p>
                            <Button 
                              onClick={() => handleSavePendingOrder(pendingOrder.id)} 
                              size="default" 
                              disabled={isSavingOrder === pendingOrder.id || (isSavingOrder !== null && isSavingOrder !== pendingOrder.id)}
                            >
                              <CheckCircle2 className="mr-2 h-5 w-5" /> 
                              {isSavingOrder === pendingOrder.id ? 'Saving...' : 'Save This Order'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                    <p className="text-muted-foreground text-sm text-center py-4 bg-muted/30 rounded-md">No orders currently pending. Use "Stage & Add Items" below to create new pending orders.</p>
                )}
              </CardContent>
              {/* CardFooter removed as save actions are now per pending order */}
            </Card>

            <OrderCreation
              products={products}
              onAddItemsToPendingList={handleAddItemsToPendingList} // Renamed prop
              // stagedItems is managed internally by OrderCreation now, or passed for its initial state
              // setStagedItems is managed internally by OrderCreation now
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
