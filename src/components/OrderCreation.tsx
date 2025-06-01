
"use client";

import type { Product, OrderItem } from '@/lib/types';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, CheckCircle2, MinusCircle, ShoppingCart, PackagePlus, ChevronsRight } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface OrderCreationProps {
  products: Product[];
  currentOrderItems: OrderItem[];
  customerName: string;
  onSetCustomerName: (name: string) => void;
  onAddItemToOrder: (item: OrderItem) => void; // Changed to accept full OrderItem
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
  const [stagedItems, setStagedItems] = useState<OrderItem[]>([]);

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

    setStagedItems(prevStaged => {
      const existingItemIndex = prevStaged.findIndex(item => item.productId === selectedProductId);
      if (existingItemIndex > -1) {
        const updatedStagedItems = [...prevStaged];
        updatedStagedItems[existingItemIndex].quantity += quantity;
        toast({ title: "Staged Quantity Updated", description: `${product.name} quantity increased to ${updatedStagedItems[existingItemIndex].quantity} in staging area.` });
        return updatedStagedItems;
      } else {
        toast({ title: "Item Staged", description: `${product.name} (x${quantity}) added to staging area.` });
        return [...prevStaged, { productId: product.id, productName: product.name, quantity, price: product.price }];
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
        toast({ title: "Item Unstaged", description: `${item.productName} removed from staging area.`, variant: "destructive" });
    }
  };
  
  const handleAddStagedItemsToOrder = () => {
    if (stagedItems.length === 0) {
      toast({ title: "No Staged Items", description: "Please stage items before adding to order.", variant: "destructive" });
      return;
    }
    stagedItems.forEach(item => onAddItemToOrder(item));
    setStagedItems([]);
    toast({ title: "Items Added to Order", description: "All staged items have been added to the current order." });
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
  
  const canDecreaseQuantity = (items: OrderItem[], productId: string) => {
    const item = items.find(item => item.productId === productId);
    return item ? item.quantity > 1 : false;
  }

  const stagedOrderTotal = stagedItems.reduce((total, item) => total + (item.price * item.quantity), 0);

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

        {/* Staging Area */}
        <div className="space-y-4 p-4 border rounded-md bg-card shadow-sm">
          <h3 className="text-lg font-medium flex items-center"><PackagePlus className="mr-2 h-5 w-5 text-primary" />Stage Items for Order</h3>
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
          <Button onClick={handleStageItem} className="mt-3 w-full md:w-auto" disabled={products.length === 0 || !selectedProductId}>
            <PlusCircle className="mr-2 h-4 w-4" /> Stage This Item
          </Button>

          {stagedItems.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-md font-medium">Staged Items ({stagedItems.length}) - Total: ${stagedOrderTotal.toFixed(2)}</h4>
              <div className="border rounded-md overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
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
                            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-accent/50" onClick={() => handleUpdateStagedItemQuantity(item.productId, item.quantity - 1)} disabled={!canDecreaseQuantity(stagedItems, item.productId)}><MinusCircle className="h-3 w-3" /></Button>
                            <span className="w-5 text-center text-sm">{item.quantity}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-accent/50" onClick={() => handleUpdateStagedItemQuantity(item.productId, item.quantity + 1)}><PlusCircle className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">${(item.price * item.quantity).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveStagedItem(item.productId)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 w-6"><Trash2 className="h-3 w-3" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button onClick={handleAddStagedItemsToOrder} className="w-full mt-2" variant="secondary">
                <ChevronsRight className="mr-2 h-4 w-4" /> Add All Staged Items to Current Order ({stagedItems.length})
              </Button>
            </div>
          )}
        </div>

        {/* Current Order Items */}
        <div>
          <h3 className="text-lg font-medium mb-2">Current Order Items</h3>
          {currentOrderItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-4 bg-muted/30 rounded-md">No items in current order. Stage items above and add them.</p>
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
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-accent/50" onClick={() => onUpdateItemQuantity(item.productId, item.quantity - 1)} disabled={!canDecreaseQuantity(currentOrderItems, item.productId)}><MinusCircle className="h-4 w-4" /></Button>
                          <span className="w-6 text-center">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-accent/50" onClick={() => onUpdateItemQuantity(item.productId, item.quantity + 1)}><PlusCircle className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">${item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">${(item.price * item.quantity).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => onRemoveItemFromOrder(item.productId)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7"><Trash2 className="h-4 w-4" /></Button>
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
        <p className="text-2xl font-bold">Order Total: <span className="text-primary">${orderTotal.toFixed(2)}</span></p>
        <Button onClick={handleSaveOrder} size="lg" disabled={isSaving || currentOrderItems.length === 0 || !customerName.trim()}>
          <CheckCircle2 className="mr-2 h-5 w-5" /> {isSaving ? 'Saving...' : 'Complete & Save Order'}
        </Button>
      </CardFooter>
    </Card>
  );
}
