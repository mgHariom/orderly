
"use client";

import type { Product, OrderItem } from '@/lib/types';
import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, MinusCircle, PackagePlus, ListChecks, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface OrderCreationProps {
  products: Product[];
  onAddItemsToPendingList: (customerName: string, items: OrderItem[]) => void;
}

export default function OrderCreation({
  products,
  onAddItemsToPendingList,
}: OrderCreationProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [stagedItems, setStagedItems] = useState<OrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    products.forEach(p => {
      if (p.category) {
        categories.add(p.category);
      }
    });
    return Array.from(categories).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) {
      return []; // Or products if you want to show all by default before category selection
    }
    return products.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const handleStageItem = () => {
    if (!selectedCategory.trim()) {
      toast({ title: "Category Required", description: "Please select a category for this batch of items.", variant: "destructive" });
      return;
    }
    if (!selectedProductId) {
      toast({ title: "Select Product", description: "Please select a product to add to the batch.", variant: "destructive" });
      return;
    }
    if (quantity <= 0) {
      toast({ title: "Invalid Quantity", description: "Quantity must be greater than 0.", variant: "destructive" });
      return;
    }
    const product = filteredProducts.find(p => p.id === selectedProductId);
    if (!product) {
      toast({ title: "Error", description: "Product not found in the selected category.", variant: "destructive" });
      return;
    }

    setStagedItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => item.productId === selectedProductId);
      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += quantity;
        toast({ title: "Quantity Updated", description: `${product.name} quantity increased to ${updatedItems[existingItemIndex].quantity} in ${selectedCategory}'s batch.` });
        return updatedItems;
      } else {
        toast({ title: "Item Added to Batch", description: `${product.name} (x${quantity}) added to ${selectedCategory}'s current batch.` });
        return [...prevItems, { productId: product.id, productName: product.name, quantity, price: product.price }];
      }
    });
    setSelectedProductId(''); // Reset product selection
    setQuantity(1); // Reset quantity
  };

  const handleUpdateStagedItemQuantity = (productId: string, newQuantity: number) => {
    setStagedItems(prev => prev.map(item => item.productId === productId ? { ...item, quantity: Math.max(1, newQuantity) } : item));
  };

  const handleRemoveStagedItem = (productId: string) => {
    const item = stagedItems.find(i => i.productId === productId);
    setStagedItems(prev => prev.filter(item => item.productId !== productId));
    if (item) {
        toast({ title: "Item Removed from Batch", description: `${item.productName} removed from ${selectedCategory}'s current batch.`, variant: "destructive" });
    }
  };

  const handleAddBatchToPendingList = () => {
    if (!selectedCategory.trim()) {
      toast({ title: "Category Missing", description: "Please select a category before adding the batch.", variant: "destructive" });
      return;
    }
    if (stagedItems.length === 0) {
      toast({ title: "No Items in Batch", description: "Please add items to the current batch for this category.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    onAddItemsToPendingList(selectedCategory, stagedItems);
    // Clear staging area for the next category/batch
    setSelectedCategory(''); // Keep category or clear? Let's clear for now.
    setStagedItems([]);
    setSelectedProductId('');
    setQuantity(1);
    setIsSubmitting(false);
    // Toast for success is handled in OrderFlowApp after state update
  };

  const canDecreaseStagedQuantity = (productId: string) => {
    const item = stagedItems.find(item => item.productId === productId);
    return item ? item.quantity > 1 : false;
  }

  const stagedItemsTotal = useMemo(() => {
    return stagedItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [stagedItems]);

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setSelectedProductId(''); // Reset product selection when category changes
    // Optionally reset staged items if category changes: setStagedItems([]);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center"><PackagePlus className="mr-2 h-5 w-5 text-primary" /> Create Item Batch by Category</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 p-4 border rounded-md bg-card shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-3">
              <Label htmlFor="categorySelectStaging">Select Category (Customer Group)</Label>
              <Select value={selectedCategory} onValueChange={handleCategoryChange} disabled={isSubmitting}>
                <SelectTrigger id="categorySelectStaging">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueCategories.length > 0 ? uniqueCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  )) : <SelectItem value="no-category" disabled>No categories available (Add categories to products)</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label htmlFor="productSelectStaging">Product (from selected category)</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId} disabled={isSubmitting || !selectedCategory}>
                <SelectTrigger id="productSelectStaging" disabled={!selectedCategory || filteredProducts.length === 0}>
                  <SelectValue placeholder={selectedCategory ? "Select a product" : "Select category first"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredProducts.length > 0 ? filteredProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} (${product.price.toFixed(2)})
                    </SelectItem>
                  )) : <SelectItem value="no-product" disabled>{selectedCategory ? "No products in this category" : "Select category to see products"}</SelectItem>}
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
                disabled={isSubmitting || !selectedProductId}
              />
            </div>
          </div>
          <Button onClick={handleStageItem} className="mt-3 w-full md:w-auto" disabled={isSubmitting || filteredProducts.length === 0 || !selectedProductId || !selectedCategory.trim()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Product to {selectedCategory || "Category"}'s Batch
          </Button>
        </div>

        {stagedItems.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-2">Current Batch for Category: <span className="text-primary">{selectedCategory || "..."}</span></h3>
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
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-accent/50" onClick={() => handleUpdateStagedItemQuantity(item.productId, item.quantity - 1)} disabled={!canDecreaseStagedQuantity(item.productId) || isSubmitting}><MinusCircle className="h-4 w-4" /></Button>
                          <span className="w-6 text-center">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-accent/50" onClick={() => handleUpdateStagedItemQuantity(item.productId, item.quantity + 1)} disabled={isSubmitting}><PlusCircle className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">${item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">${(item.price * item.quantity).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveStagedItem(item.productId)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7" disabled={isSubmitting}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 space-y-2 sm:space-y-0">
                <p className="text-xl font-semibold">Batch Total for {selectedCategory || "..."}: <span className="text-accent">${stagedItemsTotal.toFixed(2)}</span></p>
                <Button onClick={handleAddBatchToPendingList} size="lg" disabled={isSubmitting || stagedItems.length === 0 || !selectedCategory.trim()}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <ListChecks className="mr-2 h-5 w-5" /> Add This Batch to Pending Orders Queue
                </Button>
            </div>
          </div>
        )}
         {stagedItems.length === 0 && selectedCategory.trim() && (
            <p className="text-muted-foreground text-center py-3 bg-muted/30 rounded-md">No items currently in the batch for category <span className="text-primary">{selectedCategory}</span>. Add products using the form above.</p>
         )}
         {stagedItems.length === 0 && !selectedCategory.trim() && (
            <p className="text-muted-foreground text-center py-3 bg-muted/30 rounded-md">Select a category and add products to start a new batch.</p>
         )}
      </CardContent>
    </Card>
  );
}

