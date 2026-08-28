/**
 * pumpSelect.js — 建筑给水泵选型核心算法（纯 JS，无 UI 依赖，可独立测试）
 *
 * 参考依据：
 *  - GB 50015-2019《建筑给水排水设计标准》
 *      · 住宅生活给水设计秒流量：概率法（3.6.4/3.6.5，αc–U0 系数表）
 *      · 公共建筑生活给水设计秒流量：器具当量 / 同时给水百分数法
 *      · 设计扬程：H = H1(高差) + H2(沿程+局部水损) + H3(水表) + H4(最低工作压力)
 *  - 水泵工况点校核、必需气蚀余量 NPSHr、轴功率计算按泵学通常做法
 *
 * 数据说明：本模块不携带泵样本数据，仅消费外部传入的 pump database
 * （见 src/data/pumpDatabase.js）。样本数据必须有真实厂家来源。
 *
 * 单位约定：
 *  - 流量 Q  ：m³/h
 *  - 扬程 H  ：m（水柱）
 *  - 功率    ：kW
 *  - 效率 η  ：%（0~100 的小数用 fraction 传参时 ×0.01）
 *  - 压力    ：MPa（NPSH 校核时内部按换算）
 */

/* ============================================================
 * 1. 基础工具
 * ============================================================ */

/** 一维线性插值：给定有序点集 [[x0,y0],[x1,y1],...]，求 x 处 y。
 *  超过两端时做 clamp（不外推，稳定边界值）。 */
