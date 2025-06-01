
"use client";

import type { Order, Product } from '@/lib/types'; // Added Product
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { format, isValid, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Filter, XCircle, History, PackageOpen, Tag } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Badge } from '@/components/ui/badge'; // Added Badge import

interface PastOrdersProps {
  orders: Order[];
  products: Product[]; // Added products to look up categories if needed for display
}

export default function PastOrders({ orders, products }: PastOrdersProps) {
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const availableCategories = useMemo(() => {
    if (!isClient) return [];
    const categories = new Set<string>();
    orders.forEach(order => {
      if (order.category) {
        categories.add(order.category);
      }
    });
    // Also consider categories directly from products if orders don't have them yet
    // or for a more comprehensive list.
    // For now, focusing on categories present in saved orders.
    return Array.from(categories).sort();
  }, [orders, isClient]);

  const filteredOrders = useMemo(() => {
    if (!isClient) return [];
    return orders.filter(order => {
      const customerMatch = filterCustomer ? order.customerName.toLowerCase().includes(filterCustomer.toLowerCase()) : true;
      const categoryMatch = filterCategory ? order.category === filterCategory : true;
      let dateMatch = true;
      if (filterDate) {
        try {
          const orderDateParsed = parseISO(order.orderDate);
          if (isValid(orderDateParsed)) {
            dateMatch = format(orderDateParsed, 'yyyy-MM-dd') === format(filterDate, 'yyyy-MM-dd');
          } else {
            dateMatch = false; 
          }
        } catch (e) {
          dateMatch = false; 
        }
      }
      return customerMatch && dateMatch && categoryMatch;
    }).sort((a,b) => {
        try {
            return parseISO(b.orderDate).getTime() - parseISO(a.orderDate).getTime();
        } catch (e) {
            return 0;
        }
    });
  }, [orders, filterCustomer, filterDate, filterCategory, isClient]);

  const clearFilters = () => {
    setFilterCustomer('');
    setFilterDate(undefined);
    setFilterCategory('');
  };
  
  if (!isClient) {
     return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><History className="mr-2 h-5 w-5" /> Past Orders</CardTitle>
          <CardDescription>Loading order history...</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-center py-10 text-muted-foreground">
                <PackageOpen className="mx-auto h-12 w-12 mb-2" />
                <p>Loading orders...</p>
            </div>
        </CardContent>
      </Card>
     );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center"><History className="mr-2 h-5 w-5" /> Past Orders</CardTitle>
        <CardDescription>Review and filter previously saved orders.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 border rounded-md bg-card shadow-sm">
          <div>
            <Label htmlFor="filterCustomerName" className="sr-only">Filter by Customer Name</Label>
            <Input
              id="filterCustomerName"
              placeholder="Filter by customer name..."
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
           <Label htmlFor="filterDate" className="sr-only">Filter by Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="filterDate"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filterDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterDate ? format(filterDate, "PPP") : <span>Filter by date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filterDate}
                  onSelect={setFilterDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="filterCategory" className="sr-only">Filter by Category</Label>
            <select
                id="filterCategory"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <option value="">All Categories</option>
                {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                ))}
            </select>
          </div>

          {(filterCustomer || filterDate || filterCategory) && (
            <Button onClick={clearFilters} variant="ghost" className="text-muted-foreground hover:text-destructive md:col-span-3 md:justify-self-end">
               <XCircle className="mr-2 h-4 w-4" /> Clear All Filters
            </Button>
          )}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground bg-muted/30 rounded-md">
            <PackageOpen className="mx-auto h-12 w-12 mb-2" />
            <p className="text-lg font-medium">
              {orders.length === 0 ? "No orders have been saved yet." : "No orders match your current filters."}
            </p>
            {orders.length > 0 && <p>Try adjusting or clearing your filters.</p>}
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full space-y-2">
            {filteredOrders.map(order => (
              <AccordionItem value={order.id} key={order.id} className="bg-card border rounded-md shadow-sm hover:shadow-md transition-shadow data-[state=open]:shadow-lg">
                <AccordionTrigger className="px-4 py-3 hover:bg-accent/10 rounded-t-md text-left">
                  <div className="flex flex-col sm:flex-row justify-between w-full sm:items-center gap-1 sm:gap-2">
                    <div className="flex flex-col items-start">
                        <span className="font-medium text-primary text-base">{order.customerName}</span>
                        {order.category && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                                <Tag className="mr-1 h-3 w-3" />
                                {order.category}
                            </Badge>
                        )}
                    </div>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {isValid(parseISO(order.orderDate)) ? format(parseISO(order.orderDate), "MMM d, yyyy - h:mm a") : 'Invalid Date'}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 py-3 border-t bg-background/50 rounded-b-md">
                  <ul className="space-y-1.5 text-sm mb-3">
                    {order.items.map(item => (
                      <li key={item.productId} className="flex justify-between items-center pb-1 border-b border-dashed last:border-b-0 last:pb-0">
                        <span>{item.productName} <span className="text-muted-foreground text-xs">(x{item.quantity})</span></span>
                        <span className="font-mono">${(item.price * item.quantity).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-right font-semibold text-base pt-2 border-t">Total: <span className="text-primary">${order.totalAmount.toFixed(2)}</span></p>
                  {/* Optional: Display Order ID or other details here */}
                  {/* <p className="text-xs text-muted-foreground mt-1">Order ID: ...{order.id.slice(-6)}</p> */}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
