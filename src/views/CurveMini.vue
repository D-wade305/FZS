<template>
  <div class="mini">
    <svg :viewBox="`0 0 ${W} ${H}`" class="plot" role="img"
         :aria-label="`${title}曲线`" @mousemove="onMove" @mouseleave="show=false">
      <title>{{ title }}：{{ pumpName }}</title>
      <line :x1="padL" :y1="fy(maxY)" :x2="W-padR" :y2="fy(maxY)" class="grid"/>
      <line :x1="padL" :y1="fy(0)"  :x2="W-padR" :y2="fy(0)"  class="grid baseline"/>
      <text :x="padL" :y="fy(maxY)-3" class="ax" text-anchor="start">{{ maxYTxt }} {{ unit }}</text>
      <text :x="W-padR" :y="fy(0)+13" class="ax" text-anchor="end">{{ maxXTxt }}</text>

      <polyline :points="linePoints" class="ln"
        :class="{ draft: dash, vdp: variant }"
        :style="variant ? undefined : { stroke: color }"
        :stroke-dasharray="dash ? '5 3' : undefined"/>

      <!-- 额定点（可选） -->
      <g v-if="dot">
        <circle :cx="fx(dot[0])" :cy="fy(dot[1])" r="3.2" class="dot" :class="{ draft: dash }">
          <title>额定 {{ dot[0] }} · {{ dot[1] }} {{ unit }}</title>
        </circle>
      </g>

      <!-- 系统设计点（可选，仅当传入 design） -->
      <g v-if="design">
        <title>设计点：{{ design.q }} m³/h · {{ design.h }} m</title>
        <circle :cx="fx(design.q)" :cy="fy(design.h)" r="5" class="dg"/>
        <path :d="`M${fx(design.q)-3.5},${fy(design.h)-3.5}l7,7m0,-7l-7,7`" class="dx"/>
        <text :x="fx(design.q)+7" :y="fy(design.h)-4" class="dl">设计</text>
      </g>

      <!-- 悬停十字线 -->
      <g v-if="show">
        <circle :cx="hv.x" :cy="hv.y" r="3" class="hc"/>
        <line :x1="hv.x" :y1="fv1" :x2="hv.x" :y2="fv0" class="hl"/>
      </g>
    </svg>
    <div class="cap"><span>{{ title }}</span><span>{{ xLabel }}/{{ yLabel }}</span></div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const props = defineProps({
  title: { type: String, required: true },
  pumpName: { type: String, required: true },
  xLabel: { type: String, default: 'Q' },
  yLabel: { type: String, default: '' },
  unit: { type: String, default: '' },
  points: { type: Array, required: true },
  color: { type: String, default: '#2f8cf0' },
  dash: { type: Boolean, default: false },
  variant: { type: String, default: '' }, // 'npsh' | 'p2' → 用预置配色
  dot: { type: Array, default: null },
  design: { type: Object, default: null }, // { q, h } 系统设计点（标在 Q-H 图）
});

const W = 150, H = 96;
const padL = 6, padT = 8, padR = 6, padB = 16;
const pw = W - padL - padR, ph = H - padT - padB;

const maxX = Math.max(...props.points.map((p) => p[0])) * 1.06;
const maxY = Math.max(...props.points.map((p) => p[1])) * 1.08;
const fx = (x) => padL + (x / maxX) * pw;
const fy = (y) => padT + (1 - y / maxY) * ph;
const linePoints = props.points.map(([x, y]) => `${fx(x)},${fy(y)}`).join(' ');
const maxXTxt = maxX >= 10 ? maxX.toFixed(0) : maxX.toFixed(1);
const maxYTxt = maxY >= 10 ? maxY.toFixed(0) : maxY.toFixed(1);

// 悬停：最近采样点 + 十字线
const show = ref(false);
const hv = ref({ x: 0, y: 0 });
const fv1 = fy(0) > fy(maxY) ? fy(0) : fy(maxY);
const fv0 = fy(0) < fy(maxY) ? fy(0) : fy(maxY);
function onMove(e) {
  const r = e.currentTarget.getBoundingClientRect();
  const px = ((e.clientX - r.left) / r.width) * W;
  const py = ((e.clientY - r.top) / r.height) * H;
  let best = props.points[0];
  for (const p of props.points) if (Math.abs(fx(p[0]) - px) < Math.abs(fx(best[0]) - px)) best = p;
  hv.value = { x: fx(best[0]), y: fy(best[1]) };
  show.value = true;
}
</script>

<style scoped>
.mini { display: flex; flex-direction: column; }
.plot { width: 100%; height: auto; display: block; }
.grid { stroke: #eef2f6; stroke-width: 1; }
.baseline { stroke: #d4dde7; }
.ax { font-size: 8px; fill: #94a3b8; }
.ln { fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.ln.vdp.npsh { stroke: #b45309; }
.ln.vdp.p2 { stroke: #6d28d9; }
.dot { fill: #1f2d3d; stroke: #fff; stroke-width: 1.2; }
.dot.draft { fill: #94a3b8; }
.dg { fill: none; stroke: #dc2626; stroke-width: 1; stroke-dasharray: 2 2; }
.dx { fill: none; stroke: #dc2626; stroke-width: 1.8; stroke-linecap: round; }
.dl { fill: #dc2626; font-size: 7px; font-weight: 700; }
.hc { fill: #1f2d3d; }
.hl { stroke: #b6c2cf; stroke-width: 1; stroke-dasharray: 2 2; }
.cap { display: flex; justify-content: space-between; font-size: 10px; color: #7a8999; margin-top: 2px; }
</style>