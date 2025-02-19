<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import eventBus from '@/EventBus'

const isShow = ref(false)

const x = ref(0)
const y = ref(0)
const content = ref('')
const contentSide = ref('')

onMounted(() => {
  eventBus.on('notifyShowFollowIndicator', params => {
    x.value = params.x || 0
    y.value = params.y || 0
    content.value = params.content || ''
    contentSide.value = params.contentSide || ''
    isShow.value = true
  })
  eventBus.on('notifyHideFollowIndicator', () => {
    isShow.value = false
    content.value = ''
    contentSide.value = ''
  })
})

onBeforeUnmount(() => {
  eventBus.off('notifyShowFollowIndicator')
  eventBus.off('notifyHideFollowIndicator')
})
</script>

<template>
  <div class="box-follow-indicator"
    v-show="isShow"
    :style="{ left: x + 4 + 'px', top: (y - 34) + 'px' }">
    <div class="side-content"
      v-show="contentSide">
      <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16.9492 7.44926L11.9995 2.49951L7.05222 7.44678L8.46643 8.86099L10.9995 6.32794L10.9995 17.6704L8.46448 15.1353L7.05026 16.5496L12 21.4995L16.9497 16.5498L15.5355 15.1356L12.9995 17.6716L12.9995 6.32794L15.535 8.86347L16.9492 7.44926Z"></path></svg>
      {{ contentSide }}
    </div>
    <div class="content" :class="contentSide && 'padded'"
      v-show="content">
      <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7.44975 7.05029L2.5 12L7.44727 16.9473L8.86148 15.5331L6.32843 13H17.6708L15.1358 15.535L16.55 16.9493L21.5 11.9996L16.5503 7.0498L15.136 8.46402L17.6721 11H6.32843L8.86396 8.46451L7.44975 7.05029Z"></path></svg> {{ content }}
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "../assets/var.scss" as var;

.box-follow-indicator {
  position: fixed;
  z-index: 2;
  padding: 4px;
  border: 1px solid var.$system-color;
  background: rgba(255, 255, 255, 0.9);
  color: #666;
  font-size: 12px;
}
.icon {
  width: 20px;
  height: 20px;
  color: var.$system-color;
}
.side-content {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  /* text-align: right; */
  font-size: 16px;
}
.content {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  /* text-align: left; */
  font-size: 16px;
}
.content.padded {
  margin-right: 30px;
}
</style>