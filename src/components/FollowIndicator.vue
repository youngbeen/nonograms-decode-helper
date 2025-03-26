<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import eventBus from '@/EventBus'
import ExpendVertical from '@/assets/icons/ExpendVertical.vue'
import ExpendHorizontal from '@/assets/icons/ExpendHorizontal.vue'

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
      <ExpendVertical class="cs-icon icon" />
      {{ contentSide }}
    </div>
    <div class="content" :class="contentSide && 'padded'"
      v-show="content">
      <ExpendHorizontal class="cs-icon icon" /> {{ content }}
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "../assets/var.scss" as var;

.box-follow-indicator {
  position: fixed;
  z-index: 3;
  padding: 4px;
  border: 1px solid var.$system-color;
  background: rgba(255, 255, 255, 0.9);
  color: #666;
  font-size: 12px;
}
.icon {
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