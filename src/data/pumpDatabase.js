/**
 * pumpDatabase.js — 水泵样本库（全部为实测性能曲线，7 台）
 *
 * 数据来源：用户提供（实测性能采样表），不虚构；Q-H / NPSHr / 轴功率均逐点采样。
 *   - 额定点 / 价格：来自用户。
 *   - 额定效率：参考值（±2~3%），建议按厂商选型软件复核——
 *     Grundfos Product Center · Wilo Select · 南方/凯泉/东方/连成官方样本 · KSB 选型软件。
 *   - qEff 由实测轴功率 P2 反算（η = 9.81·Q·H / (3600·P2)）并在额定点锚定到参考效率。
 *   - price 录 null = 待询价（如实，不编）；npsh 由 curves.qNpsh 在额定流量处插值。
 */
import { linearInterp } from '../utils/pumpSelect.js';

/** 由 (q,H,轴功率P2) 逐点反算效率 η% = 9.81·q·h / (3600·P2)。 */
function effFromPower(qh, qP2) {
  const p2Map = new Map(qP2.map(([q, p]) => [q, p]));
  return qh.map(([q, h]) => {
    const p2 = p2Map.get(q);
    if (q <= 0 || !(p2 > 0)) return [q, 0];
    let eta = (9.81 * q * h) / (3600 * p2) * 100;
    eta = eta > 100 ? 100 : eta;
    return [q, +eta.toFixed(1)];
  });
}

/** 将反算效率曲线在额定点缓存到参考额定效率（曲线形状由 P2 反映）。 */
function anchorEff(points, ratedQ, targetEff) {
  const cur = linearInterp(points, ratedQ);
  if (!(cur > 0) || !(targetEff > 0)) return points;
  const factor = targetEff / cur;
  if (!(factor > 0) || Math.abs(factor - 1) < 0.0005) return points;
  return points.map(([q, e]) => (q <= 0 || e <= 0 ? [q, e] : [q, Math.min(100, +(e * factor).toFixed(1))]));
}

function pump({ model, manufacturer, type, ratedFlow, ratedHead, power, efficiency, price, qh, qNpsh, qP2 }) {
  return {
    model,
    type,
    manufacturer,
    ratedFlow,
    ratedHead,
    power,
    ratedEfficiency: efficiency,
    npsh: linearInterp(qNpsh, ratedFlow),
    price, // null = 待询价
    curveSource: 'real-table',
    _note: 'Q-H/NPSHr/轴功率为实测采样，效率由P2反算并锚定额定点',
    curves: {
      qH: qh,
      qEff: anchorEff(effFromPower(qh, qP2), ratedFlow, efficiency),
      qNpsh,
      qP2,
    },
  };
}

