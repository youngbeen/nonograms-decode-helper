<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import eventBus from '@/EventBus'

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
      <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.7279 9.57627L14.3137 8.16206L5 17.4758V18.89H6.41421L15.7279 9.57627ZM17.1421 8.16206L18.5563 6.74785L17.1421 5.33363L15.7279 6.74785L17.1421 8.16206ZM7.24264 20.89H3V16.6473L16.435 3.21231C16.8256 2.82179 17.4587 2.82179 17.8492 3.21231L20.6777 6.04074C21.0682 6.43126 21.0682 7.06443 20.6777 7.45495L7.24264 20.89Z"></path></svg>
      Edit
    </div>
    <div class="menu-item"
      @click="handleSelect('cloneToNext')">
      <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6.9998 6V3C6.9998 2.44772 7.44752 2 7.9998 2H19.9998C20.5521 2 20.9998 2.44772 20.9998 3V17C20.9998 17.5523 20.5521 18 19.9998 18H16.9998V20.9991C16.9998 21.5519 16.5499 22 15.993 22H4.00666C3.45059 22 3 21.5554 3 20.9991L3.0026 7.00087C3.0027 6.44811 3.45264 6 4.00942 6H6.9998ZM5.00242 8L5.00019 20H14.9998V8H5.00242ZM8.9998 6H16.9998V16H18.9998V4H8.9998V6Z"></path></svg>
      Clone To Next
    </div>
    <div class="menu-item"
      @click="handleSelect('cloneToAdd')">
      <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6.9998 6V3C6.9998 2.44772 7.44752 2 7.9998 2H19.9998C20.5521 2 20.9998 2.44772 20.9998 3V17C20.9998 17.5523 20.5521 18 19.9998 18H16.9998V20.9991C16.9998 21.5519 16.5499 22 15.993 22H4.00666C3.45059 22 3 21.5554 3 20.9991L3.0026 7.00087C3.0027 6.44811 3.45264 6 4.00942 6H6.9998ZM5.00242 8L5.00019 20H14.9998V8H5.00242ZM8.9998 6H16.9998V16H18.9998V4H8.9998V6Z"></path></svg>
      Clone To Add
    </div>
    <div class="menu-item"
      @click="handleSelect('delete')">
      <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM13.4142 13.9997L15.182 15.7675L13.7678 17.1817L12 15.4139L10.2322 17.1817L8.81802 15.7675L10.5858 13.9997L8.81802 12.232L10.2322 10.8178L12 12.5855L13.7678 10.8178L15.182 12.232L13.4142 13.9997ZM9 4V6H15V4H9Z"></path></svg>
      Delete
    </div>
    <div class="menu-item"
      @click="handleSelect('')">
      <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z"></path></svg>
      Cancel
    </div>
  </div>
</template>

<style scoped>
.box-follow-menu {
  position: fixed;
  z-index: 11;
  padding: 4px;
  border: 1px solid rgb(170, 190, 255);
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
  background: rgb(170, 190, 255);
}
.icon {
  margin-right: 4px;
  width: 20px;
  height: 20px;
  /* color: rgb(170, 190, 255); */
}
</style>