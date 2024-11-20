<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import eventBus from '@/EventBus'

const props = defineProps({
  menu: {
    type: Array,
    required: false,
    default: () => []
  }
})

const isShow = ref(false)
const num = ref('1')

const x = ref(0)
const y = ref(0)
const tag = ref('')
const hoverIndex = ref(-1)

let callbackFn = () => {}

onMounted(() => {
  eventBus.on('notifyShowInputAssist', params => {
    x.value = params.x || 0
    y.value = params.y || 0
    tag.value = params.tag || ''
    callbackFn = params.callback || (() => {})
    isShow.value = true
  })
  eventBus.on('notifyHideInputAssist', (t) => {
    if (tag.value === t) {
      isShow.value = false
      tag.value = ''
      callbackFn = () => {}
    }
  })
})

onBeforeUnmount(() => {
  eventBus.off('notifyShowInputAssist')
  eventBus.off('notifyHideInputAssist')
})

const handleSelectRepeatContent = (count) => {
  if (!num.value) {
    return
  }
  const content = `${num.value}*${count > 9 ? '91' : count}`
  handleSelect(content)
}

const handleSelect = (content) => {
  // console.log('inner', content)
  if (callbackFn) {
    callbackFn(content)
  }
  isShow.value = false
  tag.value = ''
  callbackFn = () => {}
}
</script>

<template>
  <div class="box-input-assist"
    v-show="isShow"
    :style="{ left: x + 4 + 'px', top: y + 4 + 'px' }">
    <span class="count-cell"
      :class="[hoverIndex >= i - 1 && 'active']"
      @mouseover="hoverIndex = i - 1"
      @mouseout="hoverIndex = -1"
      @click="handleSelectRepeatContent(i)"
      v-for="i in 10" :key="i">{{ i }}</span> * {{ num }}
    <hr>
    <div class="menu-item"
      v-for="(m, index) in props.menu" :key="index"
      @click="handleSelect(m)">
      {{ m }}
    </div>
  </div>
</template>

<style scoped>
.box-input-assist {
  position: fixed;
  z-index: 11;
  padding: 4px;
  border: 1px solid rgb(170, 190, 255);
  background: rgba(255, 255, 255, 1);
  color: #333;
  font-size: 12px;
}
.count-cell {
  display: inline-block;
  /* margin-right: 2px; */
  width: 20px;
  height: 24px;
  line-height: 20px;
  border: 1px solid rgb(170, 190, 255);
  text-align: center;
  font-size: 13px;
  cursor: default;
}
.count-cell.active {
  background: rgb(170, 190, 255);;
}
hr {
  margin-top: 4px;
  margin-bottom: 4px;
  color: #999;
}
.menu-item {
  display: flex;
  align-items: center;
  height: 24px;
  padding: 4px;
  font-size: 14px;
  transition: all 0.2s;
  cursor: default;
}
.menu-item:hover {
  background: rgb(170, 190, 255);
}
.icon {
  margin-right: 4px;
  width: 20px;
  height: 20px;
}
</style>