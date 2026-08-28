<template>
  <div class="panel">
    <h3>① 选择建筑类型</h3>
    <div class="row">
      <label>类型</label>
      <select v-model="building">
        <optgroup v-for="(list, cat) in grouped" :key="cat" :label="cat">
          <option v-for="b in list" :key="b.id" :value="b.id">{{ b.name }}（{{ b.nameEn }}）</option>
        </optgroup>
      </select>
      <span class="tag" :class="'std-' + profile.standard">{{ stdName }}</span>
    </div>

    <h3>② 运行可靠性等级</h3>
    <div class="row">
      <label>可靠等级</label>
      <div class="lvls">
        <label v-for="(r, k) in levels" :key="k" class="lvl"
          :class="{ active: level === Number(k) }"
          @click="level = Number(k)">
          <strong>{{ r.name }}</strong>
          <small>{{ r.description }}</small>
        </label>
      </div>
      <button class="ghost" @click="level = null" :disabled="level === null">用类型默认</button>
    </div>

    <h3>③ 规模参数</h3>

    <!-- 住宅类：户数 -->
    <div v-if="profile.flowMode === 'residentialProb'" class="row">
      <label>户数</label><input type="number" v-model.number="scale.homes" min="1" />
    </div>

    <!-- 公建类：器具清单 -->
    <div v-else-if="profile.flowMode === 'fixtureSimultaneous'" class="row col">
      <label>卫生器具清单（器具法）</label>
      <table class="mini">
        <thead><tr><th>器具名</th><th>额定流量 L/s</th><th>数量</th><th>同时给水 %</th><th></th></tr></thead>
        <tbody>
          <tr v-for="(f, i) in fixtures" :key="i">
            <td><input v-model="f.name" /></td>
            <td><input type="number" step="0.01" v-model.number="f.flowLPS" /></td>
            <td><input type="number" v-model.number="f.count" min="0" /></td>
            <td><input type="number" v-model.number="f.simultaneousPercent" min="0" max="100" /></td>
            <td><button class="ghost" @click="fixtures.splice(i,1)">✕</button></td>
          </tr>
        </tbody>
      </table>
      <button class="ghost" @click="addFixture">＋ 添加器具</button>
    </div>

    <!-- 国际 / 兜底：峰值流量 -->
    <div v-else-if="profile.standard === 'US-IPC'" class="row">
      <label>峰值流量（gpm）</label><input type="number" v-model.number="scale.maxDemandGPM" min="0" />
    </div>
    <div v-else-if="profile.standard === 'EN806'" class="row">
      <label>设计秒流量（L/s）</label><input type="number" v-model.number="scale.maxDemandLPS" min="0" />
    </div>

    <h3>④ 扬程（H1 最不利点高差，m）</h3>
    <div class="row">
      <label>最不利点高差</label><input type="number" v-model.number="scale.furthestHeightM" />
      <label class="sub">管长(m)</label><input type="number" v-model.number="scale.pipeLenM" class="narrow" />
    </div>

    <div class="cta"><button class="primary" @click="compute">计算构筑方案 →</button></div>
    <p v-if="err" class="err">{{ err }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { groupByCategory, getBuilding } from '../utils/buildingRegistry.js';
import { getReliability, RELIABILITY_LEVELS } from '../utils/reliability.js';

const grouped = groupByCategory();
const building = ref('office');
const level = ref(null); // null → 类型默认
const scale = ref({
  homes: 60,
  furthestHeightM: 16.5,
  pipeLenM: 0,
});
const fixtures = ref([
  { name: '洗面盆', flowLPS: 0.15, count: 23, simultaneousPercent: 30 },
]);
const err = ref('');

const profile = computed(() => getBuilding(building.value));
const stdName = computed(() => ({
  GB50015: '中国 GB50015',
  'US-IPC': '美国 IPC',
  EN806: '欧洲 EN806',
}[profile.value.standard] || profile.value.standard));
const levels = RELIABILITY_LEVELS;

function addFixture() { fixtures.value.push({ name: '器具', flowLPS: 0.1, count: 1, simultaneousPercent: 30 }); }

function compute() {
  err.value = '';
  const scaleCopy = { ...scale.value };
  if (profile.value.flowMode === 'fixtureSimultaneous') {
    scaleCopy.fixtures = fixtures.value.map(({ name, flowLPS, count, simultaneousPercent }) => ({ flowLPS, count, simultaneousPercent, name }));
  }
  emit('compute', { building: building.value, scale: scaleCopy, level: level.value });
}

const emit = defineEmits(['compute']);
</script>

<style scoped>
.panel { max-width: 680px; margin: 0 auto; padding: 20px; background: #fff; border-radius: 10px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
h3 { margin: 18px 0 8px; color: #1f2d3d; font-size: 15px; }
.row { display: flex; align-items: center; gap: 10px; margin: 6px 0; flex-wrap: wrap; }
.row.col { flex-direction: column; align-items: stretch; }
label { font-size: 13px; color: #5a6b7d; min-width: 130px; }
label.sub { min-width: 60px; }
input, select { padding: 6px 8px; border: 1px solid #cfd8e3; border-radius: 6px; font-size: 14px; }
select { flex: 1; }
input.narrow, .narrow { width: 90px; }
.lvls { display: flex; gap: 8px; flex-wrap: wrap; }
.lvl { display: flex; flex-direction: column; gap: 2px; min-width: 0; padding: 8px 10px; border: 1px solid #cfd8e3; border-radius: 8px; cursor: pointer; user-select: none; }
.lvl.active { border-color: #2f8cf0; background: #eef6ff; }
.lvl small { font-size: 11px; color: #7a8999; }
.tag { font-size: 12px; padding: 2px 8px; border-radius: 999px; background: #eef6ff; color: #2f6fb0; }
.ghost, .primary { padding: 7px 14px; border-radius: 7px; cursor: pointer; font-size: 13px; border: 1px solid #cfd8e3; background: #fff; }
.primary { background: #2f8cf0; color: #fff; border: none; font-size: 14px; }
.cta { margin-top: 16px; }
table.mini { width: 100%; border-collapse: collapse; font-size: 13px; }
table.mini th, table.mini td { border: 1px solid #e2e8ef; padding: 4px 6px; }
table.mini input { width: 100%; box-sizing: border-box; }
.err { color: #d33; font-size: 13px; }
</style>