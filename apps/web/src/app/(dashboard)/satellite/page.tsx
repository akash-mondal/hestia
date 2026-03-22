import { fetchRegistrations, fetchReadings } from '@/lib/api';
import SatelliteView from '@/components/satellite/satellite-view';

export const dynamic = 'force-dynamic';

export default async function SatellitePage() {
  const [registrations, readings] = await Promise.all([
    fetchRegistrations().catch(() => []),
    fetchReadings().catch(() => []),
  ]);

  return (
    <SatelliteView facilities={registrations} readings={readings} />
  );
}
