<template>
  <div class="result">
    <div class="summary bar">
      <div class="cell"><small>建筑</small><strong>{{ design.profile.name }}</strong></div>
      <div class="cell"><small>计算标准</small><strong>{{ design.flow.meta.standardName }}</strong></div>
      <div class="cell"><small>设计流量 Q</small><strong>{{ design.flow.q.toFixed(2) }} L/s <em>({{ design.flow.qM3h.toFixed(1) }} m³/h)</em></strong></div>
      <div class="cell"><small>设计扬程 H</small><strong>{{ design.head.h.toFixed(1) }} m</strong></div>
      <div class="cell"><small>可靠等级</small><strong>{{ design.reliability.reliability.name }}<em>{{ design.reliability.defaultReason }}</em></strong></div>
    </div>

    <div class="main" v-if="design.pumps.main">
      <div class="main-head">
        <h3>★ 主荐构筑 · {{ design.pumps.main.type }}</h3>
        <button class="export" @click="exportReport">⬇ 导出选型报告</button>
      </div>
      <div class="line">
        推荐：{{ design.pumps.main.config }}（{{ design.pumps.main.description || '' }}）
        ，水泵 <b>{{ design.pumps.main.model }}</b>，控制「{{ design.pumps.main.control }}」
      </div>
      <div class="stats">
        <span>单台流量 {{ design.pumps.main.q }} m³/h</span>
        <span>扬程 {{ design.pumps.main.h }} m</span>
        <span>效率 {{ design.pumps.main.eta.toFixed(1) }}%</span>
        <span>初投资 {{ fmt(design.pumps.main.initialInvest) }} 元</span>
        <span>年电费 {{ fmt(design.pumps.main.annualEnergy) }} 元</span>
        <span>10年全周期 {{ fmt(design.pumps.main.lcc) }} 元</span>
      </div>
      <p class="advantage">适配：{{ design.pumps.main.scenario }} · {{ design.pumps.main.advantage }}</p>
      <p v-for="(d,i) in (design.pumps.main.detail||[])" :key="i" class="note">{{ d }}</p>
    </div>

    <div v-else class="no-match">
      <p>⚠ 当前泵库中没有满足该工况（Q={{ design.flow.qM3h.toFixed(1) }} m³/h，H={{ design.head.h.toFixed(1) }} m）的可用泵。</p>
      <p class="note">可能原因：泵库尚未录入满足该流量/扬程档的型号。请补充更大流量或更高扬程的真实泵样本，或调整规模参数。本工具不虚构样本数据。</p>
      <p v-if="design.flow.meta.status === 'needs-data'" class="note">该类型采用了尚未录入数值表的国际标准，当前按需由专业工程师直填设计流量。</p>
    </div>

    <h3 class="mt">方案并列对比</h3>
    <table class="cmp">
      <thead>
        <tr>
          <th>方案</th><th>配置</th><th>水泵</th><th>控制</th>
          <th>初投资(元)</th><th>年电费(元)</th><th>10年LCC(元)</th><th>适用场景</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in design.pumps.scenarios" :key="s.type"
            :class="{ hl: s.type === design.pumps.main.type }">
          <td>{{ s.type }}</td>
          <td>{{ s.config }}</td>
          <td>{{ s.model }}</td>
          <td>{{ s.control }}</td>
          <td>{{ fmt(s.initialInvest) }}</td>
          <td>{{ fmt(s.annualEnergy) }}</td>
          <td>{{ fmt(s.lcc) }}</td>
          <td>{{ s.scenario }}</td>
        </tr>
      </tbody>
    </table>

    <h3 class="mt">全库 Q-H 性能曲线（{{ allPumps.length }} 台）<span class="hint2">红色 ✕ = 系统设计点（Q={{ design.flow.qM3h.toFixed(1) }} m³/h, H={{ design.head.h.toFixed(1) }} m）</span></h3>
    <div class="curves">
      <CurveCard v-for="p in allPumps" :key="p.model" :pump="p" :design="designPoint" />
    </div>
    <p class="note">三子图从左至右：Q—H / Q—NPSHr / Q—P2；每张曲线旁红叉为当前系统设计工况。</p>

    <p class="disclaimer">※ 本结果基于当前泵库与给定参数，仅供参考；最终选型须由专业工程师复核。<br>
      ※ 若采用国际标准，其规范数值表未录入时将以"专业工程师直填"兜底。</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import CurveCard from './CurveCard.vue';
import { PUMP_DATABASE } from '../data/pumpDatabase.js';
import { buildReportHtml } from '../utils/report.js';
const props = defineProps({ design: Object });
const allPumps = PUMP_DATABASE;
const designPoint = computed(() => (props.design ? { q: props.design.flow.qM3h, h: props.design.head.h } : null));
const fmt = (n) => (n === null || n === undefined || (typeof n === 'number' && !isFinite(n)) ? '待询价' : Number(n).toLocaleString('zh-CN'));

function exportReport() {
  const html = buildReportHtml(props.design, { title: `${props.design.profile.name} · 给水泵选型报告` });
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `给水泵选型报告_${props.design.profile.name}_${props.design.flow.qM3h.toFixed(1)}m3h.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
</script>

<style scoped>
.result { max-width: 900px; margin: 0 auto; }
.summary.bar { display: flex; gap: 10px; flex-wrap: wrap; background: #1f2d3d; color: #fff; border-radius: 10px; padding: 16px 20px; }
.summary .cell { flex: 1; min-width: 130px; }
.summary small { display: block; font-size: 11px; color: #9fb0c1; }
.summary strong { font-size: 14px; }
.summary em { font-style: normal; color: #7fd18a; font-size: 12px; margin-left: 4px; }
.main { background: #fff; border: 1px solid #cfe4fb; border-left: 5px solid #2f8cf0; border-radius: 10px; padding: 16px 20px; margin-top: 16px; }
.main-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.main-head h3 { margin: 0; }
h3.mt { margin: 26px 0 10px; color: #1f2d3d; }
.export { padding: 8px 16px; border: none; border-radius: 8px; background: #2f8cf0; color: #fff; font-size: 13px; cursor: pointer; }
.export:hover { background: #1f7ce0; }
.stats { display: flex; gap: 14px; flex-wrap: wrap; font-size: 13px; margin: 8px 0; }
.stats span { background: #f2f6fb; padding: 4px 10px; border-radius: 6px; }
.advantage { color: #2f6fb0; font-weight: 600; margin: 6px 0; }
.no-match { background: #fff7ec; border: 1px solid #f0c86a; border-radius: 10px; padding: 16px 20px; margin-top: 16px; color: #8a6d1f; }
.no-match .note { color: #a98f56; }
.note { color: #7a8999; font-size: 12px; margin: 2px 0; }
.cmp { width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,.06); font-size: 13px; }
.cmp th, .cmp td { padding: 9px 10px; border-bottom: 1px solid #e2e8ef; text-align: left; }
.cmp th { background: #eef6ff; color: #1f2d3d; }
.cmp tr.hl { background: #fffbe6; }
.curves { display: grid; grid-template-columns: repeat(auto-fill, minmax(620px, 1fr)); gap: 16px; }
.hint2 { font-weight: 400; font-size: 11px; color: #a0aab4; margin-left: 8px; }
.disclaimer { margin-top: 14px; font-size: 11px; color: #a0aab4; line-height: 1.6; }
.mt { margin-top: 26px; }
</style>