
"use client";

import type { OrderItem, PendingOrder } from '@/lib/types';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, Edit, AlertCircle, MinusCircle, PlusCircle, Loader2, Info } from 'lucide-react';
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
      // Initialize with current pending items for editing
      setEditedItems(JSON.parse(JSON.stringify(order.items)));
    } else {
      setEditedItems([]);
    }
  }, [order, isOpen]);

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
    // Toast for success handled by OrderFlowApp
    // No need to setIsProcessing(false) here as dialog will close
    onOpenChange(false); // ensure dialog closes
  };

  const handleUpdatePending = () => {
    if (!order) return;
    setIsProcessing(true);
    // These are the items that will remain in the pending order, or be cleared if all quantities are 0
    const validUpdatedItems = editedItems.filter(item => item.quantity > 0);
    const itemsWithZeroQuantityCount = editedItems.filter(item => item.quantity === 0).length;
    const originalPendingItemCount = order.items.length; // Count of items currently in pending state

    onUpdatePendingQuantities(order.id, validUpdatedItems);
    
    // Toast logic based on the outcome
    if (itemsWithZeroQuantityCount > 0 && validUpdatedItems.length === 0 && originalPendingItemCount > 0) {
         toast({
            title: "Pending Order Finalized",
            description: `All items for category ${order.customerName} were accounted for. Original order details moved to past orders.`,
            variant: "default"
        });
    } else if (validUpdatedItems.length < originalPendingItemCount && validUpdatedItems.length > 0) {
         toast({
            title: "Pending Order Updated",
            description: `Pending items for ${order.customerName} updated. Some items were cleared or quantities reduced.`,
            variant: "default"
        });
    } else if (validUpdatedItems.length === originalPendingItemCount && originalPendingItemCount > 0 && JSON.stringify(editedItems) !== JSON.stringify(order.items) ) {
         toast({
            title: "Pending Order Updated",
            description: `Pending quantities for ${order.customerName} updated.`,
            variant: "default"
        });
    }
    // If no changes were made, no toast is shown by this component.
    // No need to setIsProcessing(false) here as dialog will close
    onOpenChange(false); // ensure dialog closes
  };

  const allItemsPendingZero = editedItems.every(item => item.quantity === 0);
  // Compare editedItems (new pending quantities) with order.items (current pending quantities)
  const noChangesMadeToPending = order && JSON.stringify(editedItems) === JSON.stringify(order.items);


  if (!order) return null;

  const originalOrderHasItems = order.originalItems && order.originalItems.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!isProcessing) onOpenChange(open)}}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center"><Edit className="mr-2 h-5 w-5 text-primary" />Manage Delivery for: {order.customerName}</DialogTitle>
          <DialogDescription>
            Confirm full delivery to save the original order details to "Past Orders". Alternatively, update quantities for items still pending.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4">
            <div className="p-3 mb-3 rounded-md border border-blue-500 bg-blue-500/10 text-blue-700 text-sm flex items-start gap-2">
                <Info className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                    <strong>Original Order Total: ${order.originalTotalAmount.toFixed(2)}</strong> for {order.originalItems.length} item type(s).
                    <br />
                    This original order will be saved to "Past Orders" if you mark as fully delivered or if all current pending items are zeroed out.
                </div>
            </div>
          <h4 className="font-semibold mb-2">Edit Current Pending Quantities:</h4>
          {editedItems.length > 0 ? (
            <div className="border rounded-md max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center w-2/5 sm:w-1/3">New Pending Quantity</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Original Order Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editedItems.map(item => {
                    const originalOrderItem = order.originalItems.find(oi => oi.productId === item.productId);
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
                      <TableCell className="text-right hidden sm:table-cell">{originalOrderItem?.quantity || 'N/A'}</TableCell>
                    </TableRow>
                  );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-3">This pending order currently has no items. If you confirm delivery, the original order (if any items) will be saved.</p>
          )}
        </div>

        {allItemsPendingZero && editedItems.length > 0 && (
            <div className="p-3 mb-3 rounded-md border border-yellow-500 bg-yellow-500/10 text-yellow-700 text-sm flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span>All current pending item quantities are set to 0. Clicking "Update Pending Order" will finalize this and save the original order details to "Past Orders".</span>
            </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>Cancel</Button>
          <Button
            onClick={handleUpdatePending}
            variant="secondary"
            // Disable if there are no current pending items to update OR if no changes were made to current pending items.
            disabled={ (order.items.length === 0 && !allItemsPendingZero) || isProcessing || noChangesMadeToPending }
          >
             {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
             <Edit className="mr-2 h-4 w-4" /> Update Pending Order
          </Button>
          <Button
            onClick={handleConfirmDelivery}
            className="bg-green-600 hover:bg-green-700 text-white"
            // Disable if the original order had no items to deliver
            disabled={!originalOrderHasItems || isProcessing}
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CheckCircle className="mr-2 h-4 w-4" /> Mark Fully Delivered & Save Original
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