export function linearInterp(points, x) {
  if (!points || points.length === 0) return null;
  if (points.length === 1) return points[0][1];
  if (x <= points[0][0]) return points[0][1];
  const last = points[points.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    if (x >= x0 && x <= x1) {
      const t = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return last[1];
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ============================================================
 * 2. 设计流量 Q（GB 50015）
 * ============================================================ */

/**
 * GB 50015-2019 表 3.6.5-2：不同 U0 对应的 αc 系数
 * U0 为给水当量平均出流概率（%）。此处给常用离散点，插值使用。
 */
const ALPHA_BY_U0 = [
  [0.8, 0.340],
  [1.0, 0.324],
  [1.2, 0.310],
  [1.4, 0.298],
  [1.6, 0.287],
  [1.8, 0.277],
  [2.0, 0.269],
  [2.2, 0.261],
  [2.4, 0.254],
  [2.6, 0.248],
  [2.8, 0.242],
  [3.0, 0.237],
  [3.5, 0.224],
  [4.0, 0.213],
  [4.5, 0.203],
  [5.0, 0.194],
  [6.0, 0.180],
  [8.0, 0.157],
];

/** 由 U0（%）取 αc，范围外 clamp。 */
export function alphaByU0(u0Percent) {
  if (u0Percent <= ALPHA_BY_U0[0][0]) return ALPHA_BY_U0[0][1];
  return linearInterp(ALPHA_BY_U0, u0Percent);
}

/**
 * 住宅给水当量平均出流概率 U0（GB 50015）
 * @param {object} o
 * @param {number} o.q0PerCapitaDay 每户最高日用水定额，L/(人·d)
 * @param {number} o.peoplePerHome   每户用水人数，人
 * @param {number} o.kh              小时变化系数
 * @param {number} o.Ng              计算管段卫生器具给水当量总数
 * @param {number} o.usageHours      每日使用时间 T，h（住宅取 24）
 * @returns {number} U0（%）
 */
export function computeResidentialU0(o) {
  const { q0PerCapitaDay, peoplePerHome, kh, Ng, usageHours } = o;
  if (Ng <= 0 || usageHours <= 0) return 0;
  const denom = 0.2 * Ng * usageHours * 3600;
  if (denom <= 0) return 0;
  const u0Raw = (q0PerCapitaDay * peoplePerHome * kh) / denom; // 小数
  return u0Raw * 100; // → %
}

/**
 * 计算管段卫生器具给水当量的同时出流概率 U（小数）
 * U = (1 + αc·(Ng-1)^0.49) / √Ng，取 0.01 ≤ U ≤ 1
 */
export function simultaneousProbU(u0Percent, Ng) {
  if (Ng <= 0) return 0;
  const ac = alphaByU0(u0Percent);
  const uRaw = (1 + ac * Math.pow(Ng - 1, 0.49)) / Math.sqrt(Ng);
  return clamp(uRaw, 0.01, 1);
}

/**
 * 住宅设计秒流量（概率法）
 * @returns {number}  L/s
 */
export function residentialDesignFlowLS(Ng, u0Percent) {
  const U = simultaneousProbU(u0Percent, Ng);
  return 0.2 * Ng * U;
}

/**
 * 公共建筑设计秒流量（简化器具同时给水百分数法）。
 * 适用于宾馆、酒店、医院、办公楼等。为工程估算口径，
 * 精确值应由按各器具逐项核算完成，或直接输入设计秒流量。
 * qg = Σ (单个器具额定流量 × 数量 × 同时给水百分数)
 */
export function publicDesignFlowLS(geGuards) {
  return geGuards.reduce((sum, g) => {
    const q = g.flowLPS || 0;          // 单器具额定流量 L/s
    const n = g.count || 0;            // 数量
    const b = (g.simultaneousPercent || 0) / 100; // 同时使用百分数（%）
    return sum + q * n * b;
  }, 0);
}

/* ============================================================
 * 3. 设计扬程 H
 * ============================================================ */

/**
 * 计算设计扬程 H = H1 + H2 + H3 + H4
 * @param {object} o
 * @param {number} o.h1 最不利点与引入管网标高差，m
 * @param {number} o.h2 管路沿程+局部水头损失，m（可由 calcFrictionLoss 估算）
 * @param {number} o.h3 水表水头损失，m
 * @param {number} o.h4RequiredMPa 最不利点所需最低工作压力，MPa
 * @returns {number} 设计扬程 H，m
 */
export function computeHead(o) {
  const { h1 = 0, h2 = 0, h3 = 0, h4RequiredMPa = 0.05 } = o;
  const h4M = h4RequiredMPa * 100; // MPa → m 水柱（g≈10）
  return h1 + h2 + h3 + h4M;
}

/**
 * 简化管损估算：沿程 + 局部。
 * h2 = (1 + 局部系数) × 平均比摩阻 × 管长
 * @param {object} o
 * @param {number} o.length 引入管至最不利点管长，m
 * @param {number} o.gradient 平均比摩阻 i（给水管道常用 0.050~0.120 MPa/km 或 0.10~0.15 m/m）
 * @param {number} o.localFactor 局部占沿程比例（0.3~0.5）
 */
export function calcFrictionLoss(o) {
  const { length = 0, gradient = 0.12, localFactor = 0.4 } = o;
  return (1 + localFactor) * gradient * length;
}

/* ============================================================
 * 4. 泵工况点校核
 * ============================================================ */

/**
 * 泵在 Q 处的扬程（由样本 Q-H 曲线插值）。
 * 若样本同时给了"高效区流量区间"，先用它判断是否在高效区。
 * @returns {number|null}
 */
export function pumpHeadAtQ(pump, Q) {
  if (!pump || !pump.curves || !pump.curves.qH) return null;
  return linearInterp(pump.curves.qH, Q);
}

/** 泵在 Q 处的效率（%），由样本 Q-效率 曲线插值；缺失则退回额定效率。 */
export function pumpEfficiencyAtQ(pump, Q) {
  if (pump && pump.curves && pump.curves.qEff && pump.curves.qEff.length) {
    return linearInterp(pump.curves.qEff, Q);
  }
  return pump ? pump.ratedEfficiency : 0;
}

/**
 * 轴功率 P = ρ·g·Q·H / η，kW
 * @param {number} q m³/h
 * @param {number} h m
 * @param {number} eta 效率（%，如 62）
 */
export function calcShaftPower(q, h, eta) {
  if (q <= 0 || h <= 0 || eta <= 0) return 0;
  const Qms = q / 3600; // m³/s
  return (1000 * 9.81 * Qms * h) / (eta / 100) / 1000; // kW
}

/**
 * 可用气蚀余量 NPSHa ≈ Pa(当地大气压) ± 吸上扬程 − 吸入管损 − 水温饱和蒸汽压
 * @param {object} o
 * @param {number} o.atmMPa     当地大气压，MPa（常压约 0.1013，海拔升高变小）
 * @param {number} o.suctionM   吸液面至泵中心高差，m（正为倒灌/正吸，负为吸上扬程）
 * @param {number} o.lossM      吸入侧管损，m
 * @param {number} o.vaporM     输送水温饱和蒸汽压对应水柱，m（常温水约 0.24m）
 * @returns {number} NPSHa，m
 */
export function calcNpsha(o) {
  const { atmMPa = 0.1013, suctionM = 0, lossM = 0, vaporM = 0.24 } = o;
  const atmM = atmMPa * 100; // MPa → m
  return atmM + suctionM - lossM - vaporM;
}

/**
 * 泵是否可作为候选（工况校核）：
 *   1) 设计流量 Q 在泵高效区（若样本给定高效流量区间）
 *   2) 泵在 Q 处的可提供扬程 ≥ 需求扬程 H
 *   3) NPSHr < NPSHa
 * @returns {object} { ok, reason, headAtQ, etaAtQ }
 */
export function checkPumpCandidate(pump, req, opts = {}) {
  const { qReq, hReq, npshaOpts } = req;
  const reason = [];
  let ok = true;

  // (1) 高效区 / 允许流量范围
  const effLo = pump.ratedFlow * (opts.effLowRatio ?? 0.7);
  const effHi = pump.ratedFlow * (opts.effHighRatio ?? 1.2);
  if (qReq < effLo || qReq > effHi) {
    ok = false;
    reason.push(`设计流量 ${qReq.toFixed(2)} m³/h 不在高效区[${effLo.toFixed(1)}, ${effHi.toFixed(1)}]`);
  }

  // (2) Q-H 工况校核
  const headAtQ = pumpHeadAtQ(pump, qReq);
  if (headAtQ == null) {
    if (qReq > pump.ratedFlow) ok = false;
  } else if (headAtQ < hReq - (opts.headTolerance ?? 0.5)) {
    ok = false;
    reason.push(`Q-H 曲线在 ${qReq} m³/h 时扬程 ${headAtQ.toFixed(1)}m < 需求 ${hReq}m`);
  }

  // (3) 气蚀校核：优先用样本 NPSHr-Q 曲线按工况流量插值，否则退到单点 npsh。
  const npsha = calcNpsha(npshaOpts || {});
  const npshrAtQ = pump.curves && pump.curves.qNpsh ? linearInterp(pump.curves.qNpsh, qReq) : pump.npsh;
  if (npsha > 0 && npshrAtQ != null && npshrAtQ >= npsha) {
    ok = false;
    reason.push(`NPSHr ${npshAtQ.toFixed(1)}m ≥ NPSHa ${npsha.toFixed(1)}m，易汽蚀`);
  }

  return {
    ok,
    reason,
    headAtQ,
    etaAtQ: pumpEfficiencyAtQ(pump, qReq),
    npsha,
  };
}

/* ============================================================
 * 5. 成本估算
 * ============================================================ */

/**
 * 年运行电费
 * @param {object} o
 * @param {number} o.q      工况流量，m³/h
 * @param {number} o.h      扬程，m
 * @param {number} o.eta    效率（%）
 * @param {number} o.hours  年运行小时，h/a
 * @param {number} o.price  电价，元/kWh
 * @param {number} o.units  运行泵台数
 * @returns {number} 元/年
 */
export function annualEnergyCost(o) {
  const { q, h, eta, hours = 3000, price = 0.7, units = 1 } = o;
  const p = calcShaftPower(q, h, eta);
  return p * units * hours * price;
}

/**
 * 单方案生命周期 10 年总成本（初投资 + 电费 + 维护）
 */
export function lifeCycleCost(initialInvest, annualEnergy, annualMaint = 1000, years = 10) {
  return initialInvest + (annualEnergy + annualMaint) * years;
}

/* ============================================================
 * 6. 方案生成
 * ============================================================ */

/**
 * 生成选型方案。
 * @param {object} o
 * @param {number} o.qDesign 设计流量 m³/h
 * @param {number} o.hDesign 设计扬程 m
 * @param {number} o.qAvg 平均运行流量（用于变频/能耗估算），默认 0.7×qDesign
 * @param {object} o.opts pumpSelect 配置 { effLowRatio, effHighRatio, ... }
 * @param {object} o.cost 经济参数 { pricePerKwh, annualHours, years, annualMaintPerPump, vfdCost }
 * @returns {Array<object>} 方案数组
 */
export function buildScenarios(o) {
  const { qDesign, hDesign, qAvg = qDesign * 0.7, opts = {}, cost = {} } = o;
  const pricePerKwh = cost.pricePerKwh ?? 0.7;
  const annualHours = cost.annualHours ?? 3000;
  const years = cost.years ?? 10;
  const annualMaint = cost.annualMaintPerPump ?? 1000;
  const vfdCost = cost.vfdCost ?? 4500;
  const scenarios = [];
  // 各方案的目标流量档不同（单泵全流量 vs 并联分割），
  // 因此每个方案独立对【完整样本库】筛选，而非用被单泵预筛缩小的候选池。
  const pool = o.database || o.candidates || [];

  // 价格未知（如"不详"，录为 null）时，初投资记 null → 界面显示"待询价"，不虚构价格、不误排为 0 元。
  const invest = (p, n) => (typeof p.price === 'number' ? p.price * n : null);
  const lifecycle = (inv, energy, maint, n) => (inv == null ? null : lifeCycleCost(inv, energy, maint, years));
  const quote = (p) => ({ quotePending: !(typeof p.price === 'number') });

  // —— 方案：经济型（一用一备，单泵全流量）——
  {
    const pumps = pool.filter((p) => checkPumpCandidate(p, { qReq: qDesign, hReq: hDesign, npshaOpts: o.npshaOpts }, opts).ok);
    if (pumps.length) {
      const pump = pumps[0];
      const eta = pumpEfficiencyAtQ(pump, qDesign);
      const energy = annualEnergyCost({ q: qDesign, h: hDesign, eta, hours: annualHours, price: pricePerKwh, units: 1 });
      scenarios.push({
        type: '经济型',
        config: `一用一备`,
        control: '手动 / 自动切换',
        pumps: [pump.model, `${pump.model}(备)`],
        model: pump.model,
        q: qDesign,
        h: hDesign,
        eta,
        ...quote(pump),
        initialInvest: invest(pump, 2),
        annualEnergy: energy,
        lcc: lifecycle(invest(pump, 2), energy, annualMaint * 2, years),
        advantage: '初投资低',
        scenario: '小规模、流量稳定',
        detail: pumps.map((p) => `单台流量 ${qDesign}m³/h，扬程选型于 Q-H 曲线覆盖内`),
      });
    }
  }

  // —— 方案：并联型（两用一备，每台 Q/2）——
  {
    const runUnits = 2;
    const qShare = qDesign / runUnits;
    const shares = pool.filter((p) =>
      checkPumpCandidate(p, { qReq: qShare, hReq: hDesign, npshaOpts: o.npshaOpts }, opts).ok
    );
    if (shares.length) {
      const pump = shares[0];
      const eta = pumpEfficiencyAtQ(pump, qShare);
      const energy = annualEnergyCost({ q: qShare, h: hDesign, eta, hours: annualHours, price: pricePerKwh, units: runUnits });
      scenarios.push({
        type: '并联型',
        config: `${runUnits}用1备`,
        control: '循环软启动',
        pumps: [pump.model, `${pump.model}(2)`, `${pump.model}(备)`],
        model: pump.model,
        q: qShare,
        h: hDesign,
        eta,
        ...quote(pump),
        initialInvest: invest(pump, 3),
        annualEnergy: energy,
        lcc: lifecycle(invest(pump, 3), energy, annualMaint * 3, years),
        advantage: '流量调节范围大',
        scenario: '流量变化大',
        detail: [`单台运行流量 ${qShare}m³/h，${runUnits} 台并联（理论并联流量略小于单台×2，校核时建议复算）`],
      });
    }
  }

  // —— 方案：变频恒压（一用一备+变频器，PID 恒压）——
  {
    const pumps = pool.filter((p) => checkPumpCandidate(p, { qReq: qDesign, hReq: hDesign, npshaOpts: o.npshaOpts }, opts).ok);
    if (pumps.length) {
      const pump = pumps[0];
      const eta = pumpEfficiencyAtQ(pump, qDesign);
      // 变频恒压：按平均流量对应工况估能耗，压力恒定故扬程按需求
      const energy = annualEnergyCost({ q: qAvg, h: hDesign, eta, hours: annualHours, price: pricePerKwh, units: 1 });
      scenarios.push({
        type: '变频恒压',
        config: `一用一备 + 变频器`,
        control: 'PID 恒压供水',
        pumps: [pump.model, `${pump.model}(备)`],
        model: pump.model,
        q: qDesign,
        h: hDesign,
        eta,
        ...quote(pump),
        initialInvest: invest(pump, 2) == null ? null : invest(pump, 2) + vfdCost,
        annualEnergy: energy,
        lcc: lifecycle(invest(pump, 2) == null ? null : invest(pump, 2) + vfdCost, energy, annualMaint * 2, years),
        advantage: '节能、舒适',
        scenario: '高层住宅 / 写字楼',
        detail: [`设定压力恒定为 ${hDesign}m，流量由变频自动调节，节能运行工况按平均流量 ${qAvg}m³/h 估算`],
      });
    }
  }

  // —— 方案：冗余型（N+1 备用，可靠优先）——
  {
    const pumps = pool.filter((p) => checkPumpCandidate(p, { qReq: qDesign, hReq: hDesign, npshaOpts: o.npshaOpts }, opts).ok);
    if (pumps.length) {
      const pump = pumps[0];
      const runUnits = Math.ceil(qDesign / pump.ratedFlow) || 1;
      const eta = pumpEfficiencyAtQ(pump, qDesign);
      const energy = annualEnergyCost({ q: qDesign, h: hDesign, eta, hours: annualHours, price: pricePerKwh, units: runUnits });
      const totalUnits = runUnits + 1; // N+1
      scenarios.push({
        type: '冗余型',
        config: `${runUnits}+1 备用`,
        control: '自动切换',
        pumps: Array.from({ length: totalUnits }, (_, i) => (i ? `${pump.model}(备${i})` : pump.model)),
        model: pump.model,
        q: qDesign,
        h: hDesign,
        eta,
        ...quote(pump),
        initialInvest: invest(pump, totalUnits),
        annualEnergy: energy,
        lcc: lifecycle(invest(pump, totalUnits), energy, annualMaint * totalUnits, years),
        advantage: '可靠性高',
        scenario: '医院 / 工业等不可停水',
        detail: [`${runUnits} 台运行 + 1 台备用，确保单台检修时仍可供水`],
      });
    }
  }

  // 排序：默认按初投资升序；价格待询(null)的排最后，不误排为 0 元。
  return scenarios.sort(
    (a, b) => (a.initialInvest == null ? Infinity : a.initialInvest) - (b.initialInvest == null ? Infinity : b.initialInvest)
  );
}

/* ============================================================
 * 7. 主入口：一次完成 选泵 → 方案
 * ============================================================ */

/**
 * 根据需求设计流量 / 扬程，从样本库筛选候选泵并生成方案。
 * @param {object} demand  { qDesign, hDesign, qAvg, npshaOpts }
 * @param {Array} database  泵样本库
 * @param {object} options  { effLowRatio, effHighRatio, cost }
 * @returns {object} { design: {q,h}, candidates, scenarios }
 */
export function selectPumps(demand, database, options = {}) {
  const { qDesign, hDesign } = demand;
  const opts = options.extra || {};
  const candidates = database.filter((p) => checkPumpCandidate(p, { qReq: qDesign, hReq: hDesign, npshaOpts: demand.npshaOpts }, opts).ok);
  const scenarios = buildScenarios({
    qDesign,
    hDesign,
    qAvg: demand.qAvg ?? qDesign * 0.7,
    database, // 各方案独立对完整样本库筛选（并联/冗余的流量档不同于单泵）
    candidates,
    npshaOpts: demand.npshaOpts,
    opts,
    cost: options.cost,
  });
  return { design: { q: qDesign, h: hDesign }, candidates, scenarios };
}

export default { computeResidentialU0, residentialDesignFlowLS, computeHead, selectPumps };