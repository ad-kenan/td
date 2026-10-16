import HedgeCalculatorView from '@/components/HedgeCalculatorView';

export const metadata = {
  title: 'Hedge Calculator NQ / Nasdaq | Hedge Dashboard',
  description: 'Simulateur institutionnel de couverture automatique Futures & CFD pour NQ et Nasdaq 100',
};

export default function HedgePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-3 py-4 text-slate-900 transition-colors dark:bg-[#09090b] dark:text-zinc-100 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-8">
      <HedgeCalculatorView embedded={false} />
    </main>
  );
}
