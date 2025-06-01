
"use client";

import type { Product, OrderItem } from '@/lib/types';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, MinusCircle, PackagePlus, ListPlus } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface OrderCreationProps {
  products: Product[];
  onAddStagedItemsToCurrentOrder: (items: OrderItem[]) => void;
  stagedItems: OrderItem[]; // Receive stagedItems from parent
  setStagedItems: React.Dispatch<React.SetStateAction<OrderItem[]>>; // Receive setter
}

export default function OrderCreation({
  products,
  onAddStagedItemsToCurrentOrder,
  stagedItems,
  setStagedItems,
}: OrderCreationProps) {
  const { toast } = useToast();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  const handleStageItem = () => {
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
        toast({ title: "Quantity Updated", description: `${product.name} quantity increased to ${updatedItems[existingItemIndex].quantity} in staging.` });
        return updatedItems;
      } else {
        toast({ title: "Item Staged", description: `${product.name} (x${quantity}) staged.` });
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
        toast({ title: "Item Unstaged", description: `${item.productName} removed from staging.`, variant: "destructive" });
    }
  };
  
  const handleAddAllStagedToOrder = () => {
    if (stagedItems.length === 0) {
      toast({ title: "No Items Staged", description: "Please stage items before adding to the main order.", variant: "destructive" });
      return;
    }
    onAddStagedItemsToCurrentOrder(stagedItems);
    // Staged items will be cleared by OrderFlowApp after successful addition
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
        <CardTitle className="font-headline flex items-center"><ListPlus className="mr-2 h-5 w-5" /> Stage & Add Items to Current Order</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Item Staging Area */}
        <div className="space-y-4 p-4 border rounded-md bg-card shadow-sm">
          <h3 className="text-lg font-medium flex items-center"><PackagePlus className="mr-2 h-5 w-5 text-primary" />Stage Items</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2 space-y-1">
              <Label htmlFor="productSelectStaging">Product</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger id="productSelectStaging">
                  <SelectValue placeholder="Select a product to stage" />
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
          <Button onClick={handleStageItem} className="mt-3 w-full md:w-auto" disabled={products.length === 0 || !selectedProductId}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Item to Staging Area
          </Button>
        </div>

        {/* Staged Items List */}
        {stagedItems.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-2">Staged Items</h3>
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
                <p className="text-xl font-semibold">Staging Total: <span className="text-accent">${stagedItemsTotal.toFixed(2)}</span></p>
                <Button onClick={handleAddAllStagedToOrder} size="lg" disabled={stagedItems.length === 0}>
                    <ListPlus className="mr-2 h-5 w-5" /> Add All Staged Items to Current Order
                </Button>
            </div>
          </div>
        )}
         {stagedItems.length === 0 && (
            <p className="text-muted-foreground text-center py-3 bg-muted/30 rounded-md">No items currently staged. Add items using the form above.</p>
         )}
      </CardContent>
      {/* Footer might not be needed here if OrderFlowApp handles final save total and button */}
    </Card>
  );
}
