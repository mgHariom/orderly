
"use client";

import type { Product, OrderItem } from '@/lib/types';
import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, MinusCircle, PackagePlus, ListChecks } from 'lucide-react'; // Changed ListPlus to ListChecks
import { useToast } from "@/hooks/use-toast";

interface OrderCreationProps {
  products: Product[];
  onAddItemsToPendingList: (customerName: string, items: OrderItem[]) => void;
  // stagedItems and setStagedItems are removed as props, managed locally
}

export default function OrderCreation({
  products,
  onAddItemsToPendingList,
}: OrderCreationProps) {
  const { toast } = useToast();
  const [currentCustomerName, setCurrentCustomerName] = useState<string>('');
  const [stagedItems, setStagedItems] = useState<OrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  const handleStageItem = () => {
    if (!currentCustomerName.trim()) {
      toast({ title: "Customer Name Required", description: "Please enter a customer name for this staging session.", variant: "destructive" });
      return;
    }
    if (!selectedProductId) {
      toast({ title: "Select Product", description: "Please select a product to stage.", variant: "destructive" });
      return;
    }
    if (quantity <= 0) {
      toast({ title: "Invalid Quantity", description: "Quantity must be greater than 0.", variant: "destructive" });
      return;
    }
    const product = products.find(p => p.id === selectedProductId);
    if (!product) {
      toast({ title: "Error", description: "Product not found.", variant: "destructive" });
      return;
    }

    setStagedItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => item.productId === selectedProductId);
      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += quantity;
        toast({ title: "Quantity Updated", description: `${product.name} quantity increased to ${updatedItems[existingItemIndex].quantity} for ${currentCustomerName}.` });
        return updatedItems;
      } else {
        toast({ title: "Item Staged", description: `${product.name} (x${quantity}) staged for ${currentCustomerName}.` });
        return [...prevItems, { productId: product.id, productName: product.name, quantity, price: product.price }];
      }
    });
    setSelectedProductId(''); 
    setQuantity(1);
  };

  const handleUpdateStagedItemQuantity = (productId: string, newQuantity: number) => {
    setStagedItems(prev => prev.map(item => item.productId === productId ? { ...item, quantity: Math.max(1, newQuantity) } : item));
  };

  const handleRemoveStagedItem = (productId: string) => {
    const item = stagedItems.find(i => i.productId === productId);
    setStagedItems(prev => prev.filter(item => item.productId !== productId));
    if (item) {
        toast({ title: "Item Unstaged", description: `${item.productName} removed from current staging area.`, variant: "destructive" });
    }
  };
  
  const handleAddAllStagedToPendingList = () => {
    if (!currentCustomerName.trim()) {
      toast({ title: "Customer Name Missing", description: "Please enter a customer name before adding to the pending list.", variant: "destructive" });
      return;
    }
    if (stagedItems.length === 0) {
      toast({ title: "No Items Staged", description: "Please stage items before adding to the pending list.", variant: "destructive" });
      return;
    }
    onAddItemsToPendingList(currentCustomerName, stagedItems);
    // Clear local state after successfully adding to pending list
    setCurrentCustomerName('');
    setStagedItems([]);
    toast({ title: "Staging Cleared", description: "Customer name and staged items cleared for next entry." });
  };
  
  const canDecreaseStagedQuantity = (productId: string) => {
    const item = stagedItems.find(item => item.productId === productId);
    return item ? item.quantity > 1 : false;
  }

  const stagedItemsTotal = useMemo(() => {
    return stagedItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [stagedItems]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center"><PackagePlus className="mr-2 h-5 w-5 text-primary" /> Stage Items for a Customer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 p-4 border rounded-md bg-card shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-3"> {/* Customer name full width */}
              <Label htmlFor="customerNameStaging">Customer Name</Label>
              <Input
                  id="customerNameStaging"
                  placeholder="Enter customer name for this batch of items"
                  value={currentCustomerName}
                  onChange={(e) => setCurrentCustomerName(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label htmlFor="productSelectStaging">Product</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger id="productSelectStaging">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.length > 0 ? products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} (${product.price.toFixed(2)}) {product.category ? `[${product.category}]` : ''}
                    </SelectItem>
                  )) : <SelectItem value="no-product" disabled>No products available</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="quantityStaging">Quantity</Label>
              <Input
                id="quantityStaging"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              />
            </div>
          </div>
          <Button onClick={handleStageItem} className="mt-3 w-full md:w-auto" disabled={products.length === 0 || !selectedProductId || !currentCustomerName.trim()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Item to This Customer's Staging Area
          </Button>
        </div>

        {stagedItems.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-2">Staged Items for: <span className="text-primary">{currentCustomerName || "..."}</span></h3>
            <div className="border rounded-md overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stagedItems.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-accent/50" onClick={() => handleUpdateStagedItemQuantity(item.productId, item.quantity - 1)} disabled={!canDecreaseStagedQuantity(item.productId)}><MinusCircle className="h-4 w-4" /></Button>
                          <span className="w-6 text-center">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-accent/50" onClick={() => handleUpdateStagedItemQuantity(item.productId, item.quantity + 1)}><PlusCircle className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">${item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">${(item.price * item.quantity).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveStagedItem(item.productId)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7"><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 space-y-2 sm:space-y-0">
                <p className="text-xl font-semibold">Staging Total for {currentCustomerName || "..."}: <span className="text-accent">${stagedItemsTotal.toFixed(2)}</span></p>
                <Button onClick={handleAddAllStagedToPendingList} size="lg" disabled={stagedItems.length === 0 || !currentCustomerName.trim()}>
                    <ListChecks className="mr-2 h-5 w-5" /> Add to Pending Orders Queue
                </Button>
            </div>
          </div>
        )}
         {stagedItems.length === 0 && (
            <p className="text-muted-foreground text-center py-3 bg-muted/30 rounded-md">No items currently staged for <span className="text-primary">{currentCustomerName || "the active customer"}</span>. Add customer name and items using the form above.</p>
         )}
      </CardContent>
    </Card>
  );
}
