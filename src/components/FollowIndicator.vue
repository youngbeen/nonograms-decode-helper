<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import eventBus from '@/EventBus'

const isShow = ref(false)

const x = ref(0)
const y = ref(0)
const content = ref('')

onMounted(() => {
  eventBus.on('notifyShowFollowIndicator', params => {
    x.value = params.x || 0
    y.value = params.y || 0
    content.value = params.content
    isShow.value = true
  })
  eventBus.on('notifyHideFollowIndicator', () => {
    isShow.value = false
    content.value = ''
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
    {{ content }}
  </div>
</template>

<style scoped>
.box-follow-indicator {
  position: fixed;
  z-index: 2;
  padding: 4px;
  border: 1px solid rgb(170, 190, 255);
  background: rgba(255, 255, 255, 0.8);
  color: #666;
  font-size: 12px;
}
</style>