import TripCalculatorView from '@/components/TripCalculatorView';
import { getTripData } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function VoyagePage() {
  const tripData = await getTripData();

  return <TripCalculatorView initialData={tripData} />;
}
