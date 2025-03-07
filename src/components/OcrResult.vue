<script setup>
import { ref, onMounted, onBeforeUnmount, reactive, computed } from 'vue'
import eventBus from '@/EventBus'

const props = defineProps({
  location: {
    type: String,
    required: true
  },
  width: {
    type: Number,
    required: false,
    default: 0
  },
  height: {
    type: Number,
    required: false,
    default: 0
  }
})

const isShow = ref(false)
const ocrResult = reactive({
  result: [],
  originalImage: null,
  fixedImage: null
})
const possibleMaxSize = computed(() => {
  return Math.max(ocrResult.result.length, props.width, props.height)
})

onMounted(() => {
  eventBus.on('notifyShowOcrResult', ({ result, originalImage, fixedImage }) => {
    ocrResult.result = result
    ocrResult.originalImage = originalImage
    ocrResult.fixedImage = fixedImage
    isShow.value = true
  })
})

onBeforeUnmount(() => {
  eventBus.off('notifyShowOcrResult')
})

const handleCollapse = (rowIndex, cellIndex) => {
  // 将指定的格子和右侧格子数字合并
  const row = ocrResult.result[rowIndex]
  const rightNumber = row[cellIndex + 1]
  row.splice(cellIndex + 1, 1)
  row[cellIndex] = `${row[cellIndex].toString()}${rightNumber.toString()}`
}
const handleExpend = (rowIndex, cellIndex) => {
  // 将指定的格子数字全部拆分为单独数字
  const row = ocrResult.result[rowIndex]
  const expendNumbers = row[cellIndex].toString().split('')
  row.splice(cellIndex, 1, ...expendNumbers)
}
const handleEdit = (rowIndex, e) => {
  const row = ocrResult.result[rowIndex]
  eventBus.emit('notifyShowFollowInput', {
    x: e.clientX,
    y: e.clientY,
    value: row,
    callback: (value) => {
      const fixedVal = value.replace(/[^\d\s,/]/g, '').replace(/[\s/]/g, ',').replace(/,{2,}/g, ',').replace(/^,/, '').replace(/,$/, '')
      const ary = fixedVal.split(',')
      ocrResult.result.splice(rowIndex, 1, ary)
    }
  })
}
const handleNew = (rowIndex, div) => {
  ocrResult.result.splice(rowIndex + div, 0, ['1'])
}
const handleDelete = (rowIndex) => {
  ocrResult.result.splice(rowIndex, 1)
}
const confirm = () => {
  eventBus.emit('confirmOcrResult', {
    result: ocrResult.result,
    location: props.location
  })
  close()
}
const close = () => {
  ocrResult.result = []
  ocrResult.originalImage = null
  ocrResult.fixedImage = null
  isShow.value = false
}
</script>

