<script setup>
import { ref, onMounted, onBeforeUnmount, reactive } from 'vue'
import { createWorker } from 'tesseract.js'
import eventBus from '@/EventBus'
import { optimizeImage } from '@/utils/image'
import { getLineSum } from '@/utils/core'
import ArrowLeftRight from '@/assets/icons/ArrowLeftRight.vue'
import ExpendHorizontalSplit from '@/assets/icons/ExpendHorizontalSplit.vue'
import CollapseHorizontal from '@/assets/icons/CollapseHorizontal.vue'
import Pen from '@/assets/icons/Pen.vue'
import ArrowUpBox from '@/assets/icons/ArrowUpBox.vue'
import ArrowDownBox from '@/assets/icons/ArrowDownBox.vue'
import TrashBin from '@/assets/icons/TrashBin.vue'
import ArrowLeftBox from '@/assets/icons/ArrowLeftBox.vue'
import ArrowRightBox from '@/assets/icons/ArrowRightBox.vue'

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

const handleFileChange = async (event, location) => {
  const files = event.target.files
  const postFiles = Array.prototype.slice.call(files)
  if (postFiles.length === 0) {
    return
  }
  try {
    const image1 = await readFileUrl(postFiles[0])
    let image2 = null
    if (postFiles.length > 1) {
        image2 = await readFileUrl(postFiles[1])
      }
    if (location === 'left') {
      leftFile.value = image1
      image2 && (topFile.value = image2)
    } else {
      topFile.value = image1
      image2 && (leftFile.value = image2)
    }
  } catch (error) {
    console.error(error)
  }
}

const exchangeFile = () => {
  [leftFile.value, topFile.value] = [topFile.value, leftFile.value]
}

const readFileUrl = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      resolve(e.target.result)
    }
    reader.readAsDataURL(file)
  })
}

const ocrLoad = (image, location) => {
  // 创建Image对象
  const newImage = new Image()
  newImage.src = image
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
        afterOcr(rets, image, choppedImages, location)
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
      afterOcr(ret.data.text, image, fixedImage, location)
      await worker.terminate()
    }
  }
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
      <p class="cs-button-group">
        <span class="shadow"></span>
        <span class="edge"></span>
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
          <input id="ocr-file-upload-left" type="file" name="image"
            accept=".jpg,.png,.jpeg,.bmp"
            multiple
            @change="handleFileChange($event, 'left')" />
        </label>
        <label>
          top
          <input id="ocr-file-upload-top" type="file" name="image"
            accept=".jpg,.png,.jpeg,.bmp"
            multiple
            @change="handleFileChange($event, 'top')" />
        </label>
        <canvas id="ocr-canvas-left" style="display: none;"></canvas>
        <canvas id="ocr-canvas-top" style="display: none;"></canvas>
      </p>
      <p style="display: flex; justify-content: space-between; align-items: center;">
        <div class="file-preview">
          <img v-show="leftFile" :src="leftFile" alt="">
        </div>
        <button class="cs-button btn-exchange"
          v-show="leftFile && topFile"
          @click="exchangeFile">
          <span class="shadow"></span>
          <span class="edge"></span>
          <span class="front text">
            <arrow-left-right class="cs-icon"></arrow-left-right>&nbsp;Exchange
          </span>
        </button>
        <div class="file-preview">
          <img v-show="topFile" :src="topFile" alt="">
        </div>
      </p>
      <hr style="margin: 16px 0;">
    </div>

    <!-- 展示并确认OCR结果 -->
    <div v-show="step === 'confirm'">
      <p class="cs-tabs">
        <label>
          <input type="radio" name="radio" value="left" v-model="tab">
          <span>Left</span>
        </label>
        <label>
          <input type="radio" name="radio" value="top" v-model="tab">
          <span>Top</span>
        </label>
      </p>
      <!-- 左侧配置 -->
      <div style="display: flex;">
        <div class="left-preview-image">
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
                <ExpendHorizontalSplit class="icon-btn icon-expend"
                  v-if="c.length > 1"
                  @click.stop="handleExpend(ri, ci)"
                />
                {{ c }}
                <CollapseHorizontal class="icon-btn icon-collapse"
                  v-if="ci < r.length - 1"
                  @click.stop="handleCollapse(ri, ci)"
                />
              </div>
            </div>
            <div class="box-row-actions">
              <Pen class="icon-btn icon-edit"
                @click.stop="handleEdit(ri, 'left', $event)"
              />
              <ArrowUpBox class="icon-btn icon-copyup"
                @click="handleNew(ri, 'left', 0)"
              />
              <ArrowDownBox class="icon-btn icon-copydown"
                @click="handleNew(ri, 'left', 1)"
              />
              <TrashBin class="icon-btn icon-delete"
                @click="handleDelete(ri, 'left')"
              />
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
              <Pen class="icon-btn icon-edit"
                @click.stop="handleEdit(ri, 'top', $event)"
              />
              <ArrowLeftBox class="icon-btn icon-copyup"
                @click="handleNew(ri, 'top', 0)"
              />
              <ArrowRightBox class="icon-btn icon-copydown"
                @click="handleNew(ri, 'top', 1)"
              />
              <TrashBin class="icon-btn icon-delete"
                @click="handleDelete(ri, 'top')"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="cs-tip">
      <div class="tip">Size <span :class="[width && ocrTopResult.result.length !== width && 'wrong']">{{ width || '?' }}</span> x <span :class="[height && ocrLeftResult.result.length !== height && 'wrong']">{{ height || '?' }}</span></div>
    </div>
    <div class="bottom-actions">
      <button class="cs-button primary"
        @click="confirm"
        style="margin-right: 8px;">
        <span class="shadow"></span>
        <span class="edge"></span>
        <span class="front text">
          Confirm
        </span>
      </button>
      <button class="cs-button"
        @click="close">
        <span class="shadow"></span>
        <span class="edge"></span>
        <span class="front text">
          Cancel
        </span>
      </button>
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
  .file-preview {
    width: 100px;
    height: 100px;
    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }
  .btn-exchange {
    height: 32px;
  }
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
  .cs-tabs {
    margin-bottom: 8px;
  }
  .left-preview-image {
    margin-right: 8px;
    max-height: min(788px, calc(100vh - 210px));
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