<script setup>
// import { ref, onMounted } from 'vue'

const props = defineProps(['isShow', 'index', 'isDanger', 'data', 'answerMapCalc'])
</script>

<template>
  <div class="fly-top-indicator"
    :class="[props.isDanger && 'danger']"
    v-show="props.isShow"
    :style="{ left: 250 + 32 + 2 + 28 * props.index + 'px' }">
    <div class="cell"
      :class="[answerMapCalc.top.length && n !== answerMapCalc.top[props.index][nindex] && 'danger']"
      v-for="(n, nindex) in props.data" :key="nindex">
      {{ n }}
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "../assets/var.scss" as var;

.fly-top-indicator {
  position: fixed;
  z-index: 10;
  top: 0;
  left: 0;
  width: 26px;
  height: auto;
  color: #333;
  background: var.$indicator-bg-color;
  border: 1px solid var.$system-color;
  box-shadow: 1px 1px 2px rgba(115, 155, 155, 0.8);
  transition: all 0.3s;
  pointer-events: none;
  &.danger {
    color: #333;
    background: var.$indicator-bg-color-danger;
  }
}
.cell {
  width: 26px;
  height: 26px;
  line-height: 26px;
  text-align: center;
  &.danger {
    color: red;
    text-decoration: underline;
    font-weight: bold;
  }
}
</style>