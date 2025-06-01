
"use client";

import type { PendingOrder, OrderItem } from '@/lib/types';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, updateDoc, deleteDoc, serverTimestamp, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";

const PENDING_ORDERS_COLLECTION = 'pendingOrders';
const PENDING_ORDERS_QUERY_KEY: QueryKey = ['pendingOrders'];

// Helper to convert Firestore Timestamps in items to JS Dates if needed, though OrderItem doesn't have dates.
// For PendingOrder itself, createdAt will be handled.
const processPendingOrder = (doc: any): PendingOrder => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
    } as PendingOrder;
};


async function addPendingOrderToFirestore(orderData: Omit<PendingOrder, 'id' | 'createdAt'>): Promise<PendingOrder> {
  const docRef = await addDoc(collection(db, PENDING_ORDERS_COLLECTION), {
    ...orderData,
    createdAt: serverTimestamp(),
  });
  // Note: createdAt will be a server timestamp, might need re-fetch or optimistic update handling for exact value client-side immediately.
  // For simplicity, we'll rely on onSnapshot for updates.
  return { id: docRef.id, ...orderData, createdAt: new Date() } as unknown as PendingOrder; // Optimistic createdAt
}

async function updatePendingOrderInFirestore({ id, items, totalAmount }: { id: string; items: OrderItem[]; totalAmount: number }): Promise<void> {
  const docRef = collection(db, PENDING_ORDERS_COLLECTION);
  await updateDoc(doc(docRef, id), { items, totalAmount });
}

async function deletePendingOrderFromFirestore(orderId: string): Promise<void> {
  await deleteDoc(doc(db, PENDING_ORDERS_COLLECTION, orderId));
}

export function usePendingOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Real-time listener for pending orders
  useEffect(() => {
    const q = query(collection(db, PENDING_ORDERS_COLLECTION), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pendingOrdersData = snapshot.docs.map(processPendingOrder);
      queryClient.setQueryData(PENDING_ORDERS_QUERY_KEY, pendingOrdersData);
    }, (error) => {
      console.error("Error fetching pending orders in real-time:", error);
      toast({ title: "Real-time Error", description: "Could not fetch pending orders updates.", variant: "destructive"});
    });
    return () => unsubscribe();
  }, [queryClient, toast]);

  const { data: pendingOrders = [], isLoading, error } = useQuery<PendingOrder[], Error>({
    queryKey: PENDING_ORDERS_QUERY_KEY,
    queryFn: async () => { // Initial fetch, though onSnapshot will override
        const q = query(collection(db, PENDING_ORDERS_COLLECTION), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(processPendingOrder);
    },
    enabled: false, // Let onSnapshot handle population initially
  });


  const addPendingOrderMutation = useMutation<PendingOrder, Error, Omit<PendingOrder, 'id' | 'createdAt'>>({
    mutationFn: addPendingOrderToFirestore,
    onSuccess: (newOrder) => {
      // onSnapshot will update the query data, so explicit setQueryData might be redundant but can be good for optimism
      queryClient.invalidateQueries({ queryKey: PENDING_ORDERS_QUERY_KEY });
      toast({ title: "Order Batch Added to Queue", description: `Batch for ${newOrder.customerName} added to pending orders.` });
    },
    onError: (err) => {
      toast({ title: "Error Adding to Queue", description: err.message, variant: "destructive" });
    },
  });

  const updatePendingOrderMutation = useMutation<void, Error, { id: string; items: OrderItem[]; totalAmount: number }>({
    mutationFn: updatePendingOrderInFirestore,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PENDING_ORDERS_QUERY_KEY });
      // Toast is handled in DeliveryConfirmationDialog
    },
    onError: (err) => {
      toast({ title: "Error Updating Pending Order", description: err.message, variant: "destructive" });
    },
  });

  const deletePendingOrderMutation = useMutation<void, Error, string>({
    mutationFn: deletePendingOrderFromFirestore,
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: PENDING_ORDERS_QUERY_KEY });
      // Toast is handled in OrderFlowApp as it needs customerName
    },
    onError: (err) => {
      toast({ title: "Error Removing Pending Order", description: err.message, variant: "destructive" });
    },
  });

  return {
    pendingOrders,
    isLoadingPendingOrders: isLoading && pendingOrders.length === 0, // Better loading state
    pendingOrdersError: error,
    addPendingOrder: addPendingOrderMutation.mutateAsync,
    updatePendingOrder: updatePendingOrderMutation.mutateAsync,
    deletePendingOrder: deletePendingOrderMutation.mutateAsync,
  };
}
