
import OrderFlowApp from '@/components/OrderFlowApp';

// If metadata was removed from layout.tsx due to client component, place it here.
export const metadata = {
  title: 'OrderFlow',
  description: 'Manage your daily orders efficiently.',
};

export default function HomePage() {
  return <OrderFlowApp />;
}
