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

<style scoped>
.fly-top-indicator {
  position: fixed;
  z-index: 10;
  top: 0;
  left: 0;
  width: 26px;
  height: auto;
  color: #333;
  background: rgba(250, 250, 250, 1);
  border: 1px solid rgb(170, 190, 255);
  box-shadow: 1px 1px 2px rgba(115, 155, 155, 0.8);
  transition: all 0.3s;
  pointer-events: none;
}
.fly-top-indicator.danger {
  color: #333;
  background: rgba(255, 215, 215, 1);
}
.cell {
  width: 26px;
  height: 26px;
  line-height: 26px;
  text-align: center;
}
.cell.danger {
  border: 1px dashed red;
  border-radius: 50%;
  /* color: red; */
}
</style>