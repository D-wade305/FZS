/**
 * sizing.js — 设计扬程 H 推算（薄封装，复用 pumpSelect 的扬程工具）
 *
 * H = H1(最不利点高差) + H2(沿程+局部水损) + H3(水表) + H4(最低工作压力)
 */
import { computeHead, calcFrictionLoss } from './pumpSelect.js';

/**
 * 由建筑规模推算设计扬程。
 * @param {object} scale
 * @param {number}  scale.furthestHeightM   最不利点与引入管高差 H1，m（必填）
 * @param {number}  [scale.pipeLenM]        引入管至最不利点管长，m
 * @param {number}  [scale.gradient]        平均比摩阻 i（默认 0.12 m/m）
 * @param {number}  [scale.localFactor]     局部占沿程比例（默认 0.4）
 * @param {number}  [scale.waterMeterLossM] 水表水损 H3，m（默认 0.5）
 * @param {number}  [scale.minPressureMPa]  最不利点最低工作压力 H4，MPa（默认 0.05）
 */
export function designHead(scale) {
  if (scale.furthestHeightM === undefined || scale.furthestHeightM === '') {
    throw new Error('缺少最不利点与引入管高差 scale.furthestHeightM(m)');
  }
  const h2 = calcFrictionLoss({
    length: scale.pipeLenM ?? 0,
    gradient: scale.gradient ?? 0.12,
    localFactor: scale.localFactor ?? 0.4,
  });
  return computeHead({
    h1: scale.furthestHeightM,
    h2: h2 + (scale.verticalLossExtraM ?? 0),
    h3: scale.waterMeterLossM ?? 0.5,
    h4RequiredMPa: scale.minPressureMPa ?? 0.05,
  });
}

/** 便捷：按层高推算 H1（最不利点高差 ≈ 引入点以上到最高层用水点的净高）。 */
export function headFromFloors(floors, floorHeight = 3, baseOffset = 12) {
  return baseOffset + floors * floorHeight;
}

export default designHead;