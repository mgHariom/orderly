
"use client";

import type { OrderItem, PendingOrder } from '@/lib/types';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, Edit, AlertCircle, MinusCircle, PlusCircle, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface DeliveryConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  order: PendingOrder | null;
  onConfirmFullDelivery: (orderId: string) => void;
  onUpdatePendingQuantities: (orderId: string, updatedItems: OrderItem[]) => void;
}

export default function DeliveryConfirmationDialog({
  isOpen,
  onOpenChange,
  order,
  onConfirmFullDelivery,
  onUpdatePendingQuantities,
}: DeliveryConfirmationDialogProps) {
  const { toast } = useToast();
  const [editedItems, setEditedItems] = useState<OrderItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (order) {
      // Deep copy to avoid mutating the original order object
      setEditedItems(JSON.parse(JSON.stringify(order.items))); 
    } else {
      setEditedItems([]);
    }
  }, [order, isOpen]); // Re-initialize when dialog opens or order changes

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    setEditedItems(prevItems =>
      prevItems.map(item =>
        item.productId === productId ? { ...item, quantity: Math.max(0, newQuantity) } : item
      )
    );
  };

  const handleConfirmDelivery = () => {
    if (!order) return;
    setIsProcessing(true);
    onConfirmFullDelivery(order.id);
    setIsProcessing(false);
    onOpenChange(false);
    // Toast for success handled by OrderFlowApp
  };

  const handleUpdatePending = () => {
    if (!order) return;
    setIsProcessing(true);
    const validUpdatedItems = editedItems.filter(item => item.quantity > 0);
    const itemsWithZeroQuantity = editedItems.filter(item => item.quantity === 0);
    const originalItemCount = order.items.length;

    onUpdatePendingQuantities(order.id, validUpdatedItems);
    setIsProcessing(false);
    onOpenChange(false);

    if (itemsWithZeroQuantity.length > 0 && validUpdatedItems.length === 0 && originalItemCount > 0) {
         toast({
            title: "Order Cleared from Pending",
            description: `All items in ${order.customerName}'s order were set to 0 pending. The order has been cleared from the queue.`,
            variant: "default"
        });
    } else if (validUpdatedItems.length < originalItemCount && validUpdatedItems.length > 0) {
         toast({
            title: "Pending Order Updated",
            description: `Pending items for ${order.customerName} updated. Some items were cleared.`,
            variant: "default"
        });
    } else if (validUpdatedItems.length === originalItemCount && originalItemCount > 0 && JSON.stringify(editedItems) !== JSON.stringify(order.items) ) {
         toast({
            title: "Pending Order Updated",
            description: `Pending quantities for ${order.customerName} updated.`,
            variant: "default"
        });
    }
    // If no changes were made, no toast is shown.
  };
  
  const allItemsPendingZero = editedItems.every(item => item.quantity === 0);
  const noChangesMade = order && JSON.stringify(editedItems) === JSON.stringify(order.items);


  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!isProcessing) onOpenChange(open)}}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center"><Edit className="mr-2 h-5 w-5 text-primary" />Manage Delivery for: {order.customerName}</DialogTitle>
          <DialogDescription>
            Confirm if this order is fully delivered, or update the quantities for items that are still pending.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4">
          <h4 className="font-semibold mb-2">Order Items:</h4>
          {editedItems.length > 0 ? (
            <div className="border rounded-md max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center w-1/3">New Pending Quantity</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Original Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editedItems.map(item => {
                    const originalItem = order.items.find(oi => oi.productId === item.productId);
                    return (
                    <TableRow key={item.productId}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-destructive/20" onClick={() => handleQuantityChange(item.productId, item.quantity - 1)} disabled={item.quantity === 0 || isProcessing}>
                                <MinusCircle className="h-4 w-4" />
                            </Button>
                            <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value, 10) || 0)}
                                className="h-8 w-16 text-center px-1"
                                min="0"
                                disabled={isProcessing}
                            />
                            <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-primary/20" onClick={() => handleQuantityChange(item.productId, item.quantity + 1)} disabled={isProcessing}>
                                <PlusCircle className="h-4 w-4" />
                            </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">{originalItem?.quantity || 'N/A'}</TableCell>
                    </TableRow>
                  );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-3">This order has no items to process.</p>
          )}
        </div>
        
        {allItemsPendingZero && editedItems.length > 0 && (
            <div className="p-3 mb-3 rounded-md border border-yellow-500 bg-yellow-500/10 text-yellow-700 text-sm flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span>All item quantities are set to 0. Clicking "Update Pending Order" will remove this order from the queue.</span>
            </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>Cancel</Button>
          <Button 
            onClick={handleUpdatePending} 
            variant="secondary" 
            disabled={(!editedItems.length && !order.items.length) || isProcessing || noChangesMade}
          >
             {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
             <Edit className="mr-2 h-4 w-4" /> Update Pending Order
          </Button>
          <Button 
            onClick={handleConfirmDelivery} 
            className="bg-green-600 hover:bg-green-700 text-white" 
            disabled={!order.items.length || isProcessing || allItemsPendingZero} // Disable if all items are zeroed out
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CheckCircle className="mr-2 h-4 w-4" /> Mark Fully Delivered & Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
