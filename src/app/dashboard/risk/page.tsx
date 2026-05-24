'use client';

import PageTransition from '../../../components/dashboard/PageTransition';
import PageHeader from '../../../components/dashboard/PageHeader';
import GlassCard from '../../../components/dashboard/GlassCard';

export default function RiskPage() {
  const riskScore = 62;
  const volatility = 28;

  return (
    <PageTransition>
      <PageHeader
        tag="Risk desk"
        title="Risk Analysis"
        subtitle="Portfolio risk score, volatility meter, and AI risk explanation."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <GlassCard accent="bearish">
          <p className="text-xs uppercase tracking-wider text-slate-500">Portfolio risk score</p>
          <p className="mt-2 text-5xl font-bold text-rose-400">{riskScore}</p>
          <p className="mt-2 text-sm text-slate-400">Moderate-high exposure · diversify defensives</p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500"
              style={{ width: `${riskScore}%` }}
            />
          </div>
        </GlassCard>

        <GlassCard accent="bearish">
          <p className="text-xs uppercase tracking-wider text-slate-500">Volatility meter</p>
          <p className="mt-2 text-5xl font-bold text-orange-400">{volatility}%</p>
          <p className="mt-2 text-sm text-slate-400">30-day annualized implied move</p>
        </GlassCard>

        <GlassCard className="lg:col-span-2" accent="neutral">
          <p className="text-sm font-semibold text-white">AI explanation</p>
          <p className="mt-3 leading-relaxed text-slate-400">
            Current regime shows elevated sector rotation with tech overweight. Model suggests trimming
            high-beta positions by 8–12% and adding hedges via index puts if VIX sustains above 18.
            Correlation clusters in banking and IT increase tail risk on macro surprises.
          </p>
        </GlassCard>
      </div>
    </PageTransition>
  );
}
