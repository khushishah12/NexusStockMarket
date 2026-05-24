interface PageHeaderProps {
  title: string;
  subtitle: string;
  tag?: string;
}

export default function PageHeader({ title, subtitle, tag }: PageHeaderProps) {
  return (
    <header className="mb-8">
      {tag && (
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">{tag}</p>
      )}
      <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400 md:text-base">{subtitle}</p>
    </header>
  );
}
