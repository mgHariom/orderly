"use client";

import type { Product, OrderItem } from '@/lib/types';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, CheckCircle2, MinusCircle, ShoppingCart } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface OrderCreationProps {
  products: Product[];
  currentOrderItems: OrderItem[];
  customerName: string;
  onSetCustomerName: (name: string) => void;
  onAddItemToOrder: (item: { productId: string; quantity: number; }) => void;
  onUpdateItemQuantity: (productId: string, quantity: number) => void;
  onRemoveItemFromOrder: (productId: string) => void;
  orderTotal: number;
  onSaveOrder: () => void;
  isSaving: boolean;
}

export default function OrderCreation({
  products,
  currentOrderItems,
  customerName,
  onSetCustomerName,
  onAddItemToOrder,
  onUpdateItemQuantity,
  onRemoveItemFromOrder,
  orderTotal,
  onSaveOrder,
  isSaving,
}: OrderCreationProps) {
  const { toast } = useToast();
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
    onAddItemToOrder({ productId: selectedProductId, quantity });
    setSelectedProductId(''); // Reset product selection
    setQuantity(1); // Reset quantity
  };

  const handleSaveOrder = () => {
    if (!customerName.trim()) {
      toast({ title: "Customer Name Required", description: "Please enter a customer name.", variant: "destructive" });
      return;
    }
    if (currentOrderItems.length === 0) {
      toast({ title: "Empty Order", description: "Please add items to the order before saving.", variant: "destructive" });
      return;
    }
    onSaveOrder();
  };
  
  const canDecreaseQuantity = (productId: string) => {
    const item = currentOrderItems.find(item => item.productId === productId);
    return item ? item.quantity > 1 : false;
  }

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
            placeholder="Enter customer name"
            value={customerName}
            onChange={(e) => onSetCustomerName(e.target.value)}
            className="mt-1"
          />
        </div>

        <div className="space-y-3 p-4 border rounded-md bg-card shadow-sm">
          <h3 className="text-lg font-medium">Add Item to Order</h3>
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
                      {product.name} (${product.price.toFixed(2)})
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
            <PlusCircle className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Current Order Items</h3>
          {currentOrderItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-4 bg-muted/30 rounded-md">No items in current order.</p>
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
                  {currentOrderItems.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 hover:bg-accent/50"
                            onClick={() => onUpdateItemQuantity(item.productId, item.quantity - 1)} 
                            disabled={!canDecreaseQuantity(item.productId)}
                          >
                            <MinusCircle className="h-4 w-4" />
                          </Button>
                          <span className="w-6 text-center">{item.quantity}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 hover:bg-accent/50"
                            onClick={() => onUpdateItemQuantity(item.productId, item.quantity + 1)}
                          >
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">${item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">${(item.price * item.quantity).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => onRemoveItemFromOrder(item.productId)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7">
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
        <p className="text-2xl font-bold">Total: <span className="text-primary">${orderTotal.toFixed(2)}</span></p>
        <Button onClick={handleSaveOrder} size="lg" disabled={isSaving || currentOrderItems.length === 0 || !customerName.trim()}>
          <CheckCircle2 className="mr-2 h-5 w-5" /> {isSaving ? 'Saving...' : 'Complete & Save Order'}
        </Button>
      </CardFooter>
    </Card>
  );
}
