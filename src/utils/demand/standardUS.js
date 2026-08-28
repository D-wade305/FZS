/**
 * standardUS.js — 美国给排水设计标准（IPC International Plumbing Code / UPC）
 *
 * 经典口径（Hunter 曲线法）：
 *  qg：由卫生器具"供水当量 wsfu(Water Supply Fixture Unit)"累加 → 查 Hunter
 *      最大需水量表（wsfu → gpm）→ gpm×0.0631 = L/s
 *
 * 数据真实性铁律：HCHunter / IPC 的 wsfu 值与 wsfu→gpm 查表属规范原文数值，
 * 需从 IPC/IaPMO 标准文本逐条录入并核验。本模块：
 *  - wsfu 折算表 与 Hunter 曲线  标记为待数据（needs-data），未录入前走闸门抛 STANDARD_NEEDS_DATA；
 *  - 提供 engineer 直填峰值流量 scale.maxDemandGPM 的兜底路径（永可用），
 *    使模块可运行且不虚构中表数值。
 */
import { defineStandard, definePendingStandard } from './base.js';

/** Hunter 最大需水量（wsfu → gpm）—— 待从标准原文录入；未录入前仅作结构占位。 */
const HUNTER_WSFU_TO_GPM = null; // TODO: 从 IPC 附录查表逐行录入
export const HUNTER_TABLE_PENDING = definePendingStandard({
  id: 'US-Hunter-table',
  name: '美国 IPC Hunter 最大需水量表（wsfu→gpm）',
  regions: ['US', 'CA'],
});

/** wsfu 常用器具折算值 —— 待核验的参考占位（需对照 IPC 表 6-5-4 复核）。 */
export const PENDING_WSFU_REFERENCE = {
  _note: '以下为待核验参考值，正式使用前须对照 IPC Table 6-5-4 逐条确认；已由 HUNTER 闸门拦截，不参与计算',
  status: 'needs-data',
  waterClosetFlashValve: 2.5,
  waterClosetFlashTank: 2.2,
  lavatoryFaucet: 1.0,
  bathtub: 2.0,
  shower: 2.0,
  kitchenSink: 1.5,
  washingMachine: 2.2,
};

/** IPC 最小管径换算用（gpm→L/s）：1 US gallon/min = 0.063 090 196 L/s */
const GPM_TO_LPS = 0.06309;

const USCAL = defineStandard({
  id: 'US-IPC',
  name: '美国 IPC / UPC（Hunter 当量法）',
  regions: ['US', 'CA', 'AU'],
  status: 'needs-data', // 核心查表待录入 → 默认拦截
  calcDesignFlow(profile, scale) {
    // 兜底路径：工程师直接给定峰值流量（gpm），永可用。
    if (scale && scale.maxDemandGPM) {
      return scale.maxDemandGPM * GPM_TO_LPS;
    }

    // 需查表路径：未录入 Hunter 数值前拒绝，绝不虚构。
    const err = new Error(
      `美国 IPC 的 wsfu→Hunter 查表数值尚未从标准原文录入。请提供 scale.maxDemandGPM（峰值 gpm），` +
        `或先行补齐 HUNTER_WSFU_TO_GPM 数值表。`
    );
    err.code = 'STANDARD_NEEDS_DATA';
    err.fallback = 'manual-q';
    throw err;
  },
});

export { USCAL };
export default USCAL;