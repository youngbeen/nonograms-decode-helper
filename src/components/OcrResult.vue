<script setup>
import { ref, onMounted, onBeforeUnmount, reactive } from 'vue'
import { createWorker } from 'tesseract.js'
import eventBus from '@/EventBus'
import { optimizeImage } from '@/utils/image'
import { getLineSum } from '@/utils/core'

const isShow = ref(false)
const width = ref(20)
const height = ref(20)
const step = ref('load') // load | confirm
const tab = ref('left') // left | top
const leftFile = ref(null)
const topFile = ref(null)
const ocrLeftResult = reactive({
  result: [],
  originalImage: null,
  fixedImage: null
})
const ocrTopResult = reactive({
  result: [],
  originalImage: null,
  fixedImage: null
})

onMounted(() => {
  eventBus.on('ocrInput', () => {
    isShow.value = true
  })
})

onBeforeUnmount(() => {
  eventBus.off('ocrInput')
})

const setSize = (w, h) => {
  width.value = w
  height.value = h || w
}

const handleFileChange = (event, location) => {
  const files = event.target.files
  const postFiles = Array.prototype.slice.call(files)
  if (postFiles.length === 0) {
    return
  }
  if (location === 'left') {
    leftFile.value = postFiles[0]
  } else {
    topFile.value = postFiles[0]
  }
}

