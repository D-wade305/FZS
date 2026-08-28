/**
 * base.js — 给排水水量计算标准接口（标准插件基座）
 *
 * 每种国家/地区标准实现为一个模块，导出统一形态的 standard 对象：
 *   { id, name, regions, calcDesignFlow(profile, scale) }
 *
 *   profile  建筑类型档案（来自 buildingRegistry），含 flowMode / params
 *   scale    该建筑的实际规模输入（户数 / 人数 / 床位 / 面积 / 器具清单…）
 *   @returns 设计秒流量 qg，单位 L/s
 *
 * 数据真实性铁律：各标准内的查表数值（WFU / Hunter / 概率系数等）属标准原文内容，
 * 一律逐条录入并核验；未录入的以 status==='needs-data' 标记，绝不用虚构值顶替。
 */

/** 校验 scale 是否携带 required 所列字段，缺失项返回可读错误。 */
export function validateScale(scale, required = []) {
  const missing = required.filter((k) => !(scale && scale[k] !== undefined && scale[k] !== ''));
  if (missing.length) {
    throw new Error(`缺失规模参数：${missing.join('、')}`);
  }
  return true;
}

/** 包装一个完整可用的标准定义。 */
export function defineStandard({ id, name, regions = [], calcDesignFlow, status = 'ready' }) {
  if (typeof calcDesignFlow !== 'function') throw new Error(`标准 ${id} 缺少 calcDesignFlow`);
  return { id, name, regions, calcDesignFlow, status };
}

/**
 * 占位标准：覆盖尚未录入数值数据的标准，安全地"拒绝"而非编造。
 * status 为 'needs-data'，调用时抛错并引导用户直填 Q/H 兜底。
 */
export function definePendingStandard({ id, name, regions = [] }) {
  return {
    id,
    name,
    regions,
    status: 'needs-data',
    calcDesignFlow(profile, _scale) {
      const err = new Error(
        `标准「${name}」(id=${id}) 的数值数据尚未录入。` +
          `请先按计划补齐规范原文数值表；此前请由专业工程师直接输入设计流量 Q 作为兜底。`
      );
      err.code = 'STANDARD_NEEDS_DATA';
      err.fallback = 'manual-q';
      throw err;
    },
  };
}