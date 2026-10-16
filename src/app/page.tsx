import React from 'react';
import { getTraders, getChallenges, getPayouts } from '@/lib/db';
import DashboardView from '@/components/DashboardView';

export const dynamic = 'force-dynamic'; // Ensure page always fetches fresh data on load

export default async function Home() {
  // Fetch initial data on the server side
  const traders = await getTraders();
  const challenges = await getChallenges();
  const payouts = await getPayouts();

  return (
    <main className="min-h-screen bg-slate-50 transition-colors dark:bg-[#09090b]">
      <DashboardView 
        initialTraders={traders} 
        initialChallenges={challenges} 
        initialPayouts={payouts}
      />
    </main>
  );
}

