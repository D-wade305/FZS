<template>
  <div class="curve-card" :class="{ draft: isDraft }">
    <div class="card-head">
      <span class="name">{{ pump.model }}</span>
      <span class="tag" :class="isDraft ? 'draft' : 'real'">{{ isDraft ? '草案' : '实测' }}</span>
      <span class="mfr">{{ pump.manufacturer }}</span>
      <span class="meta-r">{{ pump.ratedFlow }}m³/h @{{ pump.ratedHead }}m · η{{ pump.ratedEfficiency }}% · {{ pump.price == null ? '价待询' : '¥' + pump.price.toLocaleString() }}</span>
    </div>

    <div class="subgrid">
      <CurveMini
        title="Q-H" xLabel="流量" yLabel="扬程" unit="m" :pumpName="pump.model"
        :points="pump.curves.qH" :dot="[pump.ratedFlow, pump.ratedHead]" :design="design" :dash="isDraft" />

      <template v-if="pump.curves.qNpsh">
        <CurveMini title="Q-NPSHr" xLabel="流量" yLabel="NPSHr" unit="m" :pumpName="pump.model" :points="pump.curves.qNpsh" variant="npsh" />
      </template>
      <div v-else class="empty"><span>暂无实测曲线</span></div>

      <template v-if="pump.curves.qP2">
        <CurveMini title="Q-P2" xLabel="流量" yLabel="轴功率 P2" unit="kW" :pumpName="pump.model" :points="pump.curves.qP2" variant="p2" />
      </template>
      <div v-else class="empty"><span>暂无实测曲线</span></div>
    </div>

    <p class="src-hint">{{ isDraft ? '草案曲线·待样册实测替换' : 'Q-H/NPSHr/P2 实测采样；η 由 P2 反算并锚定额定点' }}</p>
  </div>
</template>

<script setup>
import CurveMini from './CurveMini.vue';
const props = defineProps({
  pump: { type: Object, required: true },
  design: { type: Object, default: null }, // { q, h } 系统设计点
});
const isDraft = props.pump.curveSource !== 'real-table';
</script>

<style scoped>
.curve-card { background: #fff; border: 1px solid #e2e8ef; border-radius: 10px; padding: 10px 12px 8px; }
.card-head { display: flex; align-items: baseline; gap: 7px; flex-wrap: wrap; margin-bottom: 6px; }
.name { font-weight: 700; font-size: 13px; color: #1f2d3d; }
.mfr { font-size: 11px; color: #7a8999; }
.meta-r { font-size: 10px; color: #5a6b7d; margin-left: auto; }
.tag { font-size: 10px; padding: 1px 6px; border-radius: 999px; }
.tag.real { background: #e5f6ec; color: #1c7a3d; }
.tag.draft { background: #fdf1dd; color: #9a6b12; }
.subgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.empty { display: flex; align-items: center; justify-content: center; background: #fafbfc; border: 1px dashed #dce3eb; border-radius: 6px; color: #b0bcc9; font-size: 11px; text-align: center; padding: 30px 4px; }
.src-hint { font-size: 10px; color: #a0aab4; margin: 6px 0 0; }
.empty { display: flex; align-items: center; justify-content: center; background: #fafbfc; border: 1px dashed #dce3eb; border-radius: 6px; color: #b0bcc9; font-size: 11px; text-align: center; padding: 30px 4px; }
</style>