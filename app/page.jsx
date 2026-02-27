import dynamic from 'next/dynamic';

const RouletteClient = dynamic(() => import('./slots-client.jsx'), {
  ssr: false,
  loading: () => <main className="loading">Loading roulette lounge...</main>
});

export default function Page() {
  return <RouletteClient />;
}
