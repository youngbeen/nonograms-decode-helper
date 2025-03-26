<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import eventBus from '@/EventBus'
import Pen from '@/assets/icons/Pen.vue'
import Clone from '@/assets/icons/Clone.vue'
import TrashBin from '@/assets/icons/TrashBin.vue'
import Cross from '@/assets/icons/Cross.vue'

const isShow = ref(false)

const x = ref(0)
const y = ref(0)

let callbackFn = () => {}

onMounted(() => {
  eventBus.on('notifyShowFollowMenu', params => {
    x.value = params.x || 0
    y.value = params.y || 0
    callbackFn = params.callback || (() => {})
    isShow.value = true
  })
  eventBus.on('notifyHideFollowMenu', () => {
    isShow.value = false
    callbackFn = () => {}
  })
})

onBeforeUnmount(() => {
  eventBus.off('notifyShowFollowMenu')
  eventBus.off('notifyHideFollowMenu')
})

const handleSelect = (key) => {
  if (callbackFn) {
    callbackFn(key)
  }
  isShow.value = false
  callbackFn = () => {}
}
</script>

<template>
  <div class="box-follow-menu"
    v-show="isShow"
    :style="{ left: x + 4 + 'px', top: y + 4 + 'px' }">
    <div class="menu-item"
      @click="handleSelect('edit')">
      <Pen class="cs-icon icon" />
      Edit
    </div>
    <div class="menu-item"
      @click="handleSelect('cloneToNext')">
      <Clone class="cs-icon icon" />
      Clone To Next
    </div>
    <div class="menu-item"
      @click="handleSelect('cloneToAdd')">
      <Clone class="cs-icon icon" />
      Clone To Add
    </div>
    <div class="menu-item"
      @click="handleSelect('delete')">
      <TrashBin class="cs-icon icon" />
      Delete
    </div>
    <div class="menu-item"
      @click="handleSelect('')">
      <Cross class="cs-icon icon" />
      Cancel
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "../assets/var.scss" as var;

.box-follow-menu {
  position: fixed;
  z-index: 11;
  padding: 4px;
  border: 1px solid var.$system-color;
  background: rgba(255, 255, 255, 1);
  color: #333;
  font-size: 12px;
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
  background: var.$system-color;
}
.icon {
  margin-right: 4px;
}
</style>