/**
 * NASDAQ / NQ Symbol Specifications & Hedge Math Engine
 * Supports Futures (E-mini NQ, Micro MNQ) and CFD Nasdaq (MT5 / Prop Firms).
 * Pure points & dollar model without requiring absolute index entry price.
 */

export type InstrumentType = 'futures' | 'cfd';
export type TradeDirection = 'BUY' | 'SELL';
export type HedgeSlMode = 'trade1_tp' | 'trade1_entry';

export interface SymbolSpec {
  id: string;
  name: string;
  description: string;
  pointSize: number;            // Size of 1 index price unit (usually 1.0 or 0.01 for MT5 _Point)
  tickSize: number;             // Minimum price movement (e.g., 0.25 on NQ, 0.01 or 0.1 on CFD)
  tickValue: number;            // Dollar value of 1 tick per 1 lot
  dollarPerPointPerLot: number; // Value of 1.0 index point move for 1 lot (e.g., $1.00 or $20.00)
  lotStep: number;              // Minimum lot increment (e.g., 0.01 or 0.1)
  minLot: number;               // Minimum lot size allowed (e.g., 0.01 or 0.1)
  maxLot: number;               // Maximum lot size allowed
  spreadDefaultPoints: number;  // Typical spread in points (e.g., 1.5 pts)
}

export interface FuturesSpec {
  id: 'NQ' | 'MNQ' | 'CUSTOM';
  name: string;
  description: string;
  dollarPerPointPerContract: number; // NQ = $20/pt, MNQ = $2/pt
  tickSize: number;                  // 0.25 pts
  tickValue: number;                 // NQ = $5.00, MNQ = $0.50
}

export const FUTURES_PRESETS: Record<'NQ' | 'MNQ', FuturesSpec> = {
  NQ: {
    id: 'NQ',
    name: 'NQ (E-mini Nasdaq)',
    description: '$20 / point ($5.00 / 0.25 tick)',
    dollarPerPointPerContract: 20,
    tickSize: 0.25,
    tickValue: 5.0,
  },
  MNQ: {
    id: 'MNQ',
    name: 'MNQ (Micro E-mini)',
    description: '$2 / point ($0.50 / 0.25 tick)',
    dollarPerPointPerContract: 2,
    tickSize: 0.25,
    tickValue: 0.5,
  },
};

export const CFD_PRESETS: SymbolSpec[] = [
  {
    id: 'prop_firm_standard',
    name: 'Prop Firm Standard ($1 / point)',
    description: 'FTMO, FundedNext, Alpha Capital (1 lot = $1/point)',
    pointSize: 1.0,
    tickSize: 0.01,
    tickValue: 0.01,
    dollarPerPointPerLot: 1.0,
    lotStep: 0.01,
    minLot: 0.01,
    maxLot: 100.0,
    spreadDefaultPoints: 1.5,
  },
  {
    id: 'broker_institutional',
    name: 'Broker Institutional ($20 / point)',
    description: 'IC Markets, Pepperstone contract size 20 (1 lot = $20/point)',
    pointSize: 1.0,
    tickSize: 0.25,
    tickValue: 5.0,
    dollarPerPointPerLot: 20.0,
    lotStep: 0.01,
    minLot: 0.01,
    maxLot: 50.0,
    spreadDefaultPoints: 1.0,
  },
  {
    id: 'mt5_point_01',
    name: 'MT5 2-Decimales (Point = 0.01)',
    description: '1 point de cotation = 0.01, 100 points = 1.0 index point',
    pointSize: 0.01,
    tickSize: 0.01,
    tickValue: 0.01,
    dollarPerPointPerLot: 1.0,
    lotStep: 0.01,
    minLot: 0.01,
    maxLot: 100.0,
    spreadDefaultPoints: 2.0,
  },
];

export interface Trade1Input {
  instrumentType: InstrumentType;
  futuresType: 'NQ' | 'MNQ';
  customFuturesDollarPerPoint?: number;
  direction: TradeDirection;
  tpDollars: number;
  slDollars: number;
  contracts: number; // If futures
  lots: number;      // If CFD
}

export interface HedgeSettings {
  hedgeTpDollars: number;       // The target Take Profit amount in $ for the Hedge
  bufferPoints: number;         // The buffer in points
  slMode: HedgeSlMode;          // Where is Hedge SL: at Trade 1 TP, or Trade 1 Entry
}

