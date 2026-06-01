import React from 'react';
import { getTraders, getChallenges } from '@/lib/db';
import DashboardView from '@/components/DashboardView';

export const dynamic = 'force-dynamic'; // Ensure page always fetches fresh data on load

export default async function Home() {
  // Fetch initial data on the server side
  const traders = await getTraders();
  const challenges = await getChallenges();

  return (
    <main className="min-h-screen bg-zinc-950">
      <DashboardView initialTraders={traders} initialChallenges={challenges} />
    </main>
  );
}
