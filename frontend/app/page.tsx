import { AppHeader } from '@/components/app-header';
import { GlobeCanvas } from '@/components/globe';
import { HoleBackground } from '@/components/ui/hole';

export default function Home() {
  return (
    <main className="absolute inset-0 flex h-screen w-screen flex-col overflow-hidden bg-black">
      <AppHeader className="pointer-events-none absolute top-10 left-1/2 w-full -translate-x-1/2 px-4 text-slate-400" />

      <div className="relative flex h-full w-full items-center justify-center">
        <HoleBackground />
        <div className="absolute w-[400px] h-[400px] top-35">
          <GlobeCanvas />
        </div>
      </div>
    </main>
  );
}
