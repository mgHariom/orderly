
"use client";

import type { Product } from '@/lib/types';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";

const PRODUCTS_COLLECTION = 'products';
const PRODUCTS_QUERY_KEY: QueryKey = ['products'];

async function fetchProducts(): Promise<Product[]> {
  const productsCollection = collection(db, PRODUCTS_COLLECTION);
  const q = query(productsCollection, orderBy("name")); // Order by name for consistency
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
}

async function addProductToFirestore(productData: Omit<Product, 'id'>): Promise<Product> {
  const docRef = await addDoc(collection(db, PRODUCTS_COLLECTION), productData);
  return { id: docRef.id, ...productData };
}

async function updateProductInFirestore(product: Product): Promise<Product> {
  const { id, ...productData } = product;
  await updateDoc(doc(db, PRODUCTS_COLLECTION, id), productData);
  return product;
}

async function deleteProductFromFirestore(productId: string): Promise<void> {
  await deleteDoc(doc(db, PRODUCTS_COLLECTION, productId));
}

export function useProducts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: products = [], isLoading, error } = useQuery<Product[], Error>({
    queryKey: PRODUCTS_QUERY_KEY,
    queryFn: fetchProducts,
  });

  const addProductMutation = useMutation<Product, Error, Omit<Product, 'id'>>({
    mutationFn: addProductToFirestore,
    onSuccess: (newProduct) => {
      queryClient.setQueryData<Product[]>(PRODUCTS_QUERY_KEY, (oldProducts = []) => [...oldProducts, newProduct].sort((a, b) => a.name.localeCompare(b.name)));
      toast({ title: "Product Added", description: `${newProduct.name} has been added.` });
    },
    onError: (err) => {
      toast({ title: "Error Adding Product", description: err.message, variant: "destructive" });
    },
  });

  const updateProductMutation = useMutation<Product, Error, Product>({
    mutationFn: updateProductInFirestore,
    onSuccess: (updatedProduct) => {
      queryClient.setQueryData<Product[]>(PRODUCTS_QUERY_KEY, (oldProducts = []) =>
        oldProducts.map(p => p.id === updatedProduct.id ? updatedProduct : p).sort((a, b) => a.name.localeCompare(b.name))
      );
      toast({ title: "Product Updated", description: `${updatedProduct.name} has been updated.` });
    },
    onError: (err) => {
      toast({ title: "Error Updating Product", description: err.message, variant: "destructive" });
    },
  });

  const deleteProductMutation = useMutation<void, Error, string>({
    mutationFn: deleteProductFromFirestore,
    onSuccess: (_, productId) => {
      const Aproduct = products.find(p=> p.id === productId)
      queryClient.setQueryData<Product[]>(PRODUCTS_QUERY_KEY, (oldProducts = []) =>
        oldProducts.filter(p => p.id !== productId)
      );
      toast({ title: "Product Deleted", description: `${Aproduct?.name || 'Product'} has been deleted.`, variant: "destructive" });
    },
    onError: (err) => {
      toast({ title: "Error Deleting Product", description: err.message, variant: "destructive" });
    },
  });

  return {
    products,
    isLoadingProducts: isLoading,
    productsError: error,
    addProduct: addProductMutation.mutateAsync,
    updateProduct: updateProductMutation.mutateAsync,
    deleteProduct: deleteProductMutation.mutateAsync,
  };
}
