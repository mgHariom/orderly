
"use client";

import type { Product, OrderItem } from '@/lib/types';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, CheckCircle2, MinusCircle, ShoppingCart, PackagePlus } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface OrderCreationProps {
  products: Product[];
  onSaveOrder: (orderData: { customerName: string; items: OrderItem[] }) => Promise<void>; // Changed to pass customerName and items
  isSaving: boolean;
  onOrderSaved: () => void; // Callback to reset form after successful save
}

export default function OrderCreation({
  products,
  onSaveOrder,
  isSaving,
  onOrderSaved,
}: OrderCreationProps) {
  const { toast } = useToast();
  const [customerName, setCustomerName] = useState<string>('');
  const [currentItems, setCurrentItems] = useState<OrderItem[]>([]);
  
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  const handleAddItem = () => {
    if (!selectedProductId) {
      toast({ title: "Select Product", description: "Please select a product to add.", variant: "destructive" });
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

    setCurrentItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => item.productId === selectedProductId);
      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += quantity;
        toast({ title: "Quantity Updated", description: `${product.name} quantity increased to ${updatedItems[existingItemIndex].quantity}.` });
        return updatedItems;
      } else {
        toast({ title: "Item Added", description: `${product.name} (x${quantity}) added to order.` });
        return [...prevItems, { productId: product.id, productName: product.name, quantity, price: product.price }];
      }
    });
    setSelectedProductId(''); 
    setQuantity(1);
  };

  const handleUpdateItemQuantity = (productId: string, newQuantity: number) => {
    setCurrentItems(prev => prev.map(item => item.productId === productId ? { ...item, quantity: Math.max(1, newQuantity) } : item));
  };

  const handleRemoveItem = (productId: string) => {
    const item = currentItems.find(i => i.productId === productId);
    setCurrentItems(prev => prev.filter(item => item.productId !== productId));
    if (item) {
        toast({ title: "Item Removed", description: `${item.productName} removed from order.`, variant: "destructive" });
    }
  };
  
  const handleSaveCurrentOrder = async () => {
    if (!customerName.trim()) {
      toast({ title: "Customer Name Required", description: "Please enter a customer name.", variant: "destructive" });
      return;
    }
    if (currentItems.length === 0) {
      toast({ title: "Empty Order", description: "Please add items to the order before saving.", variant: "destructive" });
      return;
    }
    await onSaveOrder({ customerName, items: currentItems });
    // Resetting state is now handled by onOrderSaved callback if save was successful
  };

  useEffect(() => {
    if (!isSaving && customerName === '' && currentItems.length === 0) {
      // This implies a save was successful and onOrderSaved was called, or initial state.
    }
  }, [isSaving, customerName, currentItems]);
  
  const canDecreaseQuantity = (items: OrderItem[], productId: string) => {
    const item = items.find(item => item.productId === productId);
    return item ? item.quantity > 1 : false;
  }

  const currentOrderTotal = useMemo(() => {
    return currentItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [currentItems]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center"><ShoppingCart className="mr-2 h-5 w-5" /> Create New Order</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="customerName" className="font-medium">Customer Name</Label>
          <Input
            id="customerName"
            placeholder="Enter customer name for this order"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="mt-1"
          />
        </div>

        {/* Item Addition Area */}
        <div className="space-y-4 p-4 border rounded-md bg-card shadow-sm">
          <h3 className="text-lg font-medium flex items-center"><PackagePlus className="mr-2 h-5 w-5 text-primary" />Add Items to Order</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2 space-y-1">
              <Label htmlFor="productSelect">Product</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger id="productSelect">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.length > 0 ? products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} (${product.price.toFixed(2)}) {product.category ? `[${product.category}]` : ''}
                    </SelectItem>
                  )) : <SelectItem value="no-product" disabled>No products available in catalog</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              />
            </div>
          </div>
          <Button onClick={handleAddItem} className="mt-3 w-full md:w-auto" disabled={products.length === 0 || !selectedProductId}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Item to This Order
          </Button>
        </div>

        {/* Current Order Items Being Built */}
        <div>
          <h3 className="text-lg font-medium mb-2">Order for: <span className="text-primary">{customerName || "..."}</span></h3>
          {currentItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-4 bg-muted/30 rounded-md">No items in this order yet. Add items above.</p>
          ) : (
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
                  {currentItems.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-accent/50" onClick={() => handleUpdateItemQuantity(item.productId, item.quantity - 1)} disabled={!canDecreaseQuantity(currentItems, item.productId)}><MinusCircle className="h-4 w-4" /></Button>
                          <span className="w-6 text-center">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-accent/50" onClick={() => handleUpdateItemQuantity(item.productId, item.quantity + 1)}><PlusCircle className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">${item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">${(item.price * item.quantity).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.productId)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7"><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 pt-4 border-t bg-muted/20">
        <p className="text-2xl font-bold">Order Total: <span className="text-primary">${currentOrderTotal.toFixed(2)}</span></p>
        <Button onClick={handleSaveCurrentOrder} size="lg" disabled={isSaving || currentItems.length === 0 || !customerName.trim()}>
          <CheckCircle2 className="mr-2 h-5 w-5" /> {isSaving ? 'Saving...' : 'Save This Order'}
        </Button>
      </CardFooter>
    </Card>
  );
}
