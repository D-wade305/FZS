/**
 * waterDemand.js — 统一入口：按建筑类型的标准归属分发 → 计算设计秒流量 Q(L/s)
 *
 * 用法：
 *   const qg = calcDesignFlow(profile, scale)
 *   // profile 来自 buildingRegistry；scale 为该建筑的实际规模输入。
 *   // 若某标准数据未录入，将抛 err.code==='STANDARD_NEEDS_DATA'，err.fallback==='manual-q'，
 *   // 调用方应引导用户直填 Q/H 兜底（见 pumpSelect 高级模式）。
 */
import { GB50015 } from './standardGB50015.js';
import { USCAL } from './standardUS.js';
import { EN806 } from './standardEn806.js';

const STANDARD_REGISTRY = {
  GB50015,
  'US-IPC': USCAL,
  EN806,
};

/** 注册/覆盖一个标准实现（插件扩展点，用于阶段 C 的日本等规范）。 */
export function registerStandard(standard) {
  STANDARD_REGISTRY[standard.id] = standard;
  return standard;
}

/**
 * 计算设计秒流量。
 * @returns {number} 设计秒流量 L/s（纯数值）
 */
export function calcDesignFlow(profile, scale = {}) {
  return resolve(profile, scale).q;
}

/** 带元信息的版本：{ q, meta }，meta 含标准 id/名称/状态/口径，供界面展示。 */
export function calcDesignFlowDetailed(profile, scale = {}) {
  return resolve(profile, scale);
}

function resolve(profile, scale = {}) {
  if (!profile) throw new Error('缺少建筑类型 profile（先经 buildingRegistry 解析）');
  const std = STANDARD_REGISTRY[profile.standard];
  if (!std) {
    const err = new Error(`未注册的标准：${profile.standard}`);
    err.code = 'UNKNOWN_STANDARD';
    throw err;
  }
  const q = std.calcDesignFlow(profile, scale);
  return {
    q,
    meta: {
      standard: std.id,
      standardName: std.name,
      status: std.status,
      flowMode: profile.flowMode,
    },
  };
}

export const STANDARDS = STANDARD_REGISTRY;