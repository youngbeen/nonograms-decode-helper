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
    x.value = params.x || 0
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
    <input type="text"
      v-model="inputValue">
    <button
      @click="submit">Ok</button>
  </div>
</template>

<style scoped>
.box-follow-input {
  position: fixed;
  z-index: 3;
  padding: 1rem;
  border: 1px solid rgb(170, 190, 255);
  background: #fff;
}
input {
  margin-right: 1rem;
  min-width: 200px;
  height: 30px;
  line-height: 30px;
}
</style>