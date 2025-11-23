import { GlobeCanvas } from '@/components/globe';
import { HoleBackground } from '@/components/ui/hole';

export default function BlackHole() {
  return (
    <main className="absolute inset-0 flex h-screen w-screen flex-col overflow-hidden bg-black">
      <div className="relative flex h-full w-full items-center justify-center">
        <HoleBackground />

        <div className="absolute w-[400px] h-[400px] top-35">
          <GlobeCanvas />
        </div>
      </div>
    </main>
  );
}
