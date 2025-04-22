<script setup>
import Robot from '@/assets/icons/Robot.vue'
</script>

<template>
  <div class="box-ai-legend">
    <div class="bg-layer"></div>
    <div class="info-box">
      <Robot />&nbsp;<span>AI Reasoning</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "../assets/var.scss" as var;

.box-ai-legend {
  position: fixed;
  z-index: 14;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  .bg-layer {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    background: rgba(110, 110, 110, 0.6);
  }
  .info-box {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    padding: 8px;
    border: 2px solid var.$system-color;
    background: rgba(255, 255, 255, 1);
    // color: #666;
    font-size: 18px;
    svg {
      width: 22px;
      animation-name: heartBeat;
      animation-duration: 1.3s;
      animation-timing-function: ease-in-out;
      animation-iteration-count: infinite;
    }
    // &:after {
    //   position: absolute;
    //   right: -2px;
    //   top: -2px;
    //   content: "";
    //   width: 8px;
    //   height: 8px;
    //   border-radius: 50%;
    //   background-color: red;
    // }
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
@keyframes heartBeat {
  0% {
    -webkit-transform: scale(1);
    transform: scale(1);
  }

  14% {
    -webkit-transform: scale(1.3);
    transform: scale(1.3);
  }

  28% {
    -webkit-transform: scale(1);
    transform: scale(1);
  }

  42% {
    -webkit-transform: scale(1.3);
    transform: scale(1.3);
  }

  70% {
    -webkit-transform: scale(1);
    transform: scale(1);
  }
}
</style>