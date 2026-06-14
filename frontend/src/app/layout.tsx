import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'Shiv Furniture Works - ERP',
  description: 'Production-ready ERP system for demand and delivery scheduling',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-50 text-slate-900 antialiased dark:bg-slate-900 dark:text-slate-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
