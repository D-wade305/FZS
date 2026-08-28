/**
 * standardGB50015.js — 中国 《建筑给水排水设计标准》GB 50015-2019
 *
 * 覆盖口径：
 *  1) 住宅 / 公寓 / 别墅 / 宿舍：生活给水设计秒流量概率法
 *     qg = 0.2 · U · Ng   （U 为给水当量同时出流概率，U0–αc 系数法）
 *     复用 pumpSelect.computeResidentialU0 / residentialDesignFlowLS
 *  2) 公共建筑：卫生器具同时给水百分数法
 *     qg = Σ (器具额定流量 × 数量 × 同时给水百分数)
 *     复用 pumpSelect.publicDesignFlowLS
 *
 * GB 50015-2019 的逐建筑"同时给水百分数建议表"属规范原文数值，
 * 需从规范文本逐条录入并核验；未录入前，公建路径要求调用方提供
 * 器具清单（内置 scale.fixtures），不预填未核验的规范数值。
 */
import { computeResidentialU0, residentialDesignFlowLS, publicDesignFlowLS } from '../pumpSelect.js';
import { defineStandard, validateScale, definePendingStandard } from './base.js';

/** 住宅/居住类概率法 —— 完整可用 */
const residentialMode = (profile, scale) => {
  validateScale(scale, ['homes']);
  const p = profile.params || {};
  const peoplePerHome = scale.peoplePerHome ?? p.peoplePerHome;
  const q0PerCapitaDay = scale.q0PerCapitaDay ?? p.q0PerCapitaDay;
  const kh = scale.kh ?? p.kh;
  const usageHours = scale.usageHours ?? p.usageHours;
  const fixturesPerHome = scale.fixturesPerHome ?? p.fixturesPerHome;

  validateScale({ peoplePerHome, q0PerCapitaDay, kh, fixturesPerHome }, [
    'peoplePerHome',
    'q0PerCapitaDay',
    'kh',
    'fixturesPerHome',
  ]);

  const Ng = scale.homes * fixturesPerHome;
  const u0 = computeResidentialU0({
    q0PerCapitaDay,
    peoplePerHome,
    kh,
    Ng,
    usageHours,
  });
  return residentialDesignFlowLS(Ng, u0); // L/s
};

/** 公建器具同时给水百分数法 —— machinery 完整；规范默认表待录入 */
const fixtureMode = (profile, scale) => {
  validateScale(scale, ['fixtures']);
  if (!Array.isArray(scale.fixtures) || !scale.fixtures.length) {
    throw new Error('公共建筑需提供卫生器具清单 scale.fixtures：[{flowLPS, count, simultaneousPercent}]');
  }
  return publicDesignFlowLS(scale.fixtures);
};

const GB50015 = defineStandard({
  id: 'GB50015',
  name: '中国 GB 50015-2019',
  regions: ['CN'],
  status: 'ready',
  calcDesignFlow(profile, scale) {
    switch (profile.flowMode) {
      case 'residentialProb':
        return residentialMode(profile, scale);
      case 'fixtureSimultaneous':
        return fixtureMode(profile, scale);
      default:
        throw new Error(`GB50015 未知计算口径 flowMode=${profile.flowMode}`);
    }
  },
});

export { GB50015 };

// 预留：规范逐建筑"同时给水百分数建议表"录入点（需人工核对规范原文）。
export const GB50015_FIXTURE_TABLE_PENDING = definePendingStandard({
  id: 'GB50015-fixture-table',
  name: 'GB 50015 逐建筑同时给水百分数默认表',
  regions: ['CN'],
});

export default GB50015;