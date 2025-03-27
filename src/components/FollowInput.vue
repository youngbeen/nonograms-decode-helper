<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import eventBus from '@/EventBus'

const isShow = ref(false)

const x = ref(0)
const y = ref(0)
const inputValue = ref('')
let callbackFn = () => {}

onMounted(() => {
  eventBus.on('notifyShowFollowInput', params => {
    // console.log('show follow input', params)
    const windowWidth = window.innerWidth || document.documentElement.clientWidth
    const originalX = params.x || 0
    if (originalX > windowWidth - 420) {
      // 位置太靠右，修正位置
      x.value = windowWidth - 420
    } else {
      x.value = originalX
    }
    y.value = params.y || 0
    inputValue.value = params.value.join(' ')
    callbackFn = params.callback || (() => {})
    isShow.value = true
  })
})

onBeforeUnmount(() => {
  eventBus.off('notifyShowFollowInput')
})

const submit = () => {
  if (callbackFn) {
    callbackFn(inputValue.value)
  }
  isShow.value = false
  inputValue.value = ''
  callbackFn = () => {}
}
</script>

<template>
  <div class="box-follow-input"
    v-show="isShow"
    :style="{ left: x + 'px', top: y + 'px' }">
    <input class="cs-input" type="text"
      v-model="inputValue">
    <button class="cs-button primary"
      @click="submit">
      <span class="shadow"></span>
      <span class="edge"></span>
      <span class="front text">Ok</span>
    </button>
  </div>
</template>

<style lang="scss" scoped>
@use "../assets/var.scss" as var;

.box-follow-input {
  position: fixed;
  z-index: 13;
  padding: 1rem;
  border: 1px solid var.$system-color;
  background: #fff;
}
input {
  margin-right: 1rem;
  min-width: 200px;
  height: 48px;
  line-height: 48px;
  font-size: 24px;
  font-weight: 500;
  font-family: consolas;
}
button {
  // height: 48px;
  width: 60px;
  // font-size: 24px;
  .text {
    display: inline-block;
    width: 100%;
    text-align: center;
  }
}
</style>