import { DependencyBoard } from '../components/dependency-board';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <header className="mb-6 card-animate">
        <p className="text-xs uppercase tracking-[0.24em] text-sky-200/80">InsightBoard Assignment</p>
        <h1 className="mt-2 text-3xl font-bold md:text-4xl">Dependency Engine</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200/90">
          Convert meeting transcripts into a validated dependency graph with cycle detection,
          idempotent processing, and interactive task unlocking.
        </p>
      </header>

      <DependencyBoard />
    </main>
  );
}
