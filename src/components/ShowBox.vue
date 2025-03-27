<script setup>
import { onMounted, reactive } from 'vue'
import eventBus from '@/EventBus'
import { getShowBox } from '@/utils/storage'

const props = defineProps(['color'])

const showBox = reactive({
  dataList: getShowBox(),
  pictureList: [] // 存储canvas转换后的base64内容，可以直接显示
})

onMounted(() => {
  if (showBox.dataList && showBox.dataList.length) {
    handleDraw()
  }
  eventBus.on('notifyUpdateShowBox', () => {
    showBox.dataList = getShowBox()
    handleDraw()
  })
})

const handleDraw = async () => {
  showBox.pictureList = []
  const pictures = await Promise.all(showBox.dataList.map(async data => {
    return await draw(data.answerMap, props.color)
  }))
  console.log('🚀 ~ handleDraw ~ pictures:', pictures)
  showBox.pictureList = [...pictures]
}

const draw = async (data, color) => {
  const rows = data.length
  if (rows === 0) throw new Error('Invalid empty grid data')

  const cellSize = 20 // 每个单元格的尺寸
  const cols = data[0].length
  const canvas = document.createElement('canvas')
  canvas.width = cols * cellSize
  canvas.height = rows * cellSize
  const ctx = canvas.getContext('2d')

  // 绘制白色背景
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 遍历二维数组绘制色块
  for (let rowIdx = 0; rowIdx < rows; rowIdx++) {
    const rowData = data[rowIdx]
    for (let colIdx = 0; colIdx < rowData.length; colIdx++) {
      if (rowData[colIdx] === '1') {
        ctx.fillStyle = color
        ctx.fillRect(colIdx * cellSize, rowIdx * cellSize, cellSize, cellSize)
      }
    }
  }

  return canvas.toDataURL('image/png')
  // const url = await canvas.convertToBlob()
  // ctx.clear() // 清除绘图状态
  // return URL.createObjectURL(url)
}
</script>

<template>
  <div class="bed-show-box" v-show="showBox.pictureList.length">
    <div class="show-box"
      v-for="(image, i) in showBox.pictureList" :key="i"
    >
      <img :src="image" alt="">
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "../assets/var.scss" as var;

.bed-show-box {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: fixed;
  z-index: 11;
  right: 0;
  top: 0;
  bottom: 0;
  min-width: 200px;
  border-left: 2px solid var.$system-color;
  background: #fff;
  perspective: 900px;
  .show-box {
    width: 160px;
    // border: 2px solid #fafafa;
    background: #fff;
    box-shadow: 0 0 5px 0 rgb(76, 76, 77);
    transform-style: preserve-3d;
    transform: rotateX(-70deg) rotateY(0);
    // transform-origin: bottom;
    transition: all 0.3s ease-in-out;
    opacity: 0.9;
    &:hover {
      transform: translate3d(-50%, 0, 100px) scale(1.4) rotateX(0) rotateY(0);
      opacity: 1;
    }
    img {
      width: 100%;
    }
  }
}
</style>
