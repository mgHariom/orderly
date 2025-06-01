
"use client";

import type { Order } from '@/lib/types';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";

const ORDERS_COLLECTION = 'orders';
const ORDERS_QUERY_KEY: QueryKey = ['orders'];

// Helper to convert Firestore Timestamps in items to JS Dates
const processOrder = (doc: any): Order => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        orderDate: data.orderDate instanceof Timestamp ? data.orderDate.toDate() : new Date(data.orderDate),
    } as Order;
};

async function fetchOrders(): Promise<Order[]> {
  const ordersCollection = collection(db, ORDERS_COLLECTION);
  const q = query(ordersCollection, orderBy("orderDate", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(processOrder);
}

async function addOrderToFirestore(orderData: Omit<Order, 'id' | 'orderDate'>): Promise<Order> {
  const docRef = await addDoc(collection(db, ORDERS_COLLECTION), {
    ...orderData,
    orderDate: serverTimestamp(),
  });
  // As with pending orders, relying on query invalidation for the accurate server timestamp.
  return { id: docRef.id, ...orderData, orderDate: new Date() } as unknown as Order; // Optimistic orderDate
}


export function useOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: orders = [], isLoading, error } = useQuery<Order[], Error>({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: fetchOrders,
  });

  const addOrderMutation = useMutation<Order, Error, Omit<Order, 'id' | 'orderDate'>>({
    mutationFn: addOrderToFirestore,
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
      // Toast is handled in DeliveryConfirmationDialog or OrderFlowApp
    },
    onError: (err) => {
      toast({ title: "Error Saving Order", description: err.message, variant: "destructive" });
    },
  });

  return {
    orders,
    isLoadingOrders: isLoading,
    ordersError: error,
    addOrder: addOrderMutation.mutateAsync,
  };
}
