
"use client"; // Required for QueryClientProvider

import type { Metadata } from 'next'; // Keep if you still want metadata here
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type React from 'react'; // Ensure React is imported for Readonly type

// Create a client
const queryClient = new QueryClient();

// export const metadata: Metadata = { // Metadata cannot be in a client component like this. Move to page.tsx or a server component layout.
//   title: 'OrderFlow',
//   description: 'Manage your daily orders efficiently.',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>OrderFlow</title>
        <meta name="description" content="Manage your daily orders efficiently." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster />
        </QueryClientProvider>
      </body>
    </html>
  );
}
