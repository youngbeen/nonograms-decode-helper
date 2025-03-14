<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import eventBus from '@/EventBus'

const isShow = ref(false)

const stringInfo = reactive({
  array: []
})
const changeIndex = ref(-1)
let callbackFn = () => {}
const x = ref(0)
const y = ref(0)

onMounted(() => {
  eventBus.on('notifyShowFollowNumberInput', params => {
    stringInfo.array = params.row || []
    changeIndex.value = params.changeIndex
    callbackFn = params.callback || (() => {})
    const windowWidth = window.innerWidth || document.documentElement.clientWidth
    const windowHeight = window.innerHeight || document.documentElement.clientHeight
    const originalX = params.x || 0
    const originalY = params.y || 0
    if (originalX > windowWidth - 140) {
      // 位置太靠右，修正位置
      x.value = windowWidth - 140
    } else {
      x.value = originalX
    }
    if (originalY > windowHeight - 170) {
      // 位置太靠下，修正位置
      y.value = windowHeight - 170
    } else {
      y.value = originalY
    }
    isShow.value = true
  })
})

onBeforeUnmount(() => {
  eventBus.off('notifyShowFollowNumberInput')
})

const submit = (val) => {
  if (callbackFn) {
    callbackFn(val)
  }
  isShow.value = false
  stringInfo.array = []
  changeIndex.value = -1
  callbackFn = () => {}
}
</script>

<template>
  <div class="box-follow-number-input"
    v-show="isShow"
    :style="{ left: x + 'px', top: y + 'px' }">
    <div class="number-info">
      <span
        :class="changeIndex === ci ? 'highlight' : ''"
        v-for="(c, ci) in stringInfo.array" :key="ci"
      >{{ c }}</span>
    </div>
    <div class="number-row">
      <div class="number"
        v-for="n in 16" :key="n"
        @click="submit(n - 1)">{{ n - 1 }}</div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "../assets/var.scss" as var;

.box-follow-number-input {
  position: fixed;
  z-index: 13;
  padding: 1rem;
  border: 1px solid var.$system-color;
  background: #fff;
  text-align: center;
  .number-info {
    color: #666;
    text-align: center;
    font-size: 20px;
    font-family: consolas;
    span {
      &:not(:last-of-type) {
        margin-right: 4px;
      }
      &.highlight {
        color: red;
        font-weight: bold;
      }
    }
  }
  .number-row {
    display: inline-block;
    width: 104px;
    .number {
      display: inline-block;
      width: 24px;
      height: 24px;
      line-height: 24px;
      margin-right: 2px;
      margin-bottom: 2px;
      background: rgba(var.$system-color, .5);
      text-align: center;
      user-select: nono;
      cursor: default;
      transition: all 0.2s;
      &:hover {
        background: rgba(var.$system-color, 1);
      }
    }
  }
}
</style>