<template>
  <div class="box-ocr-result"
    v-show="isShow">
    <div class="cs-pop-title">Confirm OCR Result</div>
    <div style="display: flex;">
      <div style="margin-right: 8px;">
        <img class="ocr-image" v-if="ocrResult.originalImage" :src="ocrResult.originalImage" alt="">
      </div>
      <div class="box-left-confirm"
        v-if="location === 'left'">
        <div class="row-box"
          v-for="(r, ri) in ocrResult.result" :key="ri">
          <div class="row"
            :data-index="ri + 1"
            @dblclick="handleEdit(ri, $event)">
            <div class="cell"
              :class="[parseInt(c) > possibleMaxSize && 'warning-cell']"
              v-for="(c, ci) in r" :key="ci">
              <svg class="icon-btn icon-expend" v-if="c.length > 1" @click="handleExpend(ri, ci)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7.44975 7.05029L2.5 12L7.44727 16.9473L8.86148 15.5331L6.32843 13H17.6708L15.1358 15.535L16.55 16.9493L21.5 11.9996L16.5503 7.0498L15.136 8.46402L17.6721 11H6.32843L8.86396 8.46451L7.44975 7.05029Z"></path></svg>
              {{ c }}
              <svg class="icon-btn icon-collapse" v-if="ci < r.length - 1" @click="handleCollapse(ri, ci)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 12 18.4497 7.05029 19.864 8.46451 17.3284 11H23V13H17.3284L19.8615 15.5331 18.4473 16.9473 13.5 12ZM1 13H6.67084L4.13584 15.535 5.55005 16.9493 10.5 11.9996 5.55025 7.0498 4.13604 8.46402 6.67206 11H1V13Z"></path></svg>
            </div>
          </div>
          <div class="box-row-actions">
            <svg class="icon-btn icon-edit" @click="handleEdit(ri, $event)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.7279 9.57627L14.3137 8.16206L5 17.4758V18.89H6.41421L15.7279 9.57627ZM17.1421 8.16206L18.5563 6.74785L17.1421 5.33363L15.7279 6.74785L17.1421 8.16206ZM7.24264 20.89H3V16.6473L16.435 3.21231C16.8256 2.82179 17.4587 2.82179 17.8492 3.21231L20.6777 6.04074C21.0682 6.43126 21.0682 7.06443 20.6777 7.45495L7.24264 20.89Z"></path></svg>
            <svg class="icon-btn icon-copyup" @click="handleNew(ri, 0)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3H4C3.44772 3 3 3.44772 3 4V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V4C21 3.44772 20.5523 3 20 3ZM5 19V5H19V19H5ZM12 6.34311L6.34315 12L7.75736 13.4142L11 10.1715V17.6568H13V10.1715L16.2426 13.4142L17.6569 12L12 6.34311Z"></path></svg>
            <svg class="icon-btn icon-copydown" @click="handleNew(ri, 1)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3H4C3.44772 3 3 3.44772 3 4V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V4C21 3.44772 20.5523 3 20 3ZM5 19V5H19V19H5ZM11.0005 6.34375V13.829L7.75789 10.5864L6.34367 12.0006L12.0005 17.6575L17.6574 12.0006L16.2432 10.5864L13.0005 13.829V6.34375H11.0005Z"></path></svg>
            <svg class="icon-btn icon-delete" @click="handleDelete(ri)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM13.4142 13.9997L15.182 15.7675L13.7678 17.1817L12 15.4139L10.2322 17.1817L8.81802 15.7675L10.5858 13.9997L8.81802 12.232L10.2322 10.8178L12 12.5855L13.7678 10.8178L15.182 12.232L13.4142 13.9997ZM9 4V6H15V4H9Z"></path></svg>
          </div>
        </div>
      </div>
      <div class="box-top-confirm"
        v-if="location === 'top'">
        <div class="col-box"
          v-for="(r, ri) in ocrResult.result" :key="ri">
          <div class="col"
            :data-index="ri + 1"
            @dblclick="handleEdit(ri, $event)">
            <div class="cell"
              :class="[parseInt(c) > possibleMaxSize && 'warning-cell']"
              v-for="(c, ci) in r" :key="ci">
              <!-- <svg class="icon-btn icon-expend" v-if="c.length > 1" @click="handleExpend(ri, ci)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7.44975 7.05029L2.5 12L7.44727 16.9473L8.86148 15.5331L6.32843 13H17.6708L15.1358 15.535L16.55 16.9493L21.5 11.9996L16.5503 7.0498L15.136 8.46402L17.6721 11H6.32843L8.86396 8.46451L7.44975 7.05029Z"></path></svg> -->
              {{ c }}
              <!-- <svg class="icon-btn icon-collapse" v-if="ci < r.length - 1" @click="handleCollapse(ri, ci)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 12 18.4497 7.05029 19.864 8.46451 17.3284 11H23V13H17.3284L19.8615 15.5331 18.4473 16.9473 13.5 12ZM1 13H6.67084L4.13584 15.535 5.55005 16.9493 10.5 11.9996 5.55025 7.0498 4.13604 8.46402 6.67206 11H1V13Z"></path></svg> -->
            </div>
          </div>
          <div class="box-col-actions">
            <svg class="icon-btn icon-edit" @click="handleEdit(ri, $event)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.7279 9.57627L14.3137 8.16206L5 17.4758V18.89H6.41421L15.7279 9.57627ZM17.1421 8.16206L18.5563 6.74785L17.1421 5.33363L15.7279 6.74785L17.1421 8.16206ZM7.24264 20.89H3V16.6473L16.435 3.21231C16.8256 2.82179 17.4587 2.82179 17.8492 3.21231L20.6777 6.04074C21.0682 6.43126 21.0682 7.06443 20.6777 7.45495L7.24264 20.89Z"></path></svg>
            <svg class="icon-btn icon-copyup" @click="handleNew(ri, 0)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3H4C3.44772 3 3 3.44772 3 4V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V4C21 3.44772 20.5523 3 20 3ZM5 19V5H19V19H5ZM6.3436 12.001L12.0005 6.34412L13.4147 7.75834L10.172 11.001H17.6573V13.001H10.172L13.4147 16.2436L12.0005 17.6578L6.3436 12.001Z"></path></svg>
            <svg class="icon-btn icon-copydown" @click="handleNew(ri, 1)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3H4C3.44772 3 3 3.44772 3 4V20C3 20.5523 3.44772 21 4 21H20C20.5523 21 21 20.5523 21 20V4C21 3.44772 20.5523 3 20 3ZM5 19V5H19V19H5ZM17.6569 12L12 17.6568L10.5858 16.2426L13.8284 13H6.34315V11L13.8284 11L10.5858 7.75732L12 6.34311L17.6569 12Z"></path></svg>
            <svg class="icon-btn icon-delete" @click="handleDelete(ri)" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM13.4142 13.9997L15.182 15.7675L13.7678 17.1817L12 15.4139L10.2322 17.1817L8.81802 15.7675L10.5858 13.9997L8.81802 12.232L10.2322 10.8178L12 12.5855L13.7678 10.8178L15.182 12.232L13.4142 13.9997ZM9 4V6H15V4H9Z"></path></svg>
          </div>
        </div>
      </div>
    </div>
    <div class="cs-tip">
      <div class="tip">Size {{ location === 'top' ? ocrResult.result.length || '?' : width || '?' }} x {{ location === 'top' ? height || '?' : ocrResult.result.length || '?' }}</div>
    </div>
    <div class="bottom-actions">
      <button @click="confirm()" style="margin-right: 4px;">Put to {{ location }}</button>
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
  .ocr-image {
    max-width: 400px;
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
  .box-left-confirm {
    margin-bottom: 4px;
    max-height: calc(100vh - 150px);
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
    max-height: calc(100vh - 150px);
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
  .bottom-actions {
    margin-top: 16px;
  }
}
</style>