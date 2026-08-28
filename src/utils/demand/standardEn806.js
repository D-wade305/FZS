/**
 * standardEn806.js — 欧洲 EN 806-3 / 德 DIN 1988-3 概率法（骨架）
 *
 * EN 806 体系的卫生器具设计秒流量采用概率法（简化二项分布 / 平均供水量
 * + 概率系数），与 Hunter 曲线不同，各成员国有区域性系数。
 *
 * 数据真实性铁律：EN/DIN 的概率系数与器具供水量为规范原文数值，
 * 需逐条录入核验。本模块先给机芯骨架 + 工程师直填峰值（L/s）兜底路径；
 * 概率系数未录前，走闸门抛 STANDARD_NEEDS_DATA。
 */
import { defineStandard } from './base.js';

/** 待录入：EN 806 基础概率法系数表（q-est 相关系数 / 器具参考供水量） */
export const EN806_COEFFICIENTS_PENDING = true; // 数据采集点

const EN806 = defineStandard({
  id: 'EN806',
  name: '欧洲 EN 806-3 / DIN 1988-3（概率法）',
  regions: ['EU', 'GB', 'DE', 'FR', 'NL'],
  status: 'needs-data',
  calcDesignFlow(profile, scale) {
    // 兜底：工程师直填设计秒流量（L/s）或日峰流量法
    if (scale && typeof scale.maxDemandLPS === 'number' && scale.maxDemandLPS > 0) {
      return scale.maxDemandLPS;
    }
    const err = new Error(
      `欧洲 EN 806 的概率系数尚未从标准原文录入。请提供 scale.maxDemandLPS（设计秒流量 L/s）或先行补齐系数表。`
    );
    err.code = 'STANDARD_NEEDS_DATA';
    err.fallback = 'manual-q';
    throw err;
  },
});

export { EN806 };
export default EN806;