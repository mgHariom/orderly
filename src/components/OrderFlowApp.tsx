
"use client";

import type { Product, OrderItem, Order } from '@/lib/types';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getLocalStorageItem, setLocalStorageItem } from '@/lib/localStorage';
import Header from '@/components/Header';
import ProductManagement from '@/components/ProductManagement';
import OrderCreation from '@/components/OrderCreation';
import PastOrders from '@/components/PastOrders';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, PackageSearch, HistoryIcon, UserCircle, WorkflowIcon, CheckCircle2, ListPlus } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

const PRODUCTS_STORAGE_KEY = 'orderflow-products';
const ORDERS_STORAGE_KEY = 'orderflow-orders';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export default function OrderFlowApp() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // State for the order currently being built
  const [currentCustomerName, setCurrentCustomerName] = useState<string>('');
  const [currentItems, setCurrentItems] = useState<OrderItem[]>([]); // Items added to the actual order
  const [stagedItems, setStagedItems] = useState<OrderItem[]>([]); // Items staged in OrderCreation

  const [isSavingOrder, setIsSavingOrder] = useState(false);
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

  const handleAddStagedItemsToCurrentOrder = useCallback((itemsToAdd: OrderItem[]) => {
    if (itemsToAdd.length === 0) {
      toast({ title: "No Items Staged", description: "Please stage some items first.", variant: "destructive" });
      return;
    }
    setCurrentItems(prevCurrentItems => {
      const updatedItems = [...prevCurrentItems];
      itemsToAdd.forEach(stagedItem => {
        const existingItemIndex = updatedItems.findIndex(item => item.productId === stagedItem.productId);
        if (existingItemIndex > -1) {
          updatedItems[existingItemIndex].quantity += stagedItem.quantity;
        } else {
          updatedItems.push({...stagedItem});
        }
      });
      return updatedItems;
    });
    setStagedItems([]); // Clear staged items after adding them
    toast({ title: "Items Added to Order", description: `${itemsToAdd.length} item(s)/type(s) added to the current order.` });
  }, [toast]);

  const handleSaveCurrentOrder = useCallback(async () => {
    if (!currentCustomerName.trim()) {
       toast({ title: "Customer Name Required", description: "Please enter a customer name.", variant: "destructive" });
       return;
    }
    if (currentItems.length === 0) {
       toast({ title: "Empty Order", description: "Cannot save an empty order. Add items first.", variant: "destructive" });
       return;
    }
    setIsSavingOrder(true);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate async save

    const totalAmount = currentItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    
    const newOrder: Order = {
      id: crypto.randomUUID(),
      customerName: currentCustomerName,
      items: currentItems,
      totalAmount: totalAmount,
      orderDate: new Date().toISOString(),
    };
    setOrders(prevOrders => [newOrder, ...prevOrders].sort((a,b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()));
    
    setIsSavingOrder(false);
    toast({ title: "Order Saved!", description: `Order for ${newOrder.customerName} has been successfully saved.` });
    
    // Reset for next order
    setCurrentCustomerName('');
    setCurrentItems([]);
    setStagedItems([]); // Also clear any remaining staged items, though should be clear
  }, [currentCustomerName, currentItems, toast]);

  const currentOrderTotal = useMemo(() => {
    return currentItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [currentItems]);


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
                <CardTitle className="font-headline flex items-center"><UserCircle className="mr-2 h-5 w-5" />Customer & Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Enter customer name for this order"
                  value={currentCustomerName}
                  onChange={(e) => setCurrentCustomerName(e.target.value)}
                />
                 {currentItems.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Current Order Items for: <span className="text-primary">{currentCustomerName || "..."}</span></h3>
                    <ul className="space-y-1 text-sm border p-3 rounded-md bg-muted/20">
                      {currentItems.map(item => (
                        <li key={item.productId} className="flex justify-between">
                          <span>{item.productName} (x{item.quantity})</span>
                          <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-right font-semibold mt-2">Subtotal: ${currentOrderTotal.toFixed(2)}</p>
                  </div>
                )}
                {currentItems.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-2">No items added to the current order yet. Use "Stage & Add Items" below.</p>
                )}
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 pt-4 border-t bg-muted/20">
                 <p className="text-2xl font-bold">Order Total: <span className="text-primary">${currentOrderTotal.toFixed(2)}</span></p>
                 <Button onClick={handleSaveCurrentOrder} size="lg" disabled={isSavingOrder || currentItems.length === 0 || !currentCustomerName.trim()}>
                    <CheckCircle2 className="mr-2 h-5 w-5" /> {isSavingOrder ? 'Saving...' : 'Save This Order'}
                </Button>
              </CardFooter>
            </Card>

            <OrderCreation
              products={products}
              onAddStagedItemsToCurrentOrder={handleAddStagedItemsToCurrentOrder}
              stagedItems={stagedItems} // Pass stagedItems state
              setStagedItems={setStagedItems} // Pass setter for stagedItems
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
