'use client';

import PageTransition from '../../../components/dashboard/PageTransition';
import PageHeader from '../../../components/dashboard/PageHeader';
import WatchlistPanel from '../../../components/dashboard/WatchlistPanel';

export default function WatchlistPage() {
  return (
    <PageTransition>
      <PageHeader
        tag="Watchlist"
        title="Your Watchlist"
        subtitle="Saved stocks synced to your Supabase account with quick price indicators."
      />
      <WatchlistPanel />
    </PageTransition>
  );
}
