'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Shield,
  TrendingUp,
  TrendingDown,
  Copy,
  Check,
  Settings2,
  Sliders,
  RotateCcw,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import {
  InstrumentType,
  TradeDirection,
  HedgeSlMode,
  FUTURES_PRESETS,
  CFD_PRESETS,
  SymbolSpec,
  Trade1Input,
  HedgeSettings,
  calculateHedgeSetup,
} from '@/lib/nasdaqSpecs';

interface HedgeCalculatorViewProps {
  embedded?: boolean; // If embedded inside DashboardView tabs
}

export default function HedgeCalculatorView({ embedded = false }: HedgeCalculatorViewProps) {
  // Trade 1 Inputs (Pure points & dollars, NO entry price!)
  const [instrumentType, setInstrumentType] = useState<InstrumentType>('futures');
  const [futuresType, setFuturesType] = useState<'NQ' | 'MNQ'>('NQ');
  const [direction, setDirection] = useState<TradeDirection>('BUY');
  const [tpDollars, setTpDollars] = useState<string>('1520');
  const [slDollars, setSlDollars] = useState<string>('2000');
  const [contracts, setContracts] = useState<string>('2');
  const [cfdLots, setCfdLots] = useState<string>('1.00');

  // Trade 2 (Hedge) Inputs
  // Target Take Profit amount in $ for the Hedge
  const [hedgeTpDollars, setHedgeTpDollars] = useState<string>('2000');
  const [bufferPoints, setBufferPoints] = useState<string>('3');
  const [slMode, setSlMode] = useState<HedgeSlMode>('trade1_tp');

  // Broker / CFD Symbol Specs
  const [selectedPresetId, setSelectedPresetId] = useState<string>('prop_firm_standard');
  const [customSpec, setCustomSpec] = useState<SymbolSpec>(CFD_PRESETS[0]);
  const [showAdvancedSpecs, setShowAdvancedSpecs] = useState<boolean>(false);

  // UI State
  const [copied, setCopied] = useState<boolean>(false);

  // Auto-sync Hedge TP with Trade 1 SL for instant Break-Even
  const handleSyncHedgeTpWithSl1 = () => {
    setHedgeTpDollars(slDollars);
  };

  // Handler for preset change
  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = CFD_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setCustomSpec({ ...found });
    }
  };

  // Safe parse numbers
  const parsedTpDollars = Math.max(0, Number(tpDollars) || 0);
  const parsedSlDollars = Math.max(0, Number(slDollars) || 0);
  const parsedContracts = Math.max(1, Math.round(Number(contracts) || 1));
  const parsedCfdLots = Math.max(customSpec.minLot, Number(cfdLots) || 1.0);

  const parsedHedgeTpDollars = Math.max(0, Number(hedgeTpDollars) || 0);
  const parsedBufferPoints = Math.max(0, Number(bufferPoints) || 0);

  // Perform Calculation with the exact user requested formulas:
  // Trade 2 TP Points = Trade 1 SL Points - Buffer
  // Trade 2 SL Points = Trade 1 TP Points + Buffer
  const setupResult = useMemo(() => {
    const t1Input: Trade1Input = {
      instrumentType,
      futuresType,
      direction,
      tpDollars: parsedTpDollars,
      slDollars: parsedSlDollars,
      contracts: parsedContracts,
      lots: parsedCfdLots,
    };

    const hedgeSet: HedgeSettings = {
      hedgeTpDollars: parsedHedgeTpDollars,
      bufferPoints: parsedBufferPoints,
      slMode,
    };

    return calculateHedgeSetup(t1Input, hedgeSet, customSpec);
  }, [
    instrumentType,
    futuresType,
    direction,
    parsedTpDollars,
    parsedSlDollars,
    parsedContracts,
    parsedCfdLots,
    parsedHedgeTpDollars,
    parsedBufferPoints,
    slMode,
    customSpec,
  ]);

  const formatCurrency = (val: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(Math.abs(val));
    return val < 0 ? `-${formatted}` : formatted;
  };

  // Reset to default
  const handleReset = () => {
    setInstrumentType('futures');
    setFuturesType('NQ');
    setDirection('BUY');
    setTpDollars('1520');
    setSlDollars('2000');
    setContracts('2');
    setCfdLots('1.00');
    setHedgeTpDollars('2000');
    setBufferPoints('3');
    setSlMode('trade1_tp');
  };

  // Copy full setup text
  const handleCopySetup = () => {
    const t1 = setupResult.trade1;
    const t2 = setupResult.trade2;
    const text = `=== SETUP DE TRADING NQ HEDGE ===
TRADE 1 (MAIN):
Instrument: ${t1.instrument}
Direction: ${t1.direction}
Taille: ${t1.sizeLabel} (${formatCurrency(t1.dollarPerPoint)}/pt)
Take Profit: +${t1.tpPoints} pts (+$${t1.tpDollars})
Stop Loss: -${t1.slPoints} pts (-$${t1.slDollars})

TRADE 2 (HEDGE CFD):
Instrument: ${t2.instrument}
Direction: ${t2.direction} (Opposé automatique)
Buffer: ${parsedBufferPoints} pts
Taille Calculée: ${t2.calculatedLots.toFixed(2)} lots (${formatCurrency(t2.dollarPerPoint)}/pt)
Take Profit: +${t2.tpPoints} pts (${t1.slPoints} - ${parsedBufferPoints}) (+$${t2.tpDollars})
Stop Loss: -${t2.slPoints} pts (${t1.tpPoints} + ${parsedBufferPoints}) (-$${t2.slDollars})

RÉSULTAT DU HEDGE (Si SL Trade 1):
Gain Hedge: +$${t2.tpDollars}
Perte Trade 1: -$${t1.slDollars}
Résultat Net: ${formatCurrency(setupResult.scenarios.scenarioB.netPnL)}
=================================`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`space-y-4 sm:space-y-5 ${embedded ? '' : 'mx-auto max-w-[1600px] py-4'}`}>
      {/* Top Banner / Navigation if standalone */}
      {!embedded && (
        <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-[#0d0e12] p-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </Link>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600/30 text-violet-400">
                <Shield className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold tracking-tight text-zinc-100 sm:text-base">
                Hedge Calculator NQ
              </h2>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-white"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Réinitialiser</span>
          </button>
        </div>
      )}

      {/* HEADER BAR & PRESETS SELECTOR */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0e12] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 items-center rounded-md border border-violet-500/30 bg-violet-950/40 px-2 text-[10px] font-bold uppercase tracking-wider text-violet-300">
                Nasdaq 100 Engine
              </span>
              <h1 className="text-base font-bold tracking-tight text-zinc-100 sm:text-lg">
                Calculateur de Couverture NQ (Points &amp; Buffer)
              </h1>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Modèle direct en points : TP Hedge = SL Trade 1 - Buffer · SL Hedge = TP Trade 1 + Buffer.
            </p>
          </div>

          {/* Broker Specs Presets Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-black/40 p-1">
              {CFD_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetChange(preset.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    selectedPresetId === preset.id
                      ? 'bg-violet-600/30 text-violet-200 border border-violet-500/30 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title={preset.description}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAdvancedSpecs(!showAdvancedSpecs)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition ${
                showAdvancedSpecs
                  ? 'border-violet-500/50 bg-violet-600/20 text-violet-200'
                  : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:text-zinc-200'
              }`}
              title="Configurer les spécifications MT5 / Broker"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Specs MT5</span>
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Symbol Specs */}
        {showAdvancedSpecs && (
          <div className="mt-4 rounded-xl border border-white/[0.08] bg-black/50 p-3.5 text-xs">
            <div className="mb-2 flex items-center justify-between border-b border-white/[0.06] pb-2">
              <span className="font-semibold text-zinc-200">
                Spécifications Symbole CFD (MT5 / Broker)
              </span>
              <span className="text-[11px] text-zinc-500">
                Ajustez si votre broker utilise une valeur de point différente de $1.00
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Valeur $/pt par lot
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={customSpec.dollarPerPointPerLot}
                    onChange={(e) =>
                      setCustomSpec({ ...customSpec, dollarPerPointPerLot: Number(e.target.value) || 1 })
                    }
                    className="h-8 w-full rounded-lg border border-white/10 bg-black/60 pl-6 pr-2 font-mono text-xs text-zinc-200 outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Point Size (_Point)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={customSpec.pointSize}
                  onChange={(e) =>
                    setCustomSpec({ ...customSpec, pointSize: Number(e.target.value) || 1 })
                  }
                  className="h-8 w-full rounded-lg border border-white/10 bg-black/60 px-2 font-mono text-xs text-zinc-200 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Tick Size
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={customSpec.tickSize}
                  onChange={(e) =>
                    setCustomSpec({ ...customSpec, tickSize: Number(e.target.value) || 0.01 })
                  }
                  className="h-8 w-full rounded-lg border border-white/10 bg-black/60 px-2 font-mono text-xs text-zinc-200 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Pas de Lot (Lot Step)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={customSpec.lotStep}
                  onChange={(e) =>
                    setCustomSpec({ ...customSpec, lotStep: Number(e.target.value) || 0.01 })
                  }
                  className="h-8 w-full rounded-lg border border-white/10 bg-black/60 px-2 font-mono text-xs text-zinc-200 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Lot Minimum
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={customSpec.minLot}
                  onChange={(e) =>
                    setCustomSpec({ ...customSpec, minLot: Number(e.target.value) || 0.01 })
                  }
                  className="h-8 w-full rounded-lg border border-white/10 bg-black/60 px-2 font-mono text-xs text-zinc-200 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Lot Maximum
                </label>
                <input
                  type="number"
                  step="1"
                  value={customSpec.maxLot}
                  onChange={(e) =>
                    setCustomSpec({ ...customSpec, maxLot: Number(e.target.value) || 100 })
                  }
                  className="h-8 w-full rounded-lg border border-white/10 bg-black/60 px-2 font-mono text-xs text-zinc-200 outline-none focus:border-violet-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TWO-COLUMN TRADING SETUP CARDS */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ========================================================= */}
        {/* CARD 1: TRADE 1 — MAIN TRADE                             */}
        {/* ========================================================= */}
        <section className="flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-[#0d0e12] p-4 sm:p-5">
          <div className="space-y-4">
            {/* Card Header with Instrument Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600/30 text-[10px] font-bold text-violet-300">
                  1
                </span>
                <h3 className="text-sm font-bold tracking-tight text-zinc-100 sm:text-base">
                  Trade 1 — Main Trade
                </h3>
              </div>

              {/* Futures | CFD Selector */}
              <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-black/40 p-1">
                <button
                  type="button"
                  onClick={() => setInstrumentType('futures')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    instrumentType === 'futures'
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Futures
                </button>
                <button
                  type="button"
                  onClick={() => setInstrumentType('cfd')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    instrumentType === 'cfd'
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  CFD
                </button>
              </div>
            </div>

            {/* Direction BUY / SELL Toggle */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Direction du Trade 1
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirection('BUY')}
                  className={`flex h-10 items-center justify-center gap-2 rounded-xl border text-xs font-bold transition active:scale-95 ${
                    direction === 'BUY'
                      ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 shadow-md shadow-emerald-950/40'
                      : 'border-white/[0.06] bg-black/30 text-zinc-400 hover:border-white/15 hover:text-zinc-200'
                  }`}
                >
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span>BUY (Long)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('SELL')}
                  className={`flex h-10 items-center justify-center gap-2 rounded-xl border text-xs font-bold transition active:scale-95 ${
                    direction === 'SELL'
                      ? 'border-rose-500/40 bg-rose-950/40 text-rose-300 shadow-md shadow-rose-950/40'
                      : 'border-white/[0.06] bg-black/30 text-zinc-400 hover:border-white/15 hover:text-zinc-200'
                  }`}
                >
                  <TrendingDown className="h-4 w-4 text-rose-400" />
                  <span>SELL (Short)</span>
                </button>
              </div>
            </div>

            {/* Sizing: Contracts if Futures, Lots if CFD */}
            {instrumentType === 'futures' ? (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Contrats Futures NQ
                  </label>
                  <div className="flex gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setFuturesType('NQ')}
                      className={`rounded px-2 py-0.5 font-bold transition ${
                        futuresType === 'NQ' ? 'bg-violet-600/40 text-violet-200 border border-violet-500/30' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      NQ ($20/pt)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFuturesType('MNQ')}
                      className={`rounded px-2 py-0.5 font-bold transition ${
                        futuresType === 'MNQ' ? 'bg-violet-600/40 text-violet-200 border border-violet-500/30' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      MNQ ($2/pt)
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={contracts}
                  onChange={(e) => setContracts(e.target.value)}
                  className="h-10 w-full rounded-xl border border-white/10 bg-black/50 px-3 font-mono text-sm text-zinc-100 outline-none transition focus:border-violet-500/60"
                />
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Lots CFD Nasdaq
                </label>
                <input
                  type="number"
                  step={customSpec.lotStep}
                  min={customSpec.minLot}
                  value={cfdLots}
                  onChange={(e) => setCfdLots(e.target.value)}
                  className="h-10 w-full rounded-xl border border-white/10 bg-black/50 px-3 font-mono text-sm text-zinc-100 outline-none transition focus:border-violet-500/60"
                />
              </div>
            )}

            {/* Take Profit $ & Stop Loss $ */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <span>Take Profit ($)</span>
                  <span className="text-[10px] font-medium text-emerald-400">Objectif Trade 1</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-emerald-500">+$</span>
                  <input
                    type="number"
                    step="25"
                    min="0"
                    value={tpDollars}
                    onChange={(e) => setTpDollars(e.target.value)}
                    placeholder="1520"
                    className="h-10 w-full rounded-xl border border-white/10 bg-black/50 pl-8 pr-3 font-mono text-sm text-emerald-400 outline-none transition focus:border-emerald-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <span>Stop Loss ($)</span>
                  <span className="text-[10px] font-medium text-rose-400">Perte max Trade 1</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-rose-500">-$</span>
                  <input
                    type="number"
                    step="25"
                    min="0"
                    value={slDollars}
                    onChange={(e) => setSlDollars(e.target.value)}
                    placeholder="2000"
                    className="h-10 w-full rounded-xl border border-white/10 bg-black/50 pl-8 pr-3 font-mono text-sm text-rose-400 outline-none transition focus:border-rose-500/60"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Trade 1 Points Display */}
          <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/40 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Valeur par point de la position :</span>
              <span className="font-mono font-bold text-zinc-200">
                ${setupResult.trade1.dollarPerPoint.toFixed(2)} / point
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-white/[0.04] pt-2">
              <div className="rounded-lg bg-emerald-950/20 border border-emerald-500/20 p-2 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Distance Take Profit
                </span>
                <p className="mt-0.5 font-mono text-base font-bold text-emerald-300">
                  +{setupResult.trade1.tpPoints} pts
                </p>
                <p className="text-[10px] text-emerald-400/80 font-mono">
                  +{formatCurrency(setupResult.trade1.potentialProfit)}
                </p>
              </div>

              <div className="rounded-lg bg-rose-950/20 border border-rose-500/20 p-2 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                  Distance Stop Loss
                </span>
                <p className="mt-0.5 font-mono text-base font-bold text-rose-300">
                  -{setupResult.trade1.slPoints} pts
                </p>
                <p className="text-[10px] text-rose-400/80 font-mono">
                  {formatCurrency(setupResult.trade1.potentialLoss)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* CARD 2: TRADE 2 — HEDGE TRADE (ALWAYS CFD)               */}
        {/* ========================================================= */}
        <section className="flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-[#0d0e12] p-4 sm:p-5 relative overflow-hidden">
          {/* Subtle accent glow */}
          <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />

          <div className="space-y-4">
            {/* Card Header with Auto-Opposite Direction */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600/30 text-[10px] font-bold text-indigo-300">
                  2
                </span>
                <h3 className="text-sm font-bold tracking-tight text-zinc-100 sm:text-base">
                  Trade 2 — Hedge Trade (CFD)
                </h3>
              </div>

              {/* Direction Indicator */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 font-medium">Sens inverse auto :</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-mono text-xs font-bold border ${
                    setupResult.trade2.direction === 'BUY'
                      ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
                      : 'border-rose-500/30 bg-rose-950/40 text-rose-300'
                  }`}
                >
                  {setupResult.trade2.direction === 'BUY' ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  {setupResult.trade2.direction}
                </span>
              </div>
            </div>

            {/* CORE INPUT OF TRADE 2: TAKE PROFIT CIBLE DU HEDGE ($) */}
            <div className="rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-950/30 to-indigo-950/20 p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-violet-300 flex items-center gap-1">
                  <span>Take Profit Cible du Hedge ($)</span>
                  <span className="text-[10px] text-zinc-400 font-normal">· Profit net cible</span>
                </label>
                <button
                  type="button"
                  onClick={handleSyncHedgeTpWithSl1}
                  className="inline-flex items-center gap-1 rounded-md bg-violet-600/30 border border-violet-500/40 px-2 py-0.5 text-[10px] font-bold text-violet-200 transition hover:bg-violet-600/50"
                  title="Aligner exactement sur la perte du Trade 1 pour un Break-Even parfait"
                >
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  <span>Break-Even (${parsedSlDollars})</span>
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-emerald-400 font-bold">+$</span>
                <input
                  type="number"
                  step="25"
                  min="0"
                  value={hedgeTpDollars}
                  onChange={(e) => setHedgeTpDollars(e.target.value)}
                  placeholder="2000"
                  className="h-11 w-full rounded-xl border border-violet-500/40 bg-black/60 pl-8 pr-3 font-mono text-lg font-bold text-emerald-300 outline-none transition focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30"
                />
              </div>

              <p className="mt-2 text-[11px] text-zinc-400">
                Objectif de gain sur les <strong className="text-zinc-200">{setupResult.trade2.tpPoints} pts</strong> du Hedge (SL {setupResult.trade1.slPoints} pts - buffer {parsedBufferPoints} pts).
              </p>
            </div>

            {/* PROMINENT CALCULATED HEDGE LOT SIZE & CALCULATED STOP LOSS */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.08] bg-black/40 p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Taille Calculée du Hedge
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-2xl sm:text-3xl font-extrabold text-white">
                    {setupResult.trade2.calculatedLots.toFixed(2)}
                  </span>
                  <span className="font-mono text-xs text-zinc-400">lots CFD</span>
                </div>
                <p className="mt-1 text-[10px] text-zinc-500 font-mono">
                  ${setupResult.trade2.dollarPerPoint.toFixed(2)} / pt (${customSpec.dollarPerPointPerLot}/pt/lot)
                </p>
              </div>

              {/* Stop Loss du Hedge calculated from the lot size */}
              <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                    Stop Loss Calculé du Hedge
                  </span>
                  <span className="rounded bg-rose-950/80 px-1.5 py-0.5 text-[9px] font-mono font-bold text-rose-300">
                    -{setupResult.trade2.slPoints} pts
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-2xl sm:text-3xl font-extrabold text-rose-400">
                    -{formatCurrency(setupResult.trade2.slDollars)}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-zinc-400 font-mono">
                  {setupResult.trade2.calculatedLots.toFixed(2)} lots × {setupResult.trade2.slPoints} pts
                </p>
              </div>
            </div>

            {/* Points Summary for Trade 2 */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Objectif TP Hedge
                </span>
                <p className="font-mono font-bold text-emerald-300 mt-0.5 text-base">
                  +{setupResult.trade2.tpPoints} pts
                </p>
                <div className="mt-0.5 flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono">
                  <span className="text-emerald-400/80 font-bold">+{formatCurrency(setupResult.trade2.tpDollars)}</span>
                  <span className="text-zinc-500">({setupResult.trade1.slPoints} - {parsedBufferPoints} pts)</span>
                </div>
              </div>

              <div className="rounded-lg border border-rose-500/20 bg-rose-950/20 p-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                  Risque SL Hedge
                </span>
                <p className="font-mono font-bold text-rose-300 mt-0.5 text-base">
                  -{setupResult.trade2.slPoints} pts
                </p>
                <div className="mt-0.5 flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono">
                  <span className="text-rose-400/80 font-bold">-{formatCurrency(setupResult.trade2.slDollars)}</span>
                  <span className="text-zinc-500">({setupResult.trade1.tpPoints} + {parsedBufferPoints} pts)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Copy Action */}
          <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
            <span className="text-xs text-zinc-400">Prêt pour exécution MT5</span>
            <button
              onClick={handleCopySetup}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition active:scale-95 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-violet-600 text-white hover:bg-violet-500'
              }`}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Setup copié !' : 'Copier le setup'}</span>
            </button>
          </div>
        </section>
      </div>

      {/* PARAMÈTRES AVANCÉS & BUFFER */}
      <section className="rounded-2xl border border-white/[0.06] bg-[#0d0e12] p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-violet-400" />
            <h3 className="text-sm font-bold tracking-tight text-zinc-100">
              Paramètres du Hedge &amp; Buffer
            </h3>
          </div>
          <span className="text-[11px] text-zinc-500">Ajustement du Buffer de décalage et du niveau de coupure</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Buffer Input */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Buffer (Points)
              </label>
              <span className="text-[10px] text-violet-400 font-mono font-medium">
                Décalage des points
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="0"
                value={bufferPoints}
                onChange={(e) => setBufferPoints(e.target.value)}
                placeholder="3"
                className="h-10 w-full rounded-xl border border-white/10 bg-black/50 px-3 font-mono text-sm text-zinc-100 outline-none focus:border-violet-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-mono">pts</span>
            </div>
            <div className="mt-2 space-y-1 text-[11px] text-zinc-400 font-mono">
              <p>
                • TP Hedge : <span className="text-zinc-300">SL Trade 1</span> ({setupResult.trade1.slPoints} pts) - <span className="text-zinc-300">Buffer</span> ({parsedBufferPoints} pts) = <strong className="text-emerald-400">+{setupResult.trade2.tpPoints} pts</strong>
              </p>
              <p>
                • SL Hedge : <span className="text-zinc-300">TP Trade 1</span> ({setupResult.trade1.tpPoints} pts) + <span className="text-zinc-300">Buffer</span> ({parsedBufferPoints} pts) = <strong className="text-rose-400">-{setupResult.trade2.slPoints} pts</strong>
              </p>
            </div>
          </div>

          {/* SL Level Choice for Hedge */}
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Niveau de Stop Loss du Hedge
            </label>
            <select
              value={slMode}
              onChange={(e) => setSlMode(e.target.value as HedgeSlMode)}
              className="h-10 w-full rounded-xl border border-white/10 bg-black/50 px-3 text-xs text-zinc-200 outline-none focus:border-violet-500"
            >
              <option value="trade1_tp">Au TP du Trade 1 ({setupResult.trade1.tpPoints} pts + {parsedBufferPoints} pts buffer)</option>
              <option value="trade1_entry">À l&apos;Entrée du Trade 1 (Buffer seul = {parsedBufferPoints} pts)</option>
            </select>
            <p className="mt-2 text-[11px] text-zinc-500 leading-snug">
              {slMode === 'trade1_tp'
                ? `Coupe le hedge si le trade rebondit jusqu'au Take Profit du Trade 1 (distance totale : -${setupResult.trade2.slPoints} pts contre le hedge)`
                : `Coupe le hedge dès que le prix revient au niveau d'entrée du Trade 1 (distance : -${setupResult.trade2.slPoints} pts)`}
            </p>
          </div>
        </div>
      </section>

      {/* SCENARIOS SIMULATION & RESULTS */}
      <section className="rounded-2xl border border-white/[0.06] bg-[#0d0e12] p-4 sm:p-5">
        <div className="mb-3">
          <h3 className="text-sm font-bold tracking-tight text-zinc-100 sm:text-base">
            Matrice des Scénarios &amp; Résultats Nets
          </h3>
          <p className="text-[11px] text-zinc-400">
            Résultats consolidés selon l&apos;issue du marché.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Scenario A: Trade 1 Reaches TP */}
          <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-bold text-zinc-200">Scénario A : Trade 1 Réussi</span>
              </div>
              <span className={`rounded-md px-2 py-0.5 font-mono text-xs font-bold border ${
                setupResult.scenarios.scenarioA.netPnL >= 0
                  ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/20 text-rose-300'
              }`}>
                {setupResult.scenarios.scenarioA.netPnL >= 0 ? '+' : ''}
                {formatCurrency(setupResult.scenarios.scenarioA.netPnL)} Net
              </span>
            </div>

            <div className="mt-3 space-y-1.5 text-xs text-zinc-400 font-mono">
              <div className="flex justify-between">
                <span>Gain Trade 1 (TP atteint) :</span>
                <span className="text-emerald-400">+{formatCurrency(setupResult.scenarios.scenarioA.trade1PnL)}</span>
              </div>
              <div className="flex justify-between">
                <span>Perte Hedge ({setupResult.trade2.slPoints} pts) :</span>
                <span className="text-rose-400">{formatCurrency(setupResult.scenarios.scenarioA.hedgePnL)}</span>
              </div>
              <div className="border-t border-white/[0.06] pt-1.5 flex justify-between font-bold text-zinc-100">
                <span>Résultat Net Final :</span>
                <span className={setupResult.scenarios.scenarioA.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {setupResult.scenarios.scenarioA.netPnL >= 0 ? '+' : ''}
                  {formatCurrency(setupResult.scenarios.scenarioA.netPnL)}
                </span>
              </div>
            </div>
          </div>

          {/* Scenario B: Trade 1 Hits SL (Hedge Protects) */}
          <div className="rounded-xl border border-violet-500/20 bg-violet-950/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-violet-400" />
                <span className="text-xs font-bold text-zinc-200">Scénario B : Hedge Déclenché &amp; TP</span>
              </div>
              <span className="rounded-md bg-violet-950/50 border border-violet-500/30 px-2 py-0.5 font-mono text-xs font-bold text-violet-300">
                {setupResult.scenarios.scenarioB.netPnL >= 0 ? '+' : ''}
                {formatCurrency(setupResult.scenarios.scenarioB.netPnL)} Net
              </span>
            </div>

            <div className="mt-3 space-y-1.5 text-xs text-zinc-400 font-mono">
              <div className="flex justify-between">
                <span>Perte Trade 1 (SL atteint) :</span>
                <span className="text-rose-400">{formatCurrency(setupResult.scenarios.scenarioB.trade1PnL)}</span>
              </div>
              <div className="flex justify-between">
                <span>Gain Hedge (TP atteint) :</span>
                <span className="text-emerald-400">+{formatCurrency(setupResult.scenarios.scenarioB.hedgePnL)}</span>
              </div>
              <div className="border-t border-white/[0.06] pt-1.5 flex justify-between font-bold text-zinc-100">
                <span>Résultat Net Final :</span>
                <span className={Math.abs(setupResult.scenarios.scenarioB.netPnL) < 2 ? 'text-teal-400' : setupResult.scenarios.scenarioB.netPnL > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {setupResult.scenarios.scenarioB.netPnL >= 0 ? '+' : ''}
                  {formatCurrency(setupResult.scenarios.scenarioB.netPnL)} {Math.abs(setupResult.scenarios.scenarioB.netPnL) < 2 ? '(Break-Even Parfait)' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
