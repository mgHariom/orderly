import { ShoppingBasketIcon } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-primary text-primary-foreground p-4 shadow-md">
      <div className="container mx-auto flex items-center gap-3">
        <ShoppingBasketIcon size={28} className="shrink-0" />
        <h1 className="text-2xl font-headline font-bold tracking-tight">Orderly</h1>
      </div>
    </header>
  );
}
