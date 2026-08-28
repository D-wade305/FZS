<script setup>
import { ref, onMounted } from 'vue';
import DesignInput from './views/DesignInput.vue';
import ResultView from './views/ResultView.vue';
import { runDesign } from './utils/engine.js';

const design = ref(null);
const err = ref('');

function onCompute({ building, scale, level }) {
  err.value = '';
  try {
    design.value = runDesign({ building, scale, level });
  } catch (e) {
    err.value = e.message || String(e);
  }
}

// 打开即自动算一次（默认办公→命中库内泵），让结果区/曲线/导出按钮立即可见
onMounted(() => {
  onCompute({
    building: 'office',
    scale: { furthestHeightM: 16.5, pipeLenM: 0, fixtures: [{ flowLPS: 0.15, count: 23, simultaneousPercent: 30 }] },
    level: null,
  });
});
</script>

<template>
  <div class="app">
    <header class="head">
      <h1>建筑给水泵选型 · 多类型 × 可靠性构筑</h1>
      <p class="sub">依据建筑类型与运行可靠性等级，自动设计流量/扬程并构筑泵组方案</p>
    </header>

    <DesignInput @compute="onCompute" />

    <div v-if="err" class="err">{{ err }}</div>
    <ResultView v-if="design" :design="design" />
    <p v-else class="hint">↑ 在左侧填写参数后点击「计算构筑方案」查看结果</p>
  </div>
</template>

<style>
* { box-sizing: border-box; }
body { margin: 0; background: #f4f7fb; }
.app { max-width: 960px; margin: 0 auto; padding: 24px 16px 60px; }
.head h1 { margin: 0 0 4px; font-size: 20px; color: #1f2d3d; }
.head .sub { margin: 0 0 20px; color: #7a8999; font-size: 13px; }
.err { max-width: 680px; margin: 14px auto; color: #d33; background: #fdecec; border-radius: 8px; padding: 12px 14px; font-size: 13px; }
.hint { text-align: center; color: #a0aab4; margin-top: 40px; }
</style>