/**
 * engine.js — 众口一词的编排层（单一入口，供 UI 调用）
 *
 * runDesign({ building, scale, level }) →
 *   {
 *     profile,              建筑类型档案
 *     flow:  { q(L/s), qM3h, meta }       设计流量（带标准元信息）
 *     head:  { h(m), breakdown }          设计扬程
 *     reliability,                        可靠等级构筑计划（主荐/并列）
 *     pumps: { candidates, scenarios }    选泵 + 方案
 *   }
 *
 * 界面只调用这一个函数；替换真实泵库只需改 pumpDatabase.js，此层与 UI 均不动。
 */
import { getBuilding } from './buildingRegistry.js';
import { calcDesignFlowDetailed } from './demand/waterDemand.js';
import { designHead } from './sizing.js';
import { planBuilding } from './reliability.js';
import { selectPumps } from './pumpSelect.js';
import { PUMP_DATABASE } from '../data/pumpDatabase.js';

const LPS_TO_M3H = 3.6;

export function runDesign({ building, scale = {}, level }) {
  const profile = getBuilding(building);
  const flow = calcDesignFlowDetailed(profile, scale); // { q(L/s), meta }
  const h = designHead(scale); // m
  const reliability = planBuilding(profile, level);

  const qDesignM3h = flow.q * LPS_TO_M3H;
  const pumps = selectPumps(
    { qDesign: qDesignM3h, hDesign: h, qAvg: qDesignM3h * 0.7, npshaOpts: {} },
    PUMP_DATABASE,
    { cost: { pricePerKwh: 0.7, annualHours: 3000, years: 10 } }
  );

  return {
    profile,
    flow: { ...flow, qM3h: qDesignM3h },
    head: { h, scale },
    reliability,
    pumps: {
      ...pumps,
      available: pumps.scenarios.length > 0,
      // 主荐：按其 mainType 在方案中命中；找不到则取第一方案。
      main: pumps.scenarios.find((s) => s.type === reliability.mainType) || pumps.scenarios[0] || null,
      // 并列对比：其余方案（含本等级的非主荐）
      alternatives: pumps.scenarios.filter((s) => s.type !== reliability.mainType),
    },
  };
}

export { PUMP_DATABASE };