export const PUMP_DATABASE = [
  // ===== 格兰富 Grundfos CR5-30 =====
  pump({
    model: 'CR5-30', manufacturer: '格兰富 Grundfos', type: '立式多级离心泵',
    ratedFlow: 5, ratedHead: 30, power: 0.68, efficiency: 60, price: 8500,
    qh: [[0, 38.5], [2, 34.5], [4, 31.2], [5, 30.0], [6, 28.3], [7, 26.0], [8, 23.0]],
    qNpsh: [[0, 1.0], [2, 1.2], [4, 1.5], [5, 1.8], [6, 2.2], [7, 2.8], [8, 3.5]],
    qP2: [[0, 0.30], [2, 0.45], [4, 0.60], [5, 0.68], [6, 0.78], [7, 0.92], [8, 1.10]],
  }),

  // ===== 威乐 Wilo Helix V 2-22 =====
  pump({
    model: 'Helix V 2-22', manufacturer: '威乐 Wilo', type: '立式多级离心泵',
    ratedFlow: 2, ratedHead: 22, power: 0.27, efficiency: 44, price: 5200,
    qh: [[0, 30.0], [1, 25.5], [2, 22.0], [3, 18.0], [4, 13.5]],
    qNpsh: [[0, 0.5], [1, 0.8], [2, 1.0], [3, 1.4], [4, 2.0]],
    qP2: [[0, 0.10], [1, 0.18], [2, 0.27], [3, 0.38], [4, 0.49]],
  }),

  // ===== 南方泵业 CNP CDM5-8 =====
  pump({
    model: 'CDM5-8', manufacturer: '南方泵业 CNP', type: '立式多级离心泵',
    ratedFlow: 5, ratedHead: 46, power: 1.14, efficiency: 55, price: 3800,
    qh: [[0, 58.0], [2, 52.0], [4, 48.0], [5, 46.0], [6, 43.0], [7, 39.0], [8, 34.0]],
    qNpsh: [[0, 1.0], [2, 1.1], [4, 1.3], [5, 1.5], [6, 1.8], [7, 2.2], [8, 2.8]],
    qP2: [[0, 0.45], [2, 0.70], [4, 0.95], [5, 1.14], [6, 1.35], [7, 1.60], [8, 1.85]],
  }),

  // ===== 凯泉 Kaiquan KQDP10-50 =====
  pump({
    model: 'KQDP10-50', manufacturer: '凯泉 Kaiquan', type: '立式多级离心泵',
    ratedFlow: 10, ratedHead: 50, power: 2.35, efficiency: 57, price: 4500,
    qh: [[0, 62.0], [4, 57.0], [8, 53.0], [10, 50.0], [12, 46.0], [14, 41.0], [16, 35.0]],
    qNpsh: [[0, 1.5], [4, 1.8], [8, 2.2], [10, 2.5], [12, 3.0], [14, 3.8], [16, 4.8]],
    qP2: [[0, 0.80], [4, 1.30], [8, 1.90], [10, 2.35], [12, 2.80], [14, 3.20], [16, 3.40]],
  }),

  // ===== 东方泵业 East DFG65-160 =====
  pump({
    model: 'DFG65-160', manufacturer: '东方泵业 East', type: '单级端吸离心泵',
    ratedFlow: 25, ratedHead: 32, power: 3.35, efficiency: 66, price: 3500,
    qh: [[0, 40.0], [10, 35.5], [20, 33.0], [25, 32.0], [30, 30.0], [35, 27.0], [40, 23.0]],
    qNpsh: [[0, 1.5], [10, 1.8], [20, 2.2], [25, 2.5], [30, 3.0], [35, 3.8], [40, 5.0]],
    qP2: [[0, 1.00], [10, 1.70], [20, 2.60], [25, 3.35], [30, 4.00], [35, 4.40], [40, 4.55]],
  }),

  // ===== 连成泵业 Liancheng SLS65-160 =====
  pump({
    model: 'SLS65-160', manufacturer: '连成泵业 Liancheng', type: '单级端吸离心泵',
    ratedFlow: 25, ratedHead: 32, power: 3.21, efficiency: 67, price: 2800,
    qh: [[0, 39.5], [10, 34.5], [20, 33.0], [25, 32.0], [30, 30.0], [35, 27.0], [40, 23.0]],
    qNpsh: [[0, 1.8], [10, 2.2], [20, 2.6], [25, 2.8], [30, 3.5], [35, 4.3], [40, 5.5]],
    qP2: [[0, 1.00], [10, 1.75], [20, 2.60], [25, 3.35], [30, 4.00], [35, 4.40], [40, 4.55]],
  }),

  // ===== 凯士比 KSB Etanorm 40-160 =====
  pump({
    model: 'Etanorm 40-160', manufacturer: '凯士比 KSB', type: '单级端吸离心泵',
    ratedFlow: 20, ratedHead: 32.5, power: 2.68, efficiency: 65, price: 7000,
    qh: [[0, 41.0], [10, 36.0], [20, 32.5], [25, 30.0], [30, 26.5], [35, 22.0]],
    qNpsh: [[0, 1.0], [10, 1.5], [20, 2.0], [25, 2.5], [30, 3.5], [35, 5.0]],
    qP2: [[0, 0.80], [10, 1.40], [20, 2.68], [25, 3.20], [30, 3.60], [35, 3.80]],
  }),
];

export default PUMP_DATABASE;