export interface CompleteSetupResult {
  trade1: {
    instrument: string;
    direction: TradeDirection;
    contractsOrLots: number;
    sizeLabel: string;
    dollarPerPoint: number;
    tpDollars: number;
    slDollars: number;
    tpPoints: number;
    slPoints: number;
    potentialProfit: number;
    potentialLoss: number;
  };
  trade2: {
    instrument: string;
    direction: TradeDirection;
    calculatedLots: number;
    rawLots: number;
    dollarPerPoint: number;
    bufferPoints: number;
    tpPoints: number;
    slPoints: number;
    tpDollars: number;
    slDollars: number;
    potentialProfit: number;
    potentialLoss: number;
  };
  scenarios: {
    // Scenario A: Trade 1 hits TP, Hedge stopped out
    scenarioA: {
      name: string;
      trade1PnL: number;
      hedgePnL: number;
      netPnL: number;
      status: 'win' | 'breakeven' | 'loss';
    };
    // Scenario B: Trade 1 hits SL, Hedge hits TP
    scenarioB: {
      name: string;
      trade1PnL: number;
      hedgePnL: number;
      netPnL: number;
      status: 'win' | 'breakeven' | 'loss';
    };
  };
  specsUsed: SymbolSpec;
}

/**
 * Rounds a number to the nearest tick step
 */
export function roundToStep(value: number, step: number): number {
  if (step <= 0) return value;
  const inv = 1.0 / step;
  return Math.round(value * inv) / inv;
}

/**
 * Calculates the complete Main Trade + Hedge Trade setup based on Points, Dollars and Buffer:
 * - Trade 2 TP Points = Trade 1 SL Points - Buffer
 * - Trade 2 SL Points = Trade 1 TP Points + Buffer
 * - Hedge Lots = Hedge TP $ / (Trade 2 TP Points * $/pt per lot)
 * - Hedge SL $ = Trade 2 SL Points * Hedge Lots * ($/pt per lot)
 */
