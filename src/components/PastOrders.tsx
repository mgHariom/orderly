
"use client";

import type { Order } from '@/lib/types';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { format, isValid, parseISO, isDate } from "date-fns"; // Added isDate
import { Calendar as CalendarIcon, XCircle, History, PackageOpen } from 'lucide-react';
import { cn } from "@/lib/utils";
import type { Timestamp } from 'firebase/firestore';

interface PastOrdersProps {
  orders: Order[];
}

export default function PastOrders({ orders }: PastOrdersProps) {
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const customerMatch = filterCustomer ? order.customerName.toLowerCase().includes(filterCustomer.toLowerCase()) : true;
      
      let dateMatch = true;
      if (filterDate) {
        try {
          // order.orderDate can be Date or Firestore Timestamp from the hook, or string initially
          let orderDateToCompare: Date;
          if (isDate(order.orderDate)) {
            orderDateToCompare = order.orderDate as Date;
          } else if (order.orderDate && typeof (order.orderDate as Timestamp).toDate === 'function') {
             orderDateToCompare = (order.orderDate as Timestamp).toDate();
          } else if (typeof order.orderDate === 'string') {
            orderDateToCompare = parseISO(order.orderDate as string);
          } else {
             // If it's an unrecognized format, assume it doesn't match or handle as error
             dateMatch = false;
             return customerMatch && dateMatch;
          }

          if (isValid(orderDateToCompare)) {
            dateMatch = format(orderDateToCompare, 'yyyy-MM-dd') === format(filterDate, 'yyyy-MM-dd');
          } else {
            dateMatch = false; 
          }
        } catch (e) {
          console.error("Error parsing order date for filtering:", e, order.orderDate);
          dateMatch = false; 
        }
      }
      return customerMatch && dateMatch;
    }).sort((a,b) => {
        try {
            const dateA = isDate(a.orderDate) ? (a.orderDate as Date) : ((a.orderDate as Timestamp)?.toDate ? (a.orderDate as Timestamp).toDate() : parseISO(a.orderDate as string));
            const dateB = isDate(b.orderDate) ? (b.orderDate as Date) : ((b.orderDate as Timestamp)?.toDate ? (b.orderDate as Timestamp).toDate() : parseISO(b.orderDate as string));
            return dateB.getTime() - dateA.getTime();
        } catch (e) {
            return 0;
        }
    });
  }, [orders, filterCustomer, filterDate]);

  const clearFilters = () => {
    setFilterCustomer('');
    setFilterDate(undefined);
  };
  
  const getDisplayDate = (orderDateValue: Date | Timestamp | string): string => {
    try {
      if (isDate(orderDateValue)) {
        return format(orderDateValue as Date, "MMM d, yyyy - h:mm a");
      }
      if (orderDateValue && typeof (orderDateValue as Timestamp).toDate === 'function') {
        return format((orderDateValue as Timestamp).toDate(), "MMM d, yyyy - h:mm a");
      }
      if (typeof orderDateValue === 'string') {
        const parsed = parseISO(orderDateValue);
        if (isValid(parsed)) {
          return format(parsed, "MMM d, yyyy - h:mm a");
        }
      }
      return 'Invalid Date';
    } catch (e) {
      return 'Invalid Date';
    }
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center"><History className="mr-2 h-5 w-5" /> Past Orders</CardTitle>
        <CardDescription>Review and filter previously saved orders.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 border rounded-md bg-card shadow-sm">
          <div>
            <Label htmlFor="filterCustomerNamePast" className="sr-only">Filter by Customer Name</Label>
            <Input
              id="filterCustomerNamePast"
              placeholder="Filter by customer name..."
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
           <Label htmlFor="filterDatePast" className="sr-only">Filter by Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="filterDatePast"
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
          
          {(filterCustomer || filterDate) && (
            <Button onClick={clearFilters} variant="ghost" className="text-muted-foreground hover:text-destructive md:col-span-2 md:justify-self-end">
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
                    <span className="font-medium text-primary text-base">{order.customerName}</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {getDisplayDate(order.orderDate)}
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
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