const ocrLoad = (image, location) => {
  // 先预处理图片
  const reader = new FileReader()
  reader.onload = (e) => {
    // e.target.result 是DataURL
    const imageUrl = e.target.result
    // 创建Image对象
    const newImage = new Image()
    newImage.src = imageUrl
    // 等待图片加载完成后处理
    newImage.onload = async () => {
      const fixedImage = preprocessImage(newImage, location)
      console.log('fixedImage', fixedImage)
      if (location === 'top') {
        // 顶部的数字是竖向的，行级扫描识别会丢失位置信息，切分为竖列N个小图块识别可以保证同一列数字不丢失
        const mainImage = new Image()
        mainImage.src = fixedImage
        mainImage.onload = async (e) => {
          const worker = await createWorker('eng', 1, {
            corePath: '/nonograms-decode/',
            workerPath: '/nonograms-decode/worker.min.js'
          })
          await worker.setParameters({
            tessedit_char_whitelist: '0123456789',
            // preserve_interword_spaces: '1',
            // tessedit_pageseg_mode: '5'
          })
          const choppedImages = chopImage(mainImage, width.value, 'vertical')
          console.log('choppedImages', choppedImages)
          const rets = await Promise.all(choppedImages.map(async c => {
            const ret = await worker.recognize(c)
            return ret.data.text
          }))
          // console.log('rets', rets)
          afterOcr(rets, imageUrl, choppedImages, location)
          await worker.terminate()
        }
      } else {
        // 左侧以一个整体逐行识别，准确率高
        const worker = await createWorker('eng', 1, {
          corePath: '/nonograms-decode/',
          workerPath: '/nonograms-decode/worker.min.js'
        })
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789',
          // preserve_interword_spaces: '1',
          // tessedit_pageseg_mode: '5'
        })
        const ret = await worker.recognize(fixedImage)
        // console.log(ret.data.text)
        afterOcr(ret.data.text, imageUrl, fixedImage, location)
        await worker.terminate()
      }
    }
  }
  reader.readAsDataURL(image)
}
const preprocessImage = (image, location) => {
  const canvas = document.querySelector(`#ocr-canvas-${location}`)
  const ctx = canvas.getContext('2d', {
    willReadFrequently: true
  })
  // 设置Canvas的尺寸与图片一致
  canvas.width = image.width
  canvas.height = image.height
  ctx.drawImage(image, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  optimizeImage(imageData)

  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL()
}
const chopImage = (mainImage, segCount, direction) => {
  const canvas = document.querySelector('#ocr-canvas-top')
  const ctx = canvas.getContext('2d', {
    willReadFrequently: true
  })
  const mainImageWidth = mainImage.width
  const mainImageHeight = mainImage.height
  let result = []
  if (direction === 'vertical') {
    // 竖向切割
    const chopWidth = mainImageWidth / segCount
    // 设置Canvas的尺寸与图片一致
    canvas.width = chopWidth
    canvas.height = mainImageHeight
    for (let i = 0; i < segCount; i++) {
      ctx.drawImage(mainImage, i * chopWidth, 0, chopWidth, mainImageHeight, 0, 0, chopWidth, mainImageHeight)
      result.push(canvas.toDataURL())
    }
  } else {
    // 横向切割
    const chopHeight = mainImageHeight / segCount
    // 设置Canvas的尺寸与图片一致
    canvas.width = mainImageWidth
    canvas.height = chopHeight
    for (let i = 0; i < segCount; i++) {
      ctx.drawImage(mainImage, 0, i * chopHeight, mainImageWidth, chopHeight, 0, 0, mainImageWidth, chopHeight)
      result.push(canvas.toDataURL())
    }
  }

  return result
}
const afterOcr = (rawContent, originalImage, fixedImage, location) => {
  console.log('OCR数据', rawContent)
  if (location === 'top') {
    // 处理顶部的数字
    const columns = rawContent.map(r => {
      if (!r) {
        return ['0']
      } else {
        let ary = r.split('\n')
        return ary.filter(item => item)
      }
    })
    console.log(columns)
    ocrTopResult.result = columns
    ocrTopResult.originalImage = originalImage
    ocrTopResult.fixedImage = fixedImage
  } else {
    // 处理左侧的数字，以行形式存在
    const rows = rawContent.split('\n')
    let fixedRows = rows.map(item => item.replace(/\D/g, ''))
    fixedRows = fixedRows.filter(item => item)
    fixedRows = fixedRows.map(item => item.split(''))
    fixedRows.forEach(r => {
      if (r.length > 1 && r.indexOf('0') > -1) {
        // 如果识别内容数字有多个，里面是不可能存在孤立的数字0的。将0和其左边数字合并
        // 先找出所有是0的位置
        const allZeroIndex = r.reduce((soFar, item, i) => {
          if (item === '0') {
            soFar.push(i)
          }
          return soFar
        }, [])
        for (let j = allZeroIndex.length - 1; j >= 0; j--) {
          // 从末尾处理，将指定的0位置目前的内容拿到，然后合并到其左侧数字中
          const targetZeroIndex = allZeroIndex[j]
          const targetContent = r[targetZeroIndex]
          if (targetZeroIndex - 1 >= 0) {
            r[targetZeroIndex - 1] = `${r[targetZeroIndex - 1]}${targetContent}`
            r.splice(targetZeroIndex, 1)
          }
        }
      }
    })
    console.log(fixedRows)
    ocrLeftResult.result = fixedRows
    ocrLeftResult.originalImage = originalImage
    ocrLeftResult.fixedImage = fixedImage
  }
}

const handleCollapse = (rowIndex, cellIndex) => {
  // 将指定的格子和右侧格子数字合并
  const row = ocrLeftResult.result[rowIndex]
  const rightNumber = row[cellIndex + 1]
  row.splice(cellIndex + 1, 1)
  row[cellIndex] = `${row[cellIndex].toString()}${rightNumber.toString()}`
}
const handleExpend = (rowIndex, cellIndex) => {
  // 将指定的格子数字全部拆分为单独数字
  const row = ocrLeftResult.result[rowIndex]
  const expendNumbers = row[cellIndex].toString().split('')
  row.splice(cellIndex, 1, ...expendNumbers)
}
const handleSingleNumberEdit = (rowIndex, cellIndex, location, e) => {
  const result = location === 'left' ? ocrLeftResult.result : ocrTopResult.result
  const row = result[rowIndex]
  eventBus.emit('notifyShowFollowNumberInput', {
    x: e.clientX,
    y: e.clientY,
    row,
    changeIndex: cellIndex,
    callback: (value) => {
      row[cellIndex] = value
    }
  })
}
const handleEdit = (rowIndex, location, e) => {
  const result = location === 'left' ? ocrLeftResult.result : ocrTopResult.result
  const row = result[rowIndex]
  eventBus.emit('notifyShowFollowInput', {
    x: e.clientX,
    y: e.clientY,
    value: row,
    callback: (value) => {
      const fixedVal = value.replace(/[^\d\s,/]/g, '').replace(/[\s/]/g, ',').replace(/,{2,}/g, ',').replace(/^,/, '').replace(/,$/, '')
      const ary = fixedVal.split(',')
      result.splice(rowIndex, 1, ary)
    }
  })
}
const handleNew = (rowIndex, location, div) => {
  const result = location === 'left' ? ocrLeftResult.result : ocrTopResult.result
  result.splice(rowIndex + div, 0, ['1'])
}
const handleDelete = (rowIndex, location) => {
  const result = location === 'left' ? ocrLeftResult.result : ocrTopResult.result
  result.splice(rowIndex, 1)
}
const confirm = () => {
  if (step.value === 'load') {
    // 加载
    if (!width.value || !height.value || !leftFile.value || !topFile.value) {
      window.alert('You need to set OCR at first')
      return
    }
    ocrLoad(leftFile.value, 'left')
    ocrLoad(topFile.value, 'top')
    step.value = 'confirm'
  } else {
    // 确认结果
    if (ocrLeftResult.result.length !== height.value || ocrTopResult.result.length !== width.value) {
      window.alert('Wrong size result')
      return
    }
    let flag = true
    const wrongPuzLines = []
    ocrTopResult.result.forEach((t, i) => {
      if (getLineSum(t) > height.value) {
        flag = false
        wrongPuzLines.push(`top${i + 1}`)
      }
    })
    ocrLeftResult.result.forEach((l, i) => {
      if (getLineSum(l) > width.value) {
        flag = false
        wrongPuzLines.push(`left${i + 1}`)
      }
    })
    if (!flag) {
      window.alert(`Numbers are oversize(${wrongPuzLines.join(',')})`)
      return
    }
    // all top numbers sum must === all left numbers sum, check it
    let topSum = 0
    ocrTopResult.result.forEach(t => {
      t.forEach(n => {
        topSum += parseInt(n, 10)
      })
    })
    let leftSum = 0
    ocrLeftResult.result.forEach(l => {
      l.forEach(n => {
        leftSum += parseInt(n, 10)
      })
    })
    if (topSum !== leftSum) {
      window.alert(`Numbers sum is not correct(left${leftSum}, top${topSum})`)
      return
    }
    eventBus.emit('confirmOcrResult', {
      leftResult: ocrLeftResult.result,
      topResult: ocrTopResult.result,
    })
    close()
  }
}
const close = () => {
  ocrLeftResult.result = []
  ocrLeftResult.originalImage = null
  ocrLeftResult.fixedImage = null
  ocrTopResult.result = []
  ocrTopResult.originalImage = null
  ocrTopResult.fixedImage = null
  step.value = 'load'
  tab.value = 'left'
  leftFile.value = null
  topFile.value = null
  document.querySelector('#ocr-file-upload-left').value = ''
  document.querySelector('#ocr-file-upload-top').value = ''
  isShow.value = false
}
</script>

<template>
  <div class="box-ocr-result"
    v-show="isShow">
    <div class="cs-pop-title">{{ step === 'load' ? 'Set OCR' : 'Confirm OCR Result' }}</div>
    <!-- 设置尺寸 & 加载图片 -->
    <div v-show="step === 'load'">
      <p>
        <button @click="setSize(20)">20x20</button>
        <button @click="setSize(15)">15x15</button>
        <button @click="setSize(12)">12x12</button>
        <button @click="setSize(10)">10x10</button>
        <button @click="setSize(8)">8x8</button>
      </p>
      <p>
        <label>
          width
          <input type="text" v-model="width" placeholder="width" style="width: 60px;">
        </label>
        <label>
          height
          <input type="text" v-model="height" placeholder="height" style="width: 60px;">
        </label>
      </p>
      <hr style="margin: 16px 0;">
      <p>
        <label>
          left
          <input id="ocr-file-upload-left" type="file" name="image" accept=".jpg,.png,.jpeg,.bmp" @change="handleFileChange($event, 'left')" />
        </label>
        <label>
          top
          <input id="ocr-file-upload-top" type="file" name="image" accept=".jpg,.png,.jpeg,.bmp" @change="handleFileChange($event, 'top')" />
        </label>
        <canvas id="ocr-canvas-left" style="display: none;"></canvas>
        <canvas id="ocr-canvas-top" style="display: none;"></canvas>
      </p>
      <hr style="margin: 16px 0;">
    </div>

    <!-- 展示并确认OCR结果 -->
    <div v-show="step === 'confirm'">
      <p class="box-tabs">
        <button class="tab"
          :class="[tab === 'left' && 'active']"
          @click="tab = 'left'">Left</button>
        <button class="tab"
          :class="[tab === 'top' && 'active']"
          @click="tab = 'top'">Top</button>
      </p>
      <!-- 左侧配置 -->
      <div style="display: flex;">
        <div style="margin-right: 8px; max-height: 788px;">
          <img class="ocr-image-left" v-show="tab === 'left'" :src="ocrLeftResult.originalImage" alt="">
        </div>
        <div class="box-left-confirm"
          v-show="tab === 'left'">
          <div class="row-box"
            v-for="(r, ri) in ocrLeftResult.result" :key="ri">
            <div class="row"
              :class="[getLineSum(r) > width && 'warning-row']"
              :data-index="ri + 1"
              @dblclick="handleEdit(ri, 'left', $event)">
              <div class="cell"
                :class="[parseInt(c) > width && 'warning-cell']"
                v-for="(c, ci) in r" :key="ci"
                @click="handleSingleNumberEdit(ri, ci, 'left', $event)">
                <svg class="icon-btn icon-expend" v-if="c.length > 1" @click.stop="handleExpend(ri, ci)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7.44975 7.05029L2.5 12L7.44727 16.9473L8.86148 15.5331L6.32843 13H17.6708L15.1358 15.535L16.55 16.9493L21.5 11.9996L16.5503 7.0498L15.136 8.46402L17.6721 11H6.32843L8.86396 8.46451L7.44975 7.05029Z"></path></svg>
                {{ c }}
                <svg class="icon-btn icon-collapse" v-if="ci < r.length - 1" @click.stop="handleCollapse(ri, ci)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 12 18.4497 7.05029 19.864 8.46451 17.3284 11H23V13H17.3284L19.8615 15.5331 18.4473 16.9473 13.5 12ZM1 13H6.67084L4.13584 15.535 5.55005 16.9493 10.5 11.9996 5.55025 7.0498 4.13604 8.46402 6.67206 11H1V13Z"></path></svg>
              </div>
            </div>
            <div class="box-row-actions">
              <svg class="icon-btn icon-edit" @click="handleEdit(ri, 'left', $event)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.7279 9.57627L14.3137 8.16206L5 17.4758V18.89H6.41421L15.7279 9.57627ZM17.1421 8.16206L18.5563 6.74785L17.1421 5.33363L15.7279 6.74785L17.1421 8.16206ZM7.24264 20.89H3V16.6473L16.435 3.21231C16.8256 2.82179 17.4587 2.82179 17.8492 3.21231L20.6777 6.04074C21.0682 6.43126 21.0682 7.06443 20.6777 7.45495L7.24264 20.89Z"></path></svg>
              <svg class="icon-btn icon-copyup" @click="handleNew(ri, 'left', 0)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3H4C3.44772 3 3 3.44772 3 4V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V4C21 3.44772 20.5523 3 20 3ZM5 19V5H19V19H5ZM12 6.34311L6.34315 12L7.75736 13.4142L11 10.1715V17.6568H13V10.1715L16.2426 13.4142L17.6569 12L12 6.34311Z"></path></svg>
              <svg class="icon-btn icon-copydown" @click="handleNew(ri, 'left', 1)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3H4C3.44772 3 3 3.44772 3 4V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V4C21 3.44772 20.5523 3 20 3ZM5 19V5H19V19H5ZM11.0005 6.34375V13.829L7.75789 10.5864L6.34367 12.0006L12.0005 17.6575L17.6574 12.0006L16.2432 10.5864L13.0005 13.829V6.34375H11.0005Z"></path></svg>
              <svg class="icon-btn icon-delete" @click="handleDelete(ri, 'left')" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM13.4142 13.9997L15.182 15.7675L13.7678 17.1817L12 15.4139L10.2322 17.1817L8.81802 15.7675L10.5858 13.9997L8.81802 12.232L10.2322 10.8178L12 12.5855L13.7678 10.8178L15.182 12.232L13.4142 13.9997ZM9 4V6H15V4H9Z"></path></svg>
            </div>
          </div>
        </div>
      </div>
      <!-- 上侧配置 -->
      <div>
        <div style="max-width: 760px;">
          <img class="ocr-image-top" v-show="tab === 'top'" :src="ocrTopResult.originalImage" alt="">
        </div>
        <div class="box-top-confirm"
          v-show="tab === 'top'">
          <div class="col-box"
          v-for="(r, ri) in ocrTopResult.result" :key="ri">
          <div class="col"
              :class="[getLineSum(r) > height && 'warning-col']"
              :data-index="ri + 1"
              @dblclick="handleEdit(ri, 'top', $event)">
              <div class="cell"
                :class="[parseInt(c) > height && 'warning-cell']"
                v-for="(c, ci) in r" :key="ci"
                @click="handleSingleNumberEdit(ri, ci, 'top', $event)">
                {{ c }}
              </div>
            </div>
            <div class="box-col-actions">
              <svg class="icon-btn icon-edit" @click="handleEdit(ri, 'top', $event)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.7279 9.57627L14.3137 8.16206L5 17.4758V18.89H6.41421L15.7279 9.57627ZM17.1421 8.16206L18.5563 6.74785L17.1421 5.33363L15.7279 6.74785L17.1421 8.16206ZM7.24264 20.89H3V16.6473L16.435 3.21231C16.8256 2.82179 17.4587 2.82179 17.8492 3.21231L20.6777 6.04074C21.0682 6.43126 21.0682 7.06443 20.6777 7.45495L7.24264 20.89Z"></path></svg>
              <svg class="icon-btn icon-copyup" @click="handleNew(ri, 'top', 0)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3H4C3.44772 3 3 3.44772 3 4V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V4C21 3.44772 20.5523 3 20 3ZM5 19V5H19V19H5ZM6.3436 12.001L12.0005 6.34412L13.4147 7.75834L10.172 11.001H17.6573V13.001H10.172L13.4147 16.2436L12.0005 17.6578L6.3436 12.001Z"></path></svg>
              <svg class="icon-btn icon-copydown" @click="handleNew(ri, 'top', 1)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3H4C3.44772 3 3 3.44772 3 4V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V4C21 3.44772 20.5523 3 20 3ZM5 19V5H19V19H5ZM17.6569 12L12 17.6568L10.5858 16.2426L13.8284 13H6.34315V11L13.8284 11L10.5858 7.75732L12 6.34311L17.6569 12Z"></path></svg>
              <svg class="icon-btn icon-delete" @click="handleDelete(ri, 'top')" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM13.4142 13.9997L15.182 15.7675L13.7678 17.1817L12 15.4139L10.2322 17.1817L8.81802 15.7675L10.5858 13.9997L8.81802 12.232L10.2322 10.8178L12 12.5855L13.7678 10.8178L15.182 12.232L13.4142 13.9997ZM9 4V6H15V4H9Z"></path></svg>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="cs-tip">
      <div class="tip">Size <span :class="[width && ocrTopResult.result.length !== width && 'wrong']">{{ width || '?' }}</span> x <span :class="[height && ocrLeftResult.result.length !== height && 'wrong']">{{ height || '?' }}</span></div>
    </div>
    <div class="bottom-actions">
      <button @click="confirm()" style="margin-right: 4px;">Confirm</button>
      <button @click="close()">Cancel</button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "../assets/var.scss" as var;

.box-ocr-result {
  position: relative;
  position: fixed;
  z-index: 12;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 16px;
  border: 2px solid var.$system-color;
  background: rgba(255, 255, 255, 1);
  // color: #666;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
  .ocr-image-left {
    max-width: 400px;
    height: 100%;
  }
  .ocr-image-top {
    width: 100%;
    max-height: 400px;
  }
  .cell {
    display: inline-block;
    position: relative;
    width: 28px;
    height: 28px;
    line-height: 28px;
    border: 1px solid var.$system-color;
    border-radius: 2px;
    text-align: center;
    cursor: default;
    user-select: none;
    &:not(:last-of-type) {
      margin-right: 2px;
    }
    &.warning-cell {
      background: var.$system-color-danger;
    }
  }
  .icon-btn {
    width: 20px;
    height: 20px;
    padding: 2px;
    background: var.$system-color;
    border-radius: 4px;
    box-shadow: 1px 1px 2px rgba(115, 155, 155, 0.8);
    cursor: pointer;
    transition: all 0.3s;
  }
  .box-tabs {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    .tab {
      width: 50%;
      height: 48px;
      background: #fff;
      color: #666;
      border: 1px solid var.$border-color;
      font-size: 14px;
      &.active {
        color: #333;
        background: var.$system-color;
        font-weight: bold;
      }
    }
  }
  .box-left-confirm {
    margin-bottom: 4px;
    max-height: calc(100vh - 210px);
    overflow-y: auto;
    .row-box {
      position: relative;
      margin-bottom: 2px;
      padding-right: 100px;
      .row {
        position: relative;
        display: flex;
        justify-content: flex-end;
        min-width: 360px;
        padding: 4px 16px;
        border: 1px solid var.$border-color;
        user-select: none;
        &:before {
          position: absolute;
          left: 0;
          top: 4px;
          height: 28px;
          line-height: 28px;
          content: attr(data-index);
          color: #ccc;
          font-size: 12px;
        }
        &.warning-row {
          background: var.$system-color-danger;
        }
        .cell {
          .icon-expend {
            position: absolute;
            z-index: 1;
            left: 3px;
            top: -16px;
            opacity: 0;
          }
          .icon-collapse {
            position: absolute;
            z-index: 1;
            right: -11px;
            bottom: -16px;
            opacity: 0;
          }
        }
        &:hover {
          .cell {
            .icon-btn {
              opacity: 1;
            }
          }
        }
      }
      .box-row-actions {
        display: flex;
        align-items: center;
        position: absolute;
        right: 0;
        top: 0;
        height: 36px;
        .icon-edit {
          margin-right: 4px;
        }
        .icon-copyup {
          margin-right: 4px;
        }
        .icon-copydown {
          margin-right: 4px;
        }
        .icon-delete {
        }
      }
    }
  }
  .box-top-confirm {
    display: flex;
    align-items: flex-end;
    margin-bottom: 4px;
    max-height: calc(100vh - 210px);
    overflow-y: auto;
    .col-box {
      display: inline-block;
      position: relative;
      margin-right: 2px;
      width: 36px;
      padding-bottom: 100px;
      .col {
        position: relative;
        // display: inline-flex;
        // justify-content: center;
        // min-height: 400px;
        padding: 24px 4px;
        border: 1px solid var.$border-color;
        user-select: none;
        &:before {
          position: absolute;
          left: 4px;
          top: 0;
          width: 28px;
          content: attr(data-index);
          color: #ccc;
          text-align: center;
          font-size: 12px;
        }
        &.warning-col {
          background: var.$system-color-danger;
        }
        .cell {
          .icon-expend {
            position: absolute;
            z-index: 1;
            left: 3px;
            top: -16px;
            opacity: 0;
          }
          .icon-collapse {
            position: absolute;
            z-index: 1;
            right: -11px;
            bottom: -16px;
            opacity: 0;
          }
        }
        &:hover {
          .cell {
            .icon-btn {
              opacity: 1;
            }
          }
        }
      }
      .box-col-actions {
        display: flex;
        flex-direction: column;
        align-items: center;
        position: absolute;
        left: 0;
        bottom: 0;
        width: 36px;
        .icon-edit {
          margin-bottom: 4px;
        }
        .icon-copyup {
          margin-bottom: 4px;
        }
        .icon-copydown {
          margin-bottom: 4px;
        }
        .icon-delete {
        }
      }
    }
  }
  .wrong {
    color: red;
    font-weight: bold;
  }
  .bottom-actions {
    margin-top: 16px;
  }
}
</style>