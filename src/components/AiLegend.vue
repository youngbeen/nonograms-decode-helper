<script setup>
</script>

<template>
  <div class="box-ai-legend">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 2C13.5 2.44425 13.3069 2.84339 13 3.11805V5H18C19.6569 5 21 6.34315 21 8V18C21 19.6569 19.6569 21 18 21H6C4.34315 21 3 19.6569 3 18V8C3 6.34315 4.34315 5 6 5H11V3.11805C10.6931 2.84339 10.5 2.44425 10.5 2C10.5 1.17157 11.1716 0.5 12 0.5C12.8284 0.5 13.5 1.17157 13.5 2ZM6 7C5.44772 7 5 7.44772 5 8V18C5 18.5523 5.44772 19 6 19H18C18.5523 19 19 18.5523 19 18V8C19 7.44772 18.5523 7 18 7H13H11H6ZM2 10H0V16H2V10ZM22 10H24V16H22V10ZM9 14.5C9.82843 14.5 10.5 13.8284 10.5 13C10.5 12.1716 9.82843 11.5 9 11.5C8.17157 11.5 7.5 12.1716 7.5 13C7.5 13.8284 8.17157 14.5 9 14.5ZM15 14.5C15.8284 14.5 16.5 13.8284 16.5 13C16.5 12.1716 15.8284 11.5 15 11.5C14.1716 11.5 13.5 12.1716 13.5 13C13.5 13.8284 14.1716 14.5 15 14.5Z"></path></svg>&nbsp;<span>AI Reasoning</span>
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