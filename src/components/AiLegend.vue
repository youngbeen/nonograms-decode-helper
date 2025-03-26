<script setup>
import Robot from '@/assets/icons/Robot.vue'
</script>

<template>
  <div class="box-ai-legend">
    <Robot />&nbsp;<span>AI Reasoning</span>
  </div>
</template>

<style lang="scss" scoped>
@use "../assets/var.scss" as var;

.box-ai-legend {
  position: relative;
  display: flex;
  align-items: center;
  position: fixed;
  z-index: 2;
  left: 8px;
  top: 8px;
  padding: 4px;
  border: 1px solid var.$system-color;
  background: rgba(255, 255, 255, 1);
  // color: #666;
  font-size: 12px;
  svg {
    width: 16px;
  }
  &:after {
    position: absolute;
    right: -2px;
    top: -2px;
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: red;
  }
}
// .icon {
//   width: 20px;
//   height: 20px;
//   color: var.$system-color;
// }
// .side-content {
//   display: flex;
//   justify-content: flex-end;
//   align-items: center;
//   /* text-align: right; */
//   font-size: 16px;
// }
// .content {
//   display: flex;
//   justify-content: flex-start;
//   align-items: center;
//   /* text-align: left; */
//   font-size: 16px;
// }
// .content.padded {
//   margin-right: 30px;
// }
</style>