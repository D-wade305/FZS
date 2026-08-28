/**
 * report.js — 生成自包含选型报告 HTML（可下载 / 打印 / Ctrl+P 存 PDF）
 *
 * buildReportHtml(design) → HTML 字符串。纯函数，不依赖 Vue/网络。
 * design 结构同 engine.runDesign 返回值。
 */
import { PUMP_DATABASE } from '../data/pumpDatabase.js';

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const money = (n) => (n === null || n === undefined || (typeof n === 'number' && !isFinite(n)) ? '待询价' : Number(n).toLocaleString('zh-CN'));
const now = () => new Date().toLocaleString('zh-CN', { hour12: false });

/** 通用单条折线 SVG（可选额定点 + 系统设计点）。纯字符串无依赖。 */
function plotToSvg(points, opts = {}) {
  const { w = 360, h = 240, color = '#2f8cf0', unit = '', rated = null, design = null } = opts;
  const [padL, padT, padR, padB] = [14, 18, 14, 26];
  const pw = w - padL - padR, ph = h - padT - padB;
  const maxX = Math.max(...points.map((p) => p[0])) * 1.06;
  const maxY = Math.max(...points.map((p) => p[1])) * 1.06;
  const fx = (x) => padL + (x / maxX) * pw;
  const fy = (y) => padT + (1 - y / maxY) * ph;
  const pts = points.map(([x, y]) => `${fx(x).toFixed(1)},${fy(y).toFixed(1)}`).join(' ');
  let extra = '';
  if (rated) {
    extra += `<circle cx="${fx(rated[0])}" cy="${fy(rated[1])}" r="3.6" fill="${color}" stroke="#fff" stroke-width="1.5"/>`;
  }
  if (design) {
    const dx = fx(design.q), dy = fy(design.h);
    if (design.q <= maxX + 8 && design.h >= 0 && design.h <= maxY + 8) {
      extra += `<circle cx="${dx}" cy="${dy}" r="6" fill="none" stroke="#dc2626" stroke-dasharray="2 2"/>
        <path d="M${dx - 4},${dy - 4}l8,8m0,-8l-8,8" stroke="#dc2626" stroke-width="2" fill="none"/>
        <text x="${dx + 8}" y="${dy - 4}" font-size="11" fill="#dc2626" font-weight="700">设计</text>`;
    }
  }
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" xmlns="http://www.w3.org/2000/svg">
    <line x1="${padL}" y1="${fy(maxY)}" x2="${w - padR}" y2="${fy(maxY)}" stroke="#e7ecf2" stroke-width="1"/>
    <line x1="${padL}" y1="${fy(0)}" x2="${w - padR}" y2="${fy(0)}" stroke="#e7ecf2" stroke-width="1"/>
    <text x="${padL}" y="${fy(maxY) - 3}" font-size="10" fill="#94a3b8">${maxY.toFixed(0)} ${unit}</text>
    <text x="${w - padR}" y="${fy(0) + 14}" font-size="10" fill="#94a3b8" text-anchor="end">${maxX.toFixed(0)}</text>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
    ${extra}
  </svg>`;
}

const pumpSubPlot = (pump, design) => {
  const dp = design ? { q: design.flow.qM3h, h: design.head.h } : null;
  return `<div class="sub">
    <p class="sub-cap">Q—H（扬程 m）</p>
    ${plotToSvg(pump.curves.qH, { rated: [pump.ratedFlow, pump.ratedHead], design: dp })}
  </div><div class="sub">
    <p class="sub-cap">Q—NPSHr（m）</p>
    ${plotToSvg(pump.curves.qNpsh, { color: '#b45309', unit: 'm' })}
  </div><div class="sub">
    <p class="sub-cap">Q—P2 轴功率（kW）</p>
    ${plotToSvg(pump.curves.qP2, { color: '#6d28d9', unit: 'kW' })}
  </div>`;
};

function mainBlock(design) {
  const m = design.pumps.main;
  if (!m) {
    return `<div class="card"><b>无匹配方案</b><p>当前泵库没有满足 Q=${design.flow.qM3h.toFixed(1)} m³/h、H=${design.head.h.toFixed(1)} m 的可用泵，请补充更大流量/更高扬程样本或调整参数。</p></div>`;
  }
  return `<div class="card main">
    <h3>主荐构筑 · ${esc(m.type)}</h3>
    <p><b>配置</b>：${esc(m.config)}（${esc(m.control)}）　<b>水泵</b>：${esc(m.model)}</p>
    <p><b>工况</b>：单台 ${m.q} m³/h · ${m.h} m · 效率 ${m.eta.toFixed(1)}%</p>
    <p><b>成本</b>：初投资 ${money(m.initialInvest)} 元 ｜ 年电费 ${money(m.annualEnergy)} 元 ｜ 10年全周期 ${money(m.lcc)} 元</p>
    <p class="why">适配：${esc(m.scenario)} · ${esc(m.advantage)}</p>
    <ul>${(m.detail || []).map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
  </div>`;
}

function compareTable(design) {
  const rows = design.pumps.scenarios.map((s) => `<tr${s.type === design.pumps.main?.type ? ' class="hl"' : ''}>
    <td>${esc(s.type)}</td><td>${esc(s.config)}</td><td>${esc(s.model)}</td><td>${esc(s.control)}</td>
    <td>${money(s.initialInvest)}</td><td>${money(s.annualEnergy)}</td><td>${money(s.lcc)}</td><td>${esc(s.scenario)}</td>
  </tr>`).join('');
  return `<table><thead><tr><th>方案</th><th>配置</th><th>水泵</th><th>控制</th><th>初投资(元)</th><th>年电费(元)</th><th>10年LCC(元)</th><th>适用场景</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function curveSection(design) {
  return PUMP_DATABASE.map((p) => `<figure class="curve">
    <figcaption><b>${esc(p.model)}</b>
      <span class="tk">${esc(p.type)} ｜ 额定 ${p.ratedFlow} m³/h @${p.ratedHead} m ｜ η${p.ratedEfficiency}% ｜ ${money(p.price)}</span></figcaption>
    <div class="subs">${pumpSubPlot(p, design)}</div>
  </figure>`).join('');
}

export function buildReportHtml(design, opts = {}) {
  const title = opts.title || `建筑给水泵选型报告`;
  const relatedRel = design.reliability?.reliability?.name || '';
  const p = design.profile;
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${esc(title)}</title>
  <style>
    body{font-family:"Microsoft YaHei",system-ui,Arial,sans-serif;margin:0;color:#1f2d3d;background:#f4f7fb;padding:24px;}
    .sheet{max-width:900px;margin:0 auto;background:#fff;border-radius:12px;padding:28px 32px;box-shadow:0 2px 14px rgba(0,0,0,.07);}
    h1{margin:0 0 2px;font-size:22px;} h2{font-size:16px;border-left:4px solid #2f8cf0;padding-left:8px;margin:26px 0 10px;}
    .meta{color:#7a8999;font-size:12px;margin-bottom:10px;}
    .grid{display:flex;gap:12px;flex-wrap:wrap;margin:10px 0;}
    .cell{flex:1;min-width:130px;background:#eef6ff;border-radius:8px;padding:10px 12px;}
    .cell small{display:block;color:#7a8999;font-size:11px;} .cell strong{font-size:14px;}
    .card{border:1px solid #e2e8ef;border-radius:10px;padding:14px 16px;margin:10px 0;}
    .card.main{border-color:#cfe4fb;border-left:5px solid #2f8cf0;}
    .card h3{margin:0 0 8px;} p{margin:6px 0;} .why{color:#2f6fb0;font-weight:600;} ul{margin:6px 0;padding-left:20px;}
    table{width:100%;border-collapse:collapse;font-size:13px;} th,td{border:1px solid #e2e8ef;padding:8px 9px;text-align:left;}
    th{background:#eef6ff;} tr.hl{background:#fffbe6;}
    .curves{display:grid;grid-template-columns:repeat(auto-fill,minmax(400px,1fr));gap:16px;margin-top:8px;}
    figure{margin:0;border:1px solid #e2e8ef;border-radius:10px;padding:8px;} figcaption{font-size:12px;margin-bottom:6px;}
    figcaption .tk{color:#7a8999;font-weight:400;margin-left:6px;}
    .subs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
    .sub{border-top:3px solid #dce6f2;padding-top:4px;}
    .sub-cap{font-size:11px;color:#7a8999;text-align:center;margin:0 0 2px;}
    .dis{font-size:11px;color:#a0aab4;border-top:1px solid #e2e8ef;margin-top:28px;padding-top:12px;line-height:1.6;}
    @media print{body{background:#fff;padding:0;} .sheet{box-shadow:none;border-radius:0;}}
  </style>
</head><body><div class="sheet">
  <h1>${esc(title)}</h1>
  <p class="meta">生成时间：${now()}　·　${esc(p.name)}（${esc(p.nameEn)}）　·　标准：${esc(design.flow.meta.standardName)}　·　${esc(relatedRel)}</p>

  <div class="grid">
    <div class="cell"><small>设计流量 Q</small><strong>${design.flow.q.toFixed(2)} L/s（${design.flow.qM3h.toFixed(1)} m³/h）</strong></div>
    <div class="cell"><small>设计扬程 H</small><strong>${design.head.h.toFixed(1)} m</strong></div>
    <div class="cell"><small>可靠性等级</small><strong>${esc(relatedRel)}</strong></div>
    <div class="cell"><small>可靠构筑</small><strong>${esc(design.reliability.mainType)} · ${esc(design.reliability.control)}</strong></div>
  </div>

  <h2>主荐方案</h2>${mainBlock(design)}

  <h2>方案并列对比</h2>${compareTable(design)}

  <h2>全库 Q—H 性能曲线（红叉 = 系统设计点）</h2>
  <div class="curves">${curveSection(design)}</div>

  <p class="dis">
    ※ 本报告由建筑给水泵选型工具自动生成，仅供参考；最终选型须由专业工程师按规范复核。<br>
    ※ 泵参数来自实测采样，额定效率为零余量参考值（±2~3%），正式设计请以厂商选型软件复核；若采用国际标准，其规范数值表未录入部分以专业工程师直填为准。
  </p>
</div></body></html>`;
}

export default buildReportHtml;