export function calculateHedgeSetup(
  trade1: Trade1Input,
  hedgeSettings: HedgeSettings,
  cfdSpec: SymbolSpec
): CompleteSetupResult {
  // 1. Calculate Trade 1 Dollar per point
  let trade1DollarPerPoint = 0;
  let trade1SizeLabel = '';
  let trade1InstrumentLabel = '';

  if (trade1.instrumentType === 'futures') {
    const spec = FUTURES_PRESETS[trade1.futuresType] || FUTURES_PRESETS.NQ;
    const ratePerContract = trade1.customFuturesDollarPerPoint || spec.dollarPerPointPerContract;
    trade1DollarPerPoint = ratePerContract * Math.max(1, trade1.contracts);
    trade1SizeLabel = `${trade1.contracts} contrat${trade1.contracts > 1 ? 's' : ''}`;
    trade1InstrumentLabel = spec.name;
  } else {
    trade1DollarPerPoint = cfdSpec.dollarPerPointPerLot * Math.max(cfdSpec.minLot, trade1.lots);
    trade1SizeLabel = `${trade1.lots.toFixed(2)} lots`;
    trade1InstrumentLabel = `CFD Nasdaq (${cfdSpec.name})`;
  }

  // 2. Convert TP $ and SL $ to Points for Trade 1
  const t1TpPoints = trade1DollarPerPoint > 0 ? trade1.tpDollars / trade1DollarPerPoint : 0;
  const t1SlPoints = trade1DollarPerPoint > 0 ? trade1.slDollars / trade1DollarPerPoint : 0;

  // 3. Trade 2 (Hedge) Direction: ALWAYS opposite to Trade 1
  const hedgeDirection: TradeDirection = trade1.direction === 'BUY' ? 'SELL' : 'BUY';

  // 4. Points to TP for Hedge Trade:
  // "le point du buffer on soustrait au sl du trade 1 sa donne le tp points du trade 2"
  const buffer = Math.max(0, hedgeSettings.bufferPoints || 0);
  const rawHedgeTpPoints = Math.max(0.1, t1SlPoints - buffer);
  const hedgeTpPoints = Number(rawHedgeTpPoints.toFixed(2));

  // 5. Calculate Hedge Lot Size from Hedge TP $ and Hedge TP Points:
  // Lots = Hedge TP $ / (Hedge TP Points * $/pt per lot)
  const targetHedgeTpDollars = Math.max(0, hedgeSettings.hedgeTpDollars);
  const dollarPerLotOnDistance = cfdSpec.dollarPerPointPerLot * hedgeTpPoints;
  const rawLots = dollarPerLotOnDistance > 0 ? targetHedgeTpDollars / dollarPerLotOnDistance : 0;

  // Quantize lots to broker lotStep, minLot, and maxLot
  let calculatedLots = roundToStep(rawLots, cfdSpec.lotStep);
  calculatedLots = Math.max(cfdSpec.minLot, Math.min(cfdSpec.maxLot, calculatedLots));

  const hedgeDollarPerPoint = calculatedLots * cfdSpec.dollarPerPointPerLot;

  // 6. Points to SL for Hedge Trade:
  // "pour le point afficher dans tp on ajoute le montant du point au tp du trade 1 sa donne le sl en point du trade 2"
  let rawHedgeSlPoints = 0;
  if (hedgeSettings.slMode === 'trade1_entry') {
    // Stopped out at Trade 1 Entry level
    rawHedgeSlPoints = Math.max(0.1, buffer);
  } else {
    // Stopped out when Trade 1 reaches its TP: TP Trade 1 + Buffer
    rawHedgeSlPoints = Math.max(0.1, t1TpPoints + buffer);
  }
  const hedgeSlPoints = Number(rawHedgeSlPoints.toFixed(2));

  // 7. Calculate Hedge SL in dollars using the calculated lots:
  // Hedge SL $ = Hedge SL Points * Hedge Lots * ($/pt per lot)
  const calculatedHedgeSlDollars = Number((hedgeSlPoints * hedgeDollarPerPoint).toFixed(2));

  // Actual Hedge TP in dollars with the quantized lots:
  const actualHedgeTpDollars = Number((hedgeTpPoints * hedgeDollarPerPoint).toFixed(2));

  // 8. Scenario Outcomes:
  // Scenario A: Trade 1 reaches TP (Winner), Hedge hits SL (stopped out)
  const t1ProfitA = trade1.tpDollars;
  const hedgeLossA = -calculatedHedgeSlDollars;
  const netPnLA = t1ProfitA + hedgeLossA;

  // Scenario B: Trade 1 hits SL (Stopped out), Hedge reaches TP (Winner)
  const t1LossB = -trade1.slDollars;
  const hedgeProfitB = actualHedgeTpDollars;
  const netPnLB = t1LossB + hedgeProfitB;

  return {
    trade1: {
      instrument: trade1InstrumentLabel,
      direction: trade1.direction,
      contractsOrLots: trade1.instrumentType === 'futures' ? trade1.contracts : trade1.lots,
      sizeLabel: trade1SizeLabel,
      dollarPerPoint: trade1DollarPerPoint,
      tpDollars: trade1.tpDollars,
      slDollars: trade1.slDollars,
      tpPoints: Number(t1TpPoints.toFixed(2)),
      slPoints: Number(t1SlPoints.toFixed(2)),
      potentialProfit: trade1.tpDollars,
      potentialLoss: -trade1.slDollars,
    },
    trade2: {
      instrument: `CFD Nasdaq (${cfdSpec.name})`,
      direction: hedgeDirection,
      calculatedLots: Number(calculatedLots.toFixed(2)),
      rawLots: Number(rawLots.toFixed(3)),
      dollarPerPoint: Number(hedgeDollarPerPoint.toFixed(2)),
      bufferPoints: buffer,
      tpPoints: hedgeTpPoints,
      slPoints: hedgeSlPoints,
      tpDollars: actualHedgeTpDollars,
      slDollars: calculatedHedgeSlDollars,
      potentialProfit: actualHedgeTpDollars,
      potentialLoss: -calculatedHedgeSlDollars,
    },
    scenarios: {
      scenarioA: {
        name: 'Trade 1 TP atteint (Rebond / Victoire)',
        trade1PnL: t1ProfitA,
        hedgePnL: hedgeLossA,
        netPnL: Number(netPnLA.toFixed(2)),
        status: netPnLA > 0 ? 'win' : netPnLA === 0 ? 'breakeven' : 'loss',
      },
      scenarioB: {
        name: 'Trade 1 SL atteint (Hedge TP atteint)',
        trade1PnL: t1LossB,
        hedgePnL: hedgeProfitB,
        netPnL: Number(netPnLB.toFixed(2)),
        status: Math.abs(netPnLB) < 2 ? 'breakeven' : netPnLB > 0 ? 'win' : 'loss',
      },
    },
    specsUsed: cfdSpec,
  };
}
