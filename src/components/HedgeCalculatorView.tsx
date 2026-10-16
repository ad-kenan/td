'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Copy,
  Check,
  Settings2,
  Sliders,
  RotateCcw,
  ArrowLeft,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import {
  InstrumentType,
  TradeDirection,
  HedgeSlMode,
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

  // Perform Calculation with the exact business formulas:
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
    <div className={`space-y-6 lg:space-y-7 ${embedded ? '' : 'mx-auto max-w-[1600px] py-4'}`}>
      {/* ========================================================= */}
      {/* 1. HEADER (Compact, Modern & Institutional)               */}
      {/* ========================================================= */}
      <header className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-colors dark:border-white/[0.07] dark:bg-[#10131a] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            {!embedded && (
              <Link
                href="/"
                className="mb-3 inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50 px-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-white/[0.08] dark:bg-[#141821] dark:text-zinc-400 dark:hover:bg-[#171b24] dark:hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Dashboard</span>
              </Link>
            )}
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl dark:text-zinc-100">
                Hedge Calculator NQ
              </h1>
              <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                Nasdaq 100
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              Nasdaq 100 · Hedge &amp; Buffer Calculator (Modèle direct en points)
            </p>
          </div>

          {/* Right Header Toolbar: Presets + Specs MT5 + Reset + Theme */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Broker Specs Presets Selector */}
            <div className="flex items-center rounded-xl border border-slate-200/80 bg-slate-50 p-1 dark:border-white/[0.08] dark:bg-[#0c0f15]">
              {CFD_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetChange(preset.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    selectedPresetId === preset.id
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-white/10 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                  title={preset.description}
                >
                  {preset.name.split(' (')[0]}
                </button>
              ))}
            </div>

            {/* Specs MT5 Toggle */}
            <button
              onClick={() => setShowAdvancedSpecs(!showAdvancedSpecs)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition ${
                showAdvancedSpecs
                  ? 'border-violet-500/40 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-500/30'
                  : 'border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-white/[0.08] dark:bg-[#0c0f15] dark:text-zinc-400 dark:hover:bg-[#141821] dark:hover:text-zinc-200'
              }`}
              title="Configurer les spécifications MT5 / Broker"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Specs MT5</span>
              {showAdvancedSpecs ? (
                <ChevronUp className="h-3 w-3 text-slate-400" />
              ) : (
                <ChevronDown className="h-3 w-3 text-slate-400" />
              )}
            </button>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-white/[0.08] dark:bg-[#0c0f15] dark:text-zinc-400 dark:hover:bg-[#141821] dark:hover:text-white"
              title="Réinitialiser les paramètres par défaut"
              aria-label="Réinitialiser"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            {/* Standalone Theme Toggle */}
            {!embedded && <ThemeToggle />}
          </div>
        </div>

        {/* Collapsible Advanced Symbol Specs */}
        {showAdvancedSpecs && (
          <div className="mt-5 rounded-xl border border-slate-200/70 bg-slate-50/70 p-4 text-xs dark:border-white/[0.06] dark:bg-[#141821]/70">
            <div className="mb-3 flex items-center justify-between border-b border-slate-200/70 pb-2.5 dark:border-white/[0.06]">
              <div>
                <p className="font-semibold text-slate-900 dark:text-zinc-200">
                  Spécifications Symbole CFD (MT5 / Broker)
                </p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Modifiez si votre broker applique une valeur de point différente de $1.00 par lot.
                </p>
              </div>
              <span className="rounded bg-slate-200/70 px-2 py-0.5 font-mono text-[11px] text-slate-700 dark:bg-white/[0.06] dark:text-zinc-300">
                {customSpec.name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                  Valeur $/pt par lot
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={customSpec.dollarPerPointPerLot}
                    onChange={(e) =>
                      setCustomSpec({ ...customSpec, dollarPerPointPerLot: Number(e.target.value) || 1 })
                    }
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-6 pr-2 font-mono text-xs text-slate-900 outline-none focus:border-violet-500 dark:border-white/[0.08] dark:bg-[#0c0f15] dark:text-zinc-200"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                  Point Size (_Point)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={customSpec.pointSize}
                  onChange={(e) =>
                    setCustomSpec({ ...customSpec, pointSize: Number(e.target.value) || 1 })
                  }
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-900 outline-none focus:border-violet-500 dark:border-white/[0.08] dark:bg-[#0c0f15] dark:text-zinc-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                  Tick Size
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={customSpec.tickSize}
                  onChange={(e) =>
                    setCustomSpec({ ...customSpec, tickSize: Number(e.target.value) || 0.01 })
                  }
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-900 outline-none focus:border-violet-500 dark:border-white/[0.08] dark:bg-[#0c0f15] dark:text-zinc-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                  Pas de Lot (Lot Step)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={customSpec.lotStep}
                  onChange={(e) =>
                    setCustomSpec({ ...customSpec, lotStep: Number(e.target.value) || 0.01 })
                  }
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-900 outline-none focus:border-violet-500 dark:border-white/[0.08] dark:bg-[#0c0f15] dark:text-zinc-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                  Lot Minimum
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={customSpec.minLot}
                  onChange={(e) =>
                    setCustomSpec({ ...customSpec, minLot: Number(e.target.value) || 0.01 })
                  }
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-900 outline-none focus:border-violet-500 dark:border-white/[0.08] dark:bg-[#0c0f15] dark:text-zinc-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                  Lot Maximum
                </label>
                <input
                  type="number"
                  step="1"
                  value={customSpec.maxLot}
                  onChange={(e) =>
                    setCustomSpec({ ...customSpec, maxLot: Number(e.target.value) || 100 })
                  }
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-900 outline-none focus:border-violet-500 dark:border-white/[0.08] dark:bg-[#0c0f15] dark:text-zinc-200"
                />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================= */}
      {/* 2. MAIN LAYOUT: TRADE 1 (45%) & TRADE 2 (55%)             */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-6 xl:gap-7">
        {/* ========================================================= */}
        {/* CARD 1: TRADE 1 — MAIN TRADE (INPUTS)                     */}
        {/* ========================================================= */}
        <section className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-colors dark:border-white/[0.07] dark:bg-[#10131a] sm:p-6 lg:col-span-5">
          <div className="space-y-5">
            {/* Header: Trade 1 title & Instrument selector */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-white/[0.05]">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Trade 1
                </span>
                <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
                  Main Trade
                </h2>
              </div>

              {/* Futures / CFD Segmented Pill */}
              <div className="flex items-center rounded-xl border border-slate-200/80 bg-slate-50 p-1 dark:border-white/[0.08] dark:bg-[#0c0f15]">
                <button
                  type="button"
                  onClick={() => setInstrumentType('futures')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    instrumentType === 'futures'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-white/10 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  Futures
                </button>
                <button
                  type="button"
                  onClick={() => setInstrumentType('cfd')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    instrumentType === 'cfd'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-white/10 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  CFD
                </button>
              </div>
            </div>

            {/* Direction BUY / SELL Segmented Control */}
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-zinc-400">
                Direction du Trade 1
              </label>
              <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80 p-1 dark:border-white/[0.06] dark:bg-[#0c0f15]">
                <button
                  type="button"
                  onClick={() => setDirection('BUY')}
                  className={`flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-semibold transition ${
                    direction === 'BUY'
                      ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 shadow-xs dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                      : 'border border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>BUY (Long)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('SELL')}
                  className={`flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-semibold transition ${
                    direction === 'SELL'
                      ? 'border border-rose-500/30 bg-rose-500/10 text-rose-700 shadow-xs dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30'
                      : 'border border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                  }`}
                >
                  <TrendingDown className="h-4 w-4" />
                  <span>SELL (Short)</span>
                </button>
              </div>
            </div>

            {/* Sizing: Contracts or Lots */}
            {instrumentType === 'futures' ? (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600 dark:text-zinc-400">
                    Contrats NQ
                  </label>
                  <div className="flex gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setFuturesType('NQ')}
                      className={`rounded-md px-2 py-0.5 font-medium transition ${
                        futuresType === 'NQ'
                          ? 'bg-violet-100 text-violet-800 dark:bg-violet-600/30 dark:text-violet-200'
                          : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                      }`}
                    >
                      NQ ($20/pt)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFuturesType('MNQ')}
                      className={`rounded-md px-2 py-0.5 font-medium transition ${
                        futuresType === 'MNQ'
                          ? 'bg-violet-100 text-violet-800 dark:bg-violet-600/30 dark:text-violet-200'
                          : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
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
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 font-mono text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 dark:border-white/[0.08] dark:bg-[#0c0f15] dark:text-zinc-100 dark:focus:border-violet-500/60"
                />
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-zinc-400">
                  Lots CFD Nasdaq
                </label>
                <input
                  type="number"
                  step={customSpec.lotStep}
                  min={customSpec.minLot}
                  value={cfdLots}
                  onChange={(e) => setCfdLots(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 font-mono text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 dark:border-white/[0.08] dark:bg-[#0c0f15] dark:text-zinc-100 dark:focus:border-violet-500/60"
                />
              </div>
            )}

            {/* Inputs: Take Profit & Stop Loss in $ */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-zinc-400">
                  Take Profit ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    +$
                  </span>
                  <input
                    type="number"
                    step="25"
                    min="0"
                    value={tpDollars}
                    onChange={(e) => setTpDollars(e.target.value)}
                    placeholder="1520"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 font-mono text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 dark:border-white/[0.08] dark:bg-[#0c0f15] dark:text-zinc-100 dark:focus:border-emerald-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-zinc-400">
                  Stop Loss ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-medium text-rose-600 dark:text-rose-400">
                    -$
                  </span>
                  <input
                    type="number"
                    step="25"
                    min="0"
                    value={slDollars}
                    onChange={(e) => setSlDollars(e.target.value)}
                    placeholder="2000"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 font-mono text-sm font-semibold text-slate-900 outline-none transition focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 dark:border-white/[0.08] dark:bg-[#0c0f15] dark:text-zinc-100 dark:focus:border-rose-500/60"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Under Inputs: Point Value & 2 KPI Cards */}
          <div className="mt-5 space-y-3 pt-4 border-t border-slate-100 dark:border-white/[0.05]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-zinc-400">Valeur du point :</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-zinc-200">
                ${setupResult.trade1.dollarPerPoint.toFixed(2)} / point
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Distance Take Profit */}
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5 dark:border-white/[0.06] dark:bg-[#141821]/70">
                <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                  Distance Take Profit
                </span>
                <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums dark:text-white">
                  +{setupResult.trade1.tpPoints} pts
                </p>
                <p className="mt-0.5 font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(setupResult.trade1.potentialProfit)}
                </p>
              </div>

              {/* Distance Stop Loss */}
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5 dark:border-white/[0.06] dark:bg-[#141821]/70">
                <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                  Distance Stop Loss
                </span>
                <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums dark:text-white">
                  -{setupResult.trade1.slPoints} pts
                </p>
                <p className="mt-0.5 font-mono text-xs font-medium text-rose-600 dark:text-rose-400">
                  {formatCurrency(setupResult.trade1.potentialLoss)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* CARD 2: TRADE 2 — HEDGE TRADE (PRIMARY FOCUS & RESULTS)   */}
        {/* ========================================================= */}
        <section className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-colors dark:border-white/[0.07] dark:bg-[#10131a] sm:p-6 lg:col-span-7 relative">
          <div className="space-y-5">
            {/* Header: Trade 2 title & Dynamic Direction Badge */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-white/[0.05]">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  Trade 2
                </span>
                <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
                  Hedge Trade (CFD)
                </h2>
              </div>

              {/* Dynamic Direction Badge */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 dark:text-zinc-400">Sens opposé :</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 font-mono text-xs font-bold border ${
                    setupResult.trade2.direction === 'BUY'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
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

            {/* Core Target Input: Take Profit cible du Hedge */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/[0.06] dark:bg-[#141821]/70">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                  Take Profit cible du Hedge ($)
                </label>
                <button
                  type="button"
                  onClick={handleSyncHedgeTpWithSl1}
                  className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-violet-700 transition hover:bg-slate-50 dark:bg-[#0c0f15] dark:border-white/[0.1] dark:text-violet-300 dark:hover:bg-[#171b24]"
                  title="Aligner sur le Stop Loss du Trade 1 pour un Break-Even parfait"
                >
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>Break-Even (${parsedSlDollars})</span>
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  +$
                </span>
                <input
                  type="number"
                  step="25"
                  min="0"
                  value={hedgeTpDollars}
                  onChange={(e) => setHedgeTpDollars(e.target.value)}
                  placeholder="2000"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 font-mono text-base font-semibold text-slate-900 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 dark:border-white/[0.08] dark:bg-[#0c0f15] dark:text-zinc-100 dark:focus:border-violet-500/60"
                />
              </div>
            </div>

            {/* HERO RESULTS: TWO PRIMARY KPIS */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {/* PRIMARY KPI 1: Hedge Size (MOST PROMINENT) */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/[0.06] dark:bg-[#141821]/70">
                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                  Hedge Size
                </span>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 tabular-nums dark:text-white">
                    {setupResult.trade2.calculatedLots.toFixed(2)}
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-500 dark:text-zinc-400">
                    lots CFD
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                  ${setupResult.trade2.dollarPerPoint.toFixed(2)} / pt (${customSpec.dollarPerPointPerLot}/pt/lot)
                </p>
              </div>

              {/* PRIMARY KPI 2: Stop Loss Hedge */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/[0.06] dark:bg-[#141821]/70">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                    Stop Loss Hedge
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                    -{setupResult.trade2.slPoints} pts
                  </span>
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="font-mono text-2xl sm:text-3xl font-extrabold tracking-tight text-rose-600 tabular-nums dark:text-rose-400">
                    -{formatCurrency(setupResult.trade2.slDollars)}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-zinc-400">
                  {setupResult.trade2.calculatedLots.toFixed(2)} lots × {setupResult.trade2.slPoints} pts
                </p>
              </div>
            </div>

            {/* TWO SECONDARY KPIS: Target Hedge & Risk Hedge */}
            <div className="grid grid-cols-2 gap-3">
              {/* Target Hedge */}
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5 dark:border-white/[0.06] dark:bg-[#141821]/70">
                <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                  Target Hedge
                </span>
                <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums dark:text-white">
                  +{setupResult.trade2.tpPoints} pts
                </p>
                <p className="mt-0.5 font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(setupResult.trade2.tpDollars)}
                </p>
              </div>

              {/* Risk Hedge */}
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3.5 dark:border-white/[0.06] dark:bg-[#141821]/70">
                <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                  Risk Hedge
                </span>
                <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums dark:text-white">
                  -{setupResult.trade2.slPoints} pts
                </p>
                <p className="mt-0.5 font-mono text-xs font-medium text-rose-600 dark:text-rose-400">
                  -{formatCurrency(setupResult.trade2.slDollars)}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Copy Setup Action Button */}
          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/[0.05]">
            <span className="text-xs text-slate-500 dark:text-zinc-400">
              Prêt pour exécution MT5
            </span>
            <button
              onClick={handleCopySetup}
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold shadow-xs transition active:scale-95 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-violet-600 text-white hover:bg-violet-500'
              }`}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Setup copié !' : 'Copier le setup MT5'}</span>
            </button>
          </div>
        </section>
      </div>

      {/* ========================================================= */}
      {/* 3. HEDGE & BUFFER SETTINGS (Horizontal Section)           */}
      {/* ========================================================= */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-colors dark:border-white/[0.07] dark:bg-[#10131a] sm:p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
              Hedge &amp; Buffer Settings
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
            Ajustement du Buffer de décalage et règle de coupure du Stop Loss
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6">
          {/* Buffer Input */}
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-zinc-400">
              Buffer (points)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="0"
                value={bufferPoints}
                onChange={(e) => setBufferPoints(e.target.value)}
                placeholder="3"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 pr-10 font-mono text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 dark:border-white/[0.08] dark:bg-[#0c0f15] dark:text-zinc-100 dark:focus:border-violet-500/60"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400 dark:text-zinc-500">
                pts
              </span>
            </div>
          </div>

          {/* SL Level Choice for Hedge */}
          <div>
            <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-zinc-400">
              Niveau du Stop Loss du Hedge
            </label>
            <select
              value={slMode}
              onChange={(e) => setSlMode(e.target.value as HedgeSlMode)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-800 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 dark:border-white/[0.08] dark:bg-[#0c0f15] dark:text-zinc-200 dark:focus:border-violet-500/60"
            >
              <option value="trade1_tp">
                Au TP du Trade 1 ({setupResult.trade1.tpPoints} pts + {parsedBufferPoints} pts buffer)
              </option>
              <option value="trade1_entry">
                À l&apos;Entrée du Trade 1 ({parsedBufferPoints} pts buffer seul)
              </option>
            </select>
          </div>
        </div>

        {/* Discreet Formats & Formules Helper Box */}
        <div className="mt-4 rounded-xl border border-slate-200/60 bg-slate-50/70 p-3.5 text-xs dark:border-white/[0.05] dark:bg-[#141821]/60">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-slate-600 dark:text-zinc-400 font-mono text-[11px]">
            <div>
              <span className="text-slate-400 dark:text-zinc-500 mr-1.5">TP Hedge :</span>
              SL Trade 1 ({setupResult.trade1.slPoints} pts) - Buffer ({parsedBufferPoints} pts) ={' '}
              <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                +{setupResult.trade2.tpPoints} pts
              </strong>
            </div>
            <div>
              <span className="text-slate-400 dark:text-zinc-500 mr-1.5">SL Hedge :</span>
              TP Trade 1 ({setupResult.trade1.tpPoints} pts) + Buffer ({parsedBufferPoints} pts) ={' '}
              <strong className="text-rose-600 dark:text-rose-400 font-semibold">
                -{setupResult.trade2.slPoints} pts
              </strong>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. SCENARIO ANALYSIS (Equal side-by-side cards)           */}
      {/* ========================================================= */}
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
            Scenario Analysis
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Résultat net selon l&apos;issue du marché
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6">
          {/* CARD A: Scenario A (Main Trade Wins) */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-colors dark:border-white/[0.07] dark:bg-[#10131a] sm:p-6">
            <div>
              {/* Header with Green Indicator */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                    Scenario A
                  </span>
                </div>
                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                  Main Trade Wins
                </span>
              </div>

              {/* Line items */}
              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-zinc-400">Main Trade (TP)</span>
                  <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(setupResult.scenarios.scenarioA.trade1PnL)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-zinc-400">
                    Hedge Loss (-{setupResult.trade2.slPoints} pts)
                  </span>
                  <span className="font-mono font-medium text-rose-600 dark:text-rose-400">
                    {formatCurrency(setupResult.scenarios.scenarioA.hedgePnL)}
                  </span>
                </div>
              </div>
            </div>

            {/* Net Result (Separated, Large & Visible) */}
            <div className="mt-5 border-t border-slate-100 pt-4 dark:border-white/[0.05]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Net Result
              </span>
              <p
                className={`mt-1 font-mono text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums ${
                  setupResult.scenarios.scenarioA.netPnL >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {setupResult.scenarios.scenarioA.netPnL >= 0 ? '+' : ''}
                {formatCurrency(setupResult.scenarios.scenarioA.netPnL)}
              </p>
            </div>
          </div>

          {/* CARD B: Scenario B (Hedge Triggered & TP) */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-colors dark:border-white/[0.07] dark:bg-[#10131a] sm:p-6">
            <div>
              {/* Header with Violet Indicator & Break-Even Badge */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-violet-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                    Scenario B
                  </span>
                </div>
                <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                  Break-Even
                </span>
              </div>

              {/* Line items */}
              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-zinc-400">Main Trade Loss (SL)</span>
                  <span className="font-mono font-medium text-rose-600 dark:text-rose-400">
                    {formatCurrency(setupResult.scenarios.scenarioB.trade1PnL)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-zinc-400">
                    Hedge Profit (+{setupResult.trade2.tpPoints} pts)
                  </span>
                  <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(setupResult.scenarios.scenarioB.hedgePnL)}
                  </span>
                </div>
              </div>
            </div>

            {/* Net Result (Separated, Large & Visible) */}
            <div className="mt-5 border-t border-slate-100 pt-4 dark:border-white/[0.05]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                Net Result
              </span>
              <p
                className={`mt-1 font-mono text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums ${
                  Math.abs(setupResult.scenarios.scenarioB.netPnL) < 2
                    ? 'text-slate-800 dark:text-zinc-200'
                    : setupResult.scenarios.scenarioB.netPnL > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {setupResult.scenarios.scenarioB.netPnL >= 0 ? '+' : ''}
                {formatCurrency(setupResult.scenarios.scenarioB.netPnL)}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
