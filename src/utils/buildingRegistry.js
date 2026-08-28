/**
 * buildingRegistry.js — 国内外常见建筑类型注册表
 *
 * 每种建筑的档案 profile：
 *   id / name / nameEn / category
 *   standard      本国标准归属（GB50015 | US-IPC | EN806 | 待扩展）
 *   flowMode      该标准下的计算口径（residentialProb | fixtureSimultaneous | manual-*）
 *   defaultReliability  默认运行可靠性等级（1~4，可在界面覆盖）
 *   scaleFields   该类型需要用户填写的规模字段
 *   params        计算参数（住宅定额/变化系数等；可被 scale 覆盖）
 *
 * 设计口径（计划）：同一类建筑在不同国家按各自标准实现。
 * 中文类型按 GB 50015；国际常见类型提供 US / EU 变体（其数值表待录入，
 * 走 manual-q 兜底，绝不用虚构数值）。
 */

/** 住宅类参数默认值（可被每个建筑的实际 scale 覆盖；均为可配置默认，非规格强制）。 */
const RES_DEFAULTS = {
  q0PerCapitaDay: 140, // L/(人·d) 最高日用水定额（可配置）
  peoplePerHome: 3.5,
  kh: 2.5, // 小时变化系数
  usageHours: 24,
  fixturesPerHome: 4.4, // 每户给水当量
};

function res(id, name, nameEn, level) {
  return {
    id, name, nameEn, category: '居住',
    standard: 'GB50015', flowMode: 'residentialProb',
    defaultReliability: level,
    scaleFields: ['homes'],
    params: { ...RES_DEFAULTS },
  };
}

function gbPublic(id, name, nameEn, category, level) {
  return {
    id, name, nameEn, category,
    standard: 'GB50015', flowMode: 'fixtureSimultaneous',
    defaultReliability: level,
    scaleFields: ['fixtures'], // 用户提供器具清单 [{flowLPS,count,simultaneousPercent}]
    params: {},
  };
}

/** 国际（非中国）变体：标准归属对应本国标准，数值表待录入，走 manual 兜底。 */
function intl(id, name, nameEn, category, level, standard) {
  return {
    id, name, nameEn, category,
    standard, flowMode: 'manual-foreign',
    defaultReliability: level,
    scaleFields: ['maxDemandGPM', 'maxDemandLPS'], // 取其一
    params: {},
  };
}

export const BUILDING_REGISTRY = [
  // ===== 居住（CN · GB50015 概率法）=====
  res('residential', '普通住宅', 'Dwelling', 1),
  res('residential-apartment', '公寓 / 长租', 'Apartment', 2),
  res('residential-villa', '别墅', 'Single-family House', 1),
  res('dormitory', '集体宿舍', 'Dormitory', 1),

  // ===== 公共建筑（CN · GB50015 器具同时百分数法）=====
  gbPublic('office', '办公写字楼', 'Office', '办公', 2),
  gbPublic('gov-office', '政府机关', 'Government Office', '办公', 2),
  gbPublic('retail', '商业 / 零售', 'Retail', '商业', 2),
  gbPublic('mall', '商业综合体', 'Shopping Mall', '商业', 2),
  gbPublic('hotel', '宾馆 / 酒店', 'Hotel', '宾馆', 2),
  gbPublic('restaurant', '餐饮', 'Restaurant', '餐饮', 2),
  gbPublic('canteen', '食堂', 'Canteen', '餐饮', 2),
  gbPublic('hospital', '综合医院', 'Hospital', '医疗', 3),
  gbPublic('clinic', '门诊 / 诊所', 'Clinic', '医疗', 2),
  gbPublic('school', '中小学', 'School K-12', '教育', 2),
  gbPublic('university', '高等学校', 'University', '教育', 2),
  gbPublic('library', '图书馆', 'Library', '文化', 1),
  gbPublic('museum', '博物馆', 'Museum', '文化', 1),
  gbPublic('exhibition', '会展中心', 'Exhibition Center', '文化', 2),
  gbPublic('cinema', '影剧院', 'Cinema', '观演', 2),
  gbPublic('theater', '剧场', 'Theater', '观演', 2),
  gbPublic('stadium', '体育馆', 'Stadium/Gymnasium', '体育', 2),
  gbPublic('pool', '游泳馆', 'Swimming Pool', '体育', 2),
  gbPublic('airport', '机场航站楼', 'Airport Terminal', '交通', 3),
  gbPublic('transit', '高铁站 / 地铁站', 'Transit Hub', '交通', 2),

  // ===== 工业 / 特殊（CN）=====
  gbPublic('factory', '工业厂房', 'Industrial Plant', '工业', 2),
  gbPublic('cleanroom', '洁净车间', 'Cleanroom', '工业', 3),
  gbPublic('lab', '实验室', 'Laboratory', '工业', 2),
  gbPublic('data-center', '数据中心', 'Data Center', '特殊', 4),
  gbPublic('supertall', '超高层建筑', 'Super-tall Building', '特殊', 3),

  // ===== 国际常见类型（US 或 EU 篮子）=====
  // 注：中英/等共同类型已在上方 GPIO 覆盖；此处提供按美国/欧洲标准归属的变体，
  // 数值表待录入 → 走 manual-q 兜底，绝不虚构。
  intl('us-residential', '美国住宅', 'US Dwelling', '居住', 1, 'US-IPC'),
  intl('us-office', '美国办公楼', 'US Office', '办公', 2, 'US-IPC'),
  intl('us-hotel', '美国酒店', 'US Hotel', '宾馆', 2, 'US-IPC'),
  intl('us-hospital', '美国医院', 'US Hospital', '医疗', 3, 'US-IPC'),
  intl('us-school', '美国学校', 'US School', '教育', 2, 'US-IPC'),
  intl('us-mall', '美国商业中心', 'US Mall', '商业', 2, 'US-IPC'),
  intl('eu-office', '欧洲办公楼', 'EU Office', '办公', 2, 'EN806'),
  intl('eu-hotel', '欧洲酒店', 'EU Hotel', '宾馆', 2, 'EN806'),
  intl('eu-hospital', '欧洲医院', 'EU Hospital', '医疗', 3, 'EN806'),
  intl('eu-school', '欧洲学校', 'EU School', '教育', 2, 'EN806'),
  intl('eu-residential', '欧洲住宅', 'EU Dwelling', '居住', 1, 'EN806'),
];

/** 按 id 取建筑类型档案。 */
export function getBuilding(id) {
  const p = BUILDING_REGISTRY.find((b) => b.id === id);
  if (!p) throw new Error(`未登记的建筑类型：${id}`);
  return p;
}

/** 按大类分组返回，供界面下拉/分组联动。 */
export function groupByCategory() {
  const groups = {};
  for (const b of BUILDING_REGISTRY) {
    (groups[b.category] = groups[b.category] || []).push(b);
  }
  return groups;
}

export default BUILDING_REGISTRY;