
"use client";

import type { Product, OrderItem, PendingOrder as PendingOrderType, Order as OrderType } from '@/lib/types';
import { useState, useEffect, useCallback } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { usePendingOrders } from '@/hooks/usePendingOrders';
import { useOrders } from '@/hooks/useOrders';
import Header from '@/components/Header';
import ProductManagement from '@/components/ProductManagement';
import OrderCreation from '@/components/OrderCreation';
import PastOrders from '@/components/PastOrders';
import DeliveryConfirmationDialog from '@/components/DeliveryConfirmationDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, PackageSearch, HistoryIcon, UserCircle, WorkflowIcon, Trash2, Edit, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format, Timestamp } from 'date-fns';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export default function OrderFlowApp() {
  const { toast } = useToast();

  const { products, isLoadingProducts, addProduct, updateProduct, deleteProduct } = useProducts();
  const { pendingOrders, isLoadingPendingOrders, addPendingOrder, updatePendingOrder, deletePendingOrder } = usePendingOrders();
  const { orders, isLoadingOrders, addOrder } = useOrders();
  
  const [initialAgedOrderCheckDone, setInitialAgedOrderCheckDone] = useState(false);
  const [isDeliveryDialogOpen, setIsDeliveryDialogOpen] = useState(false);
  const [selectedPendingOrderForDialog, setSelectedPendingOrderForDialog] = useState<PendingOrderType | null>(null);

  useEffect(() => {
    if (!isLoadingOrders && orders.length > 0 && !initialAgedOrderCheckDone) {
      const now = Date.now();
      orders.forEach(order => {
        try {
          // Ensure orderDate is a JS Date object for comparison
          const orderDate = order.orderDate instanceof Date ? order.orderDate : (order.orderDate as any).toDate();
          if (now - orderDate.getTime() > TWENTY_FOUR_HOURS_MS) {
            toast({
              title: "Aged Order Alert",
              description: `Order for ${order.customerName} (ID: ...${order.id.slice(-6)}) placed on ${format(orderDate, "MMM d, yyyy 'at' h:mm a")} is older than 24 hours.`,
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
  }, [orders, isLoadingOrders, initialAgedOrderCheckDone, toast]);

  const handleAddProduct = useCallback(async (productData: Omit<Product, 'id' | 'category'> & { category?: string }) => {
    try {
      await addProduct({ ...productData, category: productData.category || '' });
      // Toast is handled in useProducts hook
    } catch (error) {
      console.error("Failed to add product:", error);
    }
  }, [addProduct]);

  const handleUpdateProduct = useCallback(async (updatedProduct: Product) => {
    try {
      await updateProduct(updatedProduct);
      // Toast is handled in useProducts hook
    } catch (error) {
      console.error("Failed to update product:", error);
    }
  }, [updateProduct]);

  const handleDeleteProduct = useCallback(async (productId: string) => {
    try {
      await deleteProduct(productId);
      // Toast is handled in useProducts hook
    } catch (error) {
      console.error("Failed to delete product:", error);
    }
  }, [deleteProduct]);

  const handleAddItemsToPendingList = useCallback(async (customerName: string, itemsToAdd: OrderItem[]) => {
    if (!customerName.trim()) {
      toast({ title: "Customer Name Required", description: "Please ensure a customer name is set.", variant: "destructive" });
      return;
    }
    if (itemsToAdd.length === 0) {
      toast({ title: "No Items Staged", description: "Please stage some items first.", variant: "destructive" });
      return;
    }

    const totalAmount = itemsToAdd.reduce((total, item) => total + (item.price * item.quantity), 0);
    try {
      await addPendingOrder({
        customerName,
        items: itemsToAdd,
        totalAmount,
      });
      // Toast is handled in usePendingOrders hook
    } catch (error) {
      console.error("Failed to add to pending list:", error);
    }
  }, [addPendingOrder, toast]);
  
  const handleOpenDeliveryDialog = (pendingOrder: PendingOrderType) => {
    setSelectedPendingOrderForDialog(pendingOrder);
    setIsDeliveryDialogOpen(true);
  };

  const handleConfirmFullDelivery = useCallback(async (pendingOrderId: string) => {
    const orderToSave = pendingOrders.find(po => po.id === pendingOrderId);
    if (!orderToSave) {
      toast({ title: "Error", description: "Could not find the order to save.", variant: "destructive" });
      return;
    }

    try {
      await addOrder({
        customerName: orderToSave.customerName,
        items: orderToSave.items,
        totalAmount: orderToSave.totalAmount,
        // category determination (if any) would go here
      });
      await deletePendingOrder(pendingOrderId);
      
      toast({ title: "Order Fully Delivered!", description: `Order for ${orderToSave.customerName} marked as delivered and saved to past orders.` });
      setSelectedPendingOrderForDialog(null);
    } catch (error) {
      console.error("Error confirming full delivery:", error);
      toast({ title: "Delivery Error", description: "Could not confirm full delivery.", variant: "destructive" });
    }
  }, [pendingOrders, addOrder, deletePendingOrder, toast]);

  const handleUpdatePendingOrderQuantities = useCallback(async (pendingOrderId: string, updatedItems: OrderItem[]) => {
    const orderToUpdate = pendingOrders.find(po => po.id === pendingOrderId);
    if (!orderToUpdate) return;

    try {
      if (updatedItems.length === 0) { // All items were set to 0 quantity
        await deletePendingOrder(pendingOrderId);
        toast({
            title: "Order Cleared",
            description: `All items in ${orderToUpdate.customerName}'s order were set to 0 pending. The order has been cleared from the queue.`,
        });
      } else {
        const newTotalAmount = updatedItems.reduce((total, item) => total + (item.price * item.quantity), 0);
        await updatePendingOrder({ id: pendingOrderId, items: updatedItems, totalAmount: newTotalAmount });
         // Toast is handled in DeliveryConfirmationDialog for this case
      }
      setSelectedPendingOrderForDialog(null);
    } catch (error) {
      console.error("Error updating pending quantities:", error);
      toast({ title: "Update Error", description: "Could not update pending quantities.", variant: "destructive" });
    }
  }, [pendingOrders, updatePendingOrder, deletePendingOrder, toast]);

  const handleRemovePendingOrder = useCallback(async (pendingOrderId: string) => {
    const orderToRemove = pendingOrders.find(po => po.id === pendingOrderId);
    if (!orderToRemove) return;
    try {
      await deletePendingOrder(pendingOrderId);
      toast({ title: "Pending Order Removed", description: `Pending order for ${orderToRemove.customerName} has been removed.`, variant: "destructive" });
    } catch (error) {
      console.error("Error removing pending order:", error);
      toast({ title: "Removal Error", description: "Could not remove pending order.", variant: "destructive" });
    }
  }, [pendingOrders, deletePendingOrder, toast]);

  if (isLoadingProducts || isLoadingPendingOrders || isLoadingOrders) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <div className="flex-grow container mx-auto px-4 py-8 text-center flex flex-col items-center justify-center">
          <Loader2 className="h-16 w-16 text-primary mb-4 animate-spin" />
          <p className="text-xl text-muted-foreground font-medium">Loading OrderFlow Data...</p>
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
                            >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Remove Pending Order</span>
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-1 text-sm border p-3 rounded-md bg-background mb-3">
                            {pendingOrder.items.map(item => (
                              <li key={item.productId} className="flex justify-between">
                                <span>{item.productName} (x{item.quantity})</span>
                                <span>${(item.price * item.quantity).toFixed(2)}</span>
                              </li>
                            ))}
                             {pendingOrder.items.length === 0 && <li className="text-muted-foreground text-center">No items pending for this order.</li>}
                          </ul>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t">
                            <p className="font-semibold text-lg">Subtotal: <span className="text-primary">${pendingOrder.totalAmount.toFixed(2)}</span></p>
                            <Button 
                              onClick={() => handleOpenDeliveryDialog(pendingOrder)} 
                              size="default"
                              disabled={pendingOrder.items.length === 0}
                            >
                              <Edit className="mr-2 h-5 w-5" /> 
                              Process Delivery
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                    <p className="text-muted-foreground text-sm text-center py-4 bg-muted/30 rounded-md">No orders currently pending. Use "Create Item Batch" below to add new orders to the queue.</p>
                )}
              </CardContent>
            </Card>

            <OrderCreation
              products={products}
              onAddItemsToPendingList={handleAddItemsToPendingList}
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
        Orderly &copy; {new Date().getFullYear()}
      </footer>
      <DeliveryConfirmationDialog
        isOpen={isDeliveryDialogOpen}
        onOpenChange={setIsDeliveryDialogOpen}
        order={selectedPendingOrderForDialog}
        onConfirmFullDelivery={handleConfirmFullDelivery}
        onUpdatePendingQuantities={handleUpdatePendingOrderQuantities}
      />
    </div>
  );
}
