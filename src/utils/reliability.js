/**
 * reliability.js — 运行可靠性分级 → 泵组构筑规则
 *
 * 可靠性等级 R1~R4 决定泵组怎么构筑（运行台数 / 备用 / 变频 / 控制）。
 * 每种建筑类型在 buildingRegistry 里有默认等级，用户可按项目调整。
 *
 * 各等级映射到现有 pumpSelect.buildScenarios 的 4 类方案之一作为【主荐】，
 * 其余等级方案作为【并列对比】保留（计划：主荐 + 并列对比）。
 */

export const RELIABILITY_LEVELS = {
  1: {
    name: 'R1 一般',
    meaning: '停水影响小',
    build: { runUnits: 1, standbyUnits: 1, vfd: false },
    mainType: '经济型', // 一用一备，工频
    control: '手动 / 自动切换',
    description: '一用一备，工频，手动/自动切换',
  },
  2: {
    name: 'R2 较重要',
    meaning: '停水影响较大',
    build: { runUnits: 2, standbyUnits: 1, vfd: false },
    mainType: '并联型', // 两用一备 循环软启动（或变频恒压，界面上给两种选择）
    control: '循环软启动',
    description: '两用一备循环软启动，或一用一备+变频恒压',
  },
  3: {
    name: 'R3 重要',
    meaning: '不宜停水',
    build: { runUnits: 3, standbyUnits: 1, vfd: true },
    mainType: '冗余型', // 多泵并联 N 用 + N 备（N+1），宜变频
    control: '自动切换 + 变频',
    description: '多泵并联 N 用 + N 备（N+1），自动切换，宜变频',
  },
  4: {
    name: 'R4 极高',
    meaning: '不可停水',
    build: { runUnits: 3, standbyUnits: 2, vfd: true },
    mainType: '冗余型',
    control: '全冗余 + 双路水源/电源',
    description: 'N 用 + N+1/N+2 备用 + 双路水源/双电源，全变频冗余',
  },
};

/** 校验等级合法。 */
export function getReliability(level) {
  if (level === undefined || level === null || RELIABILITY_LEVELS[level] === undefined) {
    throw new Error(`非法可靠性等级：${level}（应为 1~4）`);
  }
  return RELIABILITY_LEVELS[level];
}

/**
 * 给定建筑类型与等级，产出构筑主荐 + 并列方案类型。
 * @param {object} profile  建筑类型档案（含 defaultReliability）
 * @param {number} [level]  用户指定等级；缺省用 profile.defaultReliability
 */
export function planBuilding(profile, level) {
  const lv = level ?? profile?.defaultReliability ?? 1;
  const rel = getReliability(lv);
  // 并列：其余等级对应的主方案类型，供界面"主荐+并列对比"
  const alternatives = Object.keys(RELIABILITY_LEVELS)
    .map(Number)
    .filter((k) => k !== lv)
    .map((k) => ({ level: k, mainType: RELIABILITY_LEVELS[k].mainType, name: RELIABILITY_LEVELS[k].name }));

  return {
    level: lv,
    reliability: rel,
    mainType: rel.mainType,
    build: rel.build,
    control: rel.control,
    description: rel.description,
    defaultReason: level === undefined ? `类型「${profile?.name || ''}」默认等级` : '用户指定等级',
    alternatives,
  };
}

export default RELIABILITY_LEVELS;