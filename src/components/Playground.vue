<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { clipboard } from '@youngbeen/angle-ctrl'
import eventBus from '@/EventBus'
import demoData from '@/demo/demoData'
import { initMap, resolveBlock, resolveEdge, resolveMaxNumber, resolveAllOne, resolveLonelyNumber, resolveMarkedOrCrossed, mnQuantaResolve, getLineSum } from '@/utils/core'
import { addToStorage, clearStorage, getStorageByOffset, saveCopy, getSavedCopy, savePreset, getPreset } from '@/utils/storage'
import FollowMenu from './FollowMenu.vue'
import FollowInput from './FollowInput.vue'
import FollowIndicator from './FollowIndicator.vue'
import FlyTopIndicator from './FlyTopIndicator.vue'
import InputAssist from './InputAssist.vue'
// const debounce = (fn, ms = 0) => {
//   let timeoutId
//   return function (...args) {
//     clearTimeout(timeoutId)
//     timeoutId = setTimeout(() => fn.apply(this, args), ms)
//   }
// }

const debug = ref(false)
let status = ref('init') // init | resolving
const answerMap = reactive({
  data: [
    // ['1|0|<blank>']
  ]
})
let isTopNumbersShow = ref(true)
const isFastMode = ref(true)

// 前置输入准备相关
let leftInputContent = ref('')
let topInputContent = ref('')
let lastInput = reactive({
  content: '',
  llContent: '',
  lllContent: '',
  position: 'left',
  history: []
})
let puz = reactive({
  top: [
    // [1, 2], ...
  ],
  left: []
})
const width = computed(() => {
  return puz.top.length
})
const height = computed(() => {
  return puz.left.length
})
const resolveInfo = computed(() => {
  let resolvedCount = 0
  let totalCount = 0
  answerMap.data.forEach(row => {
    row.forEach(c => {
      totalCount++
      if (c === '1' || c === '0') {
        resolvedCount++
      }
    })
  })
  return {
    resolved: resolvedCount,
    total: totalCount,
    rate: resolvedCount / totalCount
  }
})
const estTime = computed(() => {
  if (resolveInfo.value) {
    const runTimes = 2 ** (resolveInfo.value.total - resolveInfo.value.resolved)
    const mins = runTimes / 100 / 60
    const hours = mins / 60
    const days = hours / 24
    if (days > 300) {
      return '∞'
    } else if (days > 1) {
      return `~${days.toFixed(2)} days`
    } else if (hours > 1) {
      return `~${hours.toFixed(2)} hours`
    } else {
      return `~${mins.toFixed(2)} mins`
    }
  } else {
    return '-'
  }
})
const isElementScrolledOut = (element, topMargin = 0) => {
  const rect = element.getBoundingClientRect()
  const windowHeight = window.innerHeight
  return rect.top >= windowHeight || rect.bottom <= topMargin
}
const checkTopNumberScrollOut = () => {
  const element = document.querySelector('.box-top-indicators')
  if (isElementScrolledOut(element, 200)) {
    isTopNumbersShow.value = false
  } else {
    isTopNumbersShow.value = true
  }
}
onMounted(() => {
  const route = useRoute()
  if (route.query.debug === '1') {
    debug.value = true
  }
  // 恢复用户偏好设置
  const userPreset = getPreset()
  if (userPreset.panelPositionSave) {
    panelPositionSave.left = userPreset.panelPositionSave.left
    panelPositionSave.top = userPreset.panelPositionSave.top
  }
  window.addEventListener('scroll', checkTopNumberScrollOut)
  window.addEventListener('keydown', listenKeyStroke)
})
onUnmounted(() => {
  window.removeEventListener('scroll', checkTopNumberScrollOut)
  window.removeEventListener('keydown', listenKeyStroke)
})
const listenKeyStroke = (event) => {
  const e = event || window.event
  if (e.keyCode === 82 || e.keyCode === 32) {
    // 侦听r按键和空格按键
    if (status.value === 'resolving') {
      standardResolve()
    } else if (e.keyCode === 82) {
      // 输入状态下r键重复上一次输入
      e.preventDefault()
      repeatLastInput()
    }
  }
}
const handleFocusInput = (e, location) => {
  if (status.value !== 'init') {
    return
  }
  eventBus.emit('notifyShowInputAssist', {
    x: e.target.offsetLeft,
    y: e.target.offsetTop + e.target.clientHeight,
    tag: location,
    callback: (content) => {
      // console.log(content)
      if (location === 'left') {
        leftInputContent.value += content
      } else if (location === 'top') {
        topInputContent.value += content
      }
    }
  })
}
const handleBlurInput = (location) => {
  // NOTE 添加延时是为了避免过早销毁里面的事件执行
  setTimeout(() => {
    eventBus.emit('notifyHideInputAssist', location)
  }, 100)
}
const handleInput = (e, location) => {
  // console.log(e.keyCode, location)
  if (e.keyCode === 13) {
    // 侦听输入栏敲击enter
    submit(location)
  } else if (e.ctrlKey) {
    // console.log('ctrl' + e.keyCode)
    e.preventDefault()
    if (e.keyCode >= 48 && e.keyCode <= 57) {
      // 侦听ctrl + 1~0，对应转换为1*1到1*10
      let countContent = e.keyCode - 48
      countContent === 0 && (countContent = '91')
      const simuInputNumber = `1*${countContent}`
      if (location === 'left') {
        leftInputContent.value += simuInputNumber
      } else if (location === 'top') {
        topInputContent.value += simuInputNumber
      }
    }
  } else if (e.altKey) {
    e.preventDefault()
    if (e.keyCode >= 48 && e.keyCode <= 57) {
      // 侦听alt + 1~0，对应转换为1-1到1-0
      const simuInputNumber = `1-${(e.keyCode - 48)}`
      if (location === 'left') {
        leftInputContent.value += simuInputNumber
      } else if (location === 'top') {
        topInputContent.value += simuInputNumber
      }
    }
  }
}
const repeatLastInput = () => {
  if (lastInput.position === 'left') {
    if (leftInputContent.value.replace(/r/, '') === lastInput.content) {
      leftInputContent.value = lastInput.llContent
    } else if (leftInputContent.value.replace(/r/, '') === lastInput.llContent && lastInput.llContent !== '') {
      leftInputContent.value = lastInput.lllContent
    } else {
      leftInputContent.value = lastInput.content
    }
  } else if (lastInput.position === 'top') {
    if (topInputContent.value.replace(/r/, '') === lastInput.content) {
      topInputContent.value = lastInput.llContent
    } else if (topInputContent.value.replace(/r/, '') === lastInput.llContent && lastInput.llContent !== '') {
      topInputContent.value = lastInput.lllContent
    } else {
      topInputContent.value = lastInput.content
    }
  }
}
const submit = (location) => {
  if (location === 'left') {
    leftInputContent.value = leftInputContent.value.replace(/[^\d\s\-*,/]/g, '')
    if (checkInputValid(leftInputContent.value)) {
      // console.log('submit left', leftInputContent.value)
      proceedSubmit(leftInputContent.value, 'left')
      if (leftInputContent.value !== lastInput.content) {
        lastInput.lllContent = lastInput.llContent
        lastInput.llContent = lastInput.content
        lastInput.content = leftInputContent.value
      }
      lastInput.position = 'left'
      // 整理历史数据
      const sameIndex = lastInput.history.indexOf(leftInputContent.value)
      if (sameIndex > -1) {
        lastInput.history.splice(sameIndex, 1)
      } else {
        if (lastInput.history.length >= 10) {
          lastInput.history.pop()
        }
      }
      lastInput.history.unshift(leftInputContent.value)
      leftInputContent.value = ''
    }
  } else if (location === 'top') {
    topInputContent.value = topInputContent.value.replace(/[^\d\s\-*,/]/g, '')
    if (checkInputValid(topInputContent.value)) {
      // console.log('submit top', topInputContent.value)
      proceedSubmit(topInputContent.value, 'top')
      if (topInputContent.value !== lastInput.content) {
        lastInput.lllContent = lastInput.llContent
        lastInput.llContent = lastInput.content
        lastInput.content = topInputContent.value
      }
      lastInput.position = 'top'
      // 整理历史数据
      const sameIndex = lastInput.history.indexOf(topInputContent.value)
      if (sameIndex > -1) {
        lastInput.history.splice(sameIndex, 1)
      } else {
        if (lastInput.history.length >= 10) {
          lastInput.history.pop()
        }
      }
      lastInput.history.unshift(topInputContent.value)
      topInputContent.value = ''
    }
  }
}
const proceedSubmit = (val, location) => {
  const fixedVal = val.replace(/[\s/]/g, ',').replace(/,{2,}/g, ',').replace(/^,/, '').replace(/,$/, '')
  let ary = []
  if (isFastMode.value) {
    ary = fixedVal.split('')
  } else {
    ary = fixedVal.split(',')
  }
  // 处理m-n形式的大数，以及m*n形式的连数
  let fixedAry = []
  let preNum = ''
  for (let i = 0; i < ary.length; i++) {
    const item = ary[i]
    if (item !== '-' && item !== '*') {
      // 数字
      if (!preNum) {
        preNum = item
      } else {
        fixedAry.push(preNum)
        preNum = item
      }
    } else if (item === '-') {
      // 大数
      fixedAry.push(`${preNum}${ary[i + 1]}`)
      preNum = ''
      i++
    } else if (item === '*') {
      // 连数
      for (let j = 0; j < parseInt(ary[i + 1], 10); j++) {
        fixedAry.push(preNum)
      }
      preNum = ''
      i++
    }
  }
  if (preNum) {
    fixedAry.push(preNum)
    preNum = ''
  }
  puz[location].push(fixedAry.map(item => parseInt(item, 10)))
}
const checkInputValid = (val) => {
  // 将所有的特殊分割符替换为,
  // 合并2个及以上的无效分隔符
  // 清除首位和末位的无效分隔符
  val = val.replace(/[\s/]/g, ',').replace(/,{2,}/g, ',').replace(/^,/, '').replace(/,$/, '')
  if (!val) {
    return false
  }
  return true
}
// const handleLoadOcr = () => {
//   const event = document.createEvent('MouseEvents')
//   event.initMouseEvent('click', false, false)
//   document.querySelector('#ocr-file-upload').dispatchEvent(event)
// }
const handleFileChange = (event) => {
  const files = event.target.files
  const postFiles = Array.prototype.slice.call(files)
  if (postFiles.length === 0) {
    return
  }
  // ocrLoad(postFiles[0])
}
// const ocrLoad = async (image) => {
//   const worker = await window.Tesseract.createWorker('eng')
//   const ret = await worker.recognize(image)
//   console.log(ret.data.text)
//   await worker.terminate()
// }
const loadDemo = (mode) => {
  const data = demoData[mode]
  puz.top = data.top
  puz.left = data.left
}
const handleShowDropdownMenu = (location, index, e) => {
  // console.log(location, index, e)
  if (status.value !== 'init') {
    return
  }
  eventBus.emit('notifyShowFollowMenu', {
    x: e.clientX,
    y: e.clientY,
    value: puz[location][index],
    callback: (action) => {
      switch (action) {
        case 'edit':
          editNumber(location, index, e)
          break
        case 'cloneToNext': {
          const toCopy = puz[location][index]
          puz[location].splice(index, 0, toCopy)
          break
        }
        case 'cloneToAdd': {
          const toCopy = puz[location][index]
          puz[location].push(toCopy)
          break
        }
        case 'delete':
          deleteNumber(location, index)
          break
      }
    }
  })
}
const editNumber = (location, index, e) => {
  // console.log(e)
  eventBus.emit('notifyShowFollowInput', {
    x: e.clientX,
    y: e.clientY,
    value: puz[location][index],
    callback: (value) => {
      const fixedVal = value.replace(/[^\d\s,/]/g, '').replace(/[\s/]/g, ',').replace(/,{2,}/g, ',').replace(/^,/, '').replace(/,$/, '')
      const ary = fixedVal.split(',')
      puz[location][index] = ary.map(item => parseInt(item, 10))
    }
  })
}
const deleteNumber = (location, index) => {
  puz[location].splice(index, 1)
}
// 主要逻辑
const answerMapCalc = computed(() => {
  const top = []
  const left = []
  if (answerMap.data.length) {
    for (let i = 0; i < answerMap.data.length; i++) {
      let rowResult = []
      let count = 0
      for (let j = 0; j < answerMap.data[i].length; j++) {
        if (answerMap.data[i][j] === '1') {
          count++
        } else if (count > 0) {
          rowResult.push(count)
          count = 0
        }
      }
      if (count > 0) {
        rowResult.push(count)
        count = 0
      } else if (!rowResult.length) {
        rowResult.push(0)
      }
      left.push(rowResult)
    }
    for (let i = 0; i < answerMap.data[0].length; i++) {
      let colResult = []
      let count = 0
      for (let j = 0; j < answerMap.data.length; j++) {
        if (answerMap.data[j][i] === '1') {
          count++
        } else if (count > 0) {
          colResult.push(count)
          count = 0
        }
      }
      if (count > 0) {
        colResult.push(count)
        count = 0
      } else if (!colResult.length) {
        colResult.push(0)
      }
      top.push(colResult)
    }
  }
  // console.log('answerMapCalc', top, left)
  return {
    top,
    left
  }
})
const startDecode = () => {
  if (!puz.top.length || !puz.left.length) {
    return
  }
  let flag = true
  const wrongPuzLines = []
  puz.top.forEach((t, i) => {
    if (getLineSum(t) > height.value) {
      flag = false
      wrongPuzLines.push(`top${i + 1}`)
    }
  })
  puz.left.forEach((l, i) => {
    if (getLineSum(l) > width.value) {
      flag = false
      wrongPuzLines.push(`left${i + 1}`)
    }
  })
  if (!flag) {
    window.alert(`Some numbers are oversize(${wrongPuzLines.join(',')})`)
    return
  }
  // all top numbers sum must === all left numbers sum, check it
  let topSum = 0
  puz.top.forEach(t => {
    t.forEach(n => {
      topSum += n
    })
  })
  let leftSum = 0
  puz.left.forEach(l => {
    l.forEach(n => {
      leftSum += n
    })
  })
  if (topSum !== leftSum) {
    window.alert('Some numbers are not correct, you should revise it first')
    return
  }
  status.value = 'resolving'
  answerMap.data = initMap(width.value, height.value)
  versionCount.value = 0
  versionOffset.value = 0
  clearStorage()
  panelLeft.value = panelPositionSave.left
  panelTop.value = panelPositionSave.top
  // 自动调用一次基础解析
  standardResolve()
}
const resolveByBlock = (noSave = false) => {
  resolveBlock(puz, answerMap.data).forEach(a => {
    answerMap.data[a.y][a.x] = a.value
  })
  if (!noSave) {
    const res = addToStorage(answerMap.data, versionOffset.value)
    versionCount.value = res.length
    versionOffset.value = 0
  }
}
const resolveByEdge = (noSave = false) => {
  resolveEdge(puz, answerMap.data).forEach(a => {
    answerMap.data[a.y][a.x] = a.value
  })
  if (!noSave) {
    const res = addToStorage(answerMap.data, versionOffset.value)
    versionCount.value = res.length
    versionOffset.value = 0
  }
}
const resolveByMaxNumber = (noSave = false) => {
  resolveMaxNumber(puz, answerMap.data).forEach(a => {
    answerMap.data[a.y][a.x] = a.value
  })
  if (!noSave) {
    const res = addToStorage(answerMap.data, versionOffset.value)
    versionCount.value = res.length
    versionOffset.value = 0
  }
}
const resolveByLonelyNumber = (noSave = false) => {
  resolveLonelyNumber(puz, answerMap.data).forEach(a => {
    answerMap.data[a.y][a.x] = a.value
  })
  if (!noSave) {
    const res = addToStorage(answerMap.data, versionOffset.value)
    versionCount.value = res.length
    versionOffset.value = 0
  }
}
const resolveByMarkedOrCrossed = (noSave = false) => {
  resolveMarkedOrCrossed(puz, answerMap.data).forEach(a => {
    answerMap.data[a.y][a.x] = a.value
  })
  if (!noSave) {
    const res = addToStorage(answerMap.data, versionOffset.value)
    versionCount.value = res.length
    versionOffset.value = 0
  }
}
const resolveByMn = (noSave = false) => {
  const result = mnQuantaResolve(puz, answerMap.data)
  // console.log(result)
  if (result) {
    answerMap.data = result
  }
  if (!noSave) {
    const res = addToStorage(answerMap.data, versionOffset.value)
    versionCount.value = res.length
    versionOffset.value = 0
  }
}
const focusRowIndex = ref(-1)
const focusColIndex = ref(-1)
const focusColPuz = computed(() => {
  if (focusColIndex.value > -1) {
    return puz.top[focusColIndex.value]
  } else {
    return null
  }
})
const comboMode = ref('') // '' - closed, mark|cross
const handleMouseOverCell = (e, rowIndex, colIndex) => {
  if (comboMode.value === 'mark' && answerMap.data[rowIndex][colIndex] !== '1') {
    mark(rowIndex, colIndex)
  } else if (comboMode.value === 'cross' && answerMap.data[rowIndex][colIndex] !== '0') {
    cross(rowIndex, colIndex)
  }
  focusRowIndex.value = rowIndex
  focusColIndex.value = colIndex
  handleGroupNumber(e)
}
const handleMouseOutCell = () => {
  focusRowIndex.value = -1
  focusColIndex.value = -1
  handleGroupNumber()
}
const handleGroupNumber = (e) => {
  // 根据行和列计算连续marked数字信息
  if (focusRowIndex.value > -1 && focusColIndex.value > -1 && answerMap.data[focusRowIndex.value][focusColIndex.value] === '1') {
    // 检查行
    let rowCount = 1 // 当前block算1个
    // 向左检查
    for (let i = focusColIndex.value - 1; i >= 0; i--) {
      const item = answerMap.data[focusRowIndex.value][i]
      if (item === '1') {
        rowCount++
      } else {
        break
      }
    }
    // 向右检查
    for (let i = focusColIndex.value + 1; i < answerMap.data[focusRowIndex.value].length; i++) {
      const item = answerMap.data[focusRowIndex.value][i]
      if (item === '1') {
        rowCount++
      } else {
        break
      }
    }
    // 检查列
    let colCount = 1 // 当前block算1个
    // 向上检查
    for (let i = focusRowIndex.value - 1; i >= 0; i--) {
      const item = answerMap.data[i][focusColIndex.value]
      if (item === '1') {
        colCount++
      } else {
        break
      }
    }
    // 向下检查
    for (let i = focusRowIndex.value + 1; i < answerMap.data.length; i++) {
      const item = answerMap.data[i][focusColIndex.value]
      if (item === '1') {
        colCount++
      } else {
        break
      }
    }
    // console.log('col', colCount, 'row', rowCount, e)
    if (rowCount > 4 || colCount > 4) {
      let contentHorizon = ''
      let contentVertical = ''
      if (rowCount > 4) {
        contentHorizon = `${rowCount}`
      }
      if (colCount > 4) {
        contentVertical = `${colCount}`
      }
      eventBus.emit('notifyShowFollowIndicator', {
        x: e.clientX,
        y: e.clientY,
        content: contentHorizon,
        contentSide: contentVertical
      })
    }
  } else {
    eventBus.emit('notifyHideFollowIndicator')
  }
}
const handleMouseDown = (e, rowIndex, colIndex) => {
  // console.log('mouse down', e)
  if (e.button === 2) {
    // start cross
    cross(rowIndex, colIndex)
    comboMode.value = 'cross'
  } else {
    // start mark
    mark(rowIndex, colIndex)
    comboMode.value = 'mark'
  }
}
const handleMouseUp = () => {
  // console.log('mouse up', e)
  comboMode.value = ''
}
const mark = (rowIndex, colIndex) => {
  const cellValue = answerMap.data[rowIndex][colIndex]
  if (cellValue !== '1') {
    answerMap.data[rowIndex][colIndex] = '1'
  } else {
    answerMap.data[rowIndex][colIndex] = ''
  }
  const res = addToStorage(answerMap.data, versionOffset.value)
  versionCount.value = res.length
  versionOffset.value = 0
}
const cross = (rowIndex, colIndex) => {
  const cellValue = answerMap.data[rowIndex][colIndex]
  if (cellValue !== '0') {
    answerMap.data[rowIndex][colIndex] = '0'
  } else {
    answerMap.data[rowIndex][colIndex] = ''
  }
  const res = addToStorage(answerMap.data, versionOffset.value)
  versionCount.value = res.length
  versionOffset.value = 0
}
const versionCount = ref(0)
const versionOffset = ref(0)
const abortChange = () => {
 if (versionOffset.value > -1 * (versionCount.value - 1)) {
  versionOffset.value--
  const historyData = getStorageByOffset(versionOffset.value)
  answerMap.data = historyData
 }
}
const redoChange = () => {
 if (versionOffset.value < 0) {
  versionOffset.value++
  const historyData = getStorageByOffset(versionOffset.value)
  answerMap.data = historyData
 }
}
const standardResolve = () => {
  const countBeforeResolve = resolveInfo.value.resolved
  resolveByBlock(true)
  resolveByEdge(true)
  resolveByMaxNumber(true)
  resolveByLonelyNumber(true)
  resolveByMarkedOrCrossed(true)
  const res = addToStorage(answerMap.data, versionOffset.value)
  versionCount.value = res.length
  versionOffset.value = 0
  if (resolveInfo.value.resolved > countBeforeResolve) {
    console.log('有新解决的cell，自动重复调用resolve')
    standardResolve()
  }
}
const save = () => {
  // const name = window.prompt('Give a name for your save data...')
  saveCopy({
    puz: {
      top: puz.top,
      left: puz.left
    },
    answerMap: answerMap.data,
    name: 'default'
  })
}
const load = () => {
  const savedData = getSavedCopy()
  if (savedData) {
    answerMap.data = savedData.answerMap
    puz.top = savedData.puz.top
    puz.left = savedData.puz.left
    versionCount.value = 1
    versionOffset.value = 0
  }
}
const getSaveString = () => {
  const savedString = window.localStorage.getItem('userSave')
  if (savedString && clipboard.copy(savedString)) {
    window.alert('Your saved data string was copied')
  }
}
const loadString = () => {
  const stringData = window.prompt('Your saved data string...')
  if (!stringData) {
    return
  }
  const savedData = JSON.parse(stringData)[0]
  if (savedData) {
    status.value = 'resolving'
    answerMap.data = savedData.answerMap
    puz.top = savedData.puz.top
    puz.left = savedData.puz.left
    clearStorage()
    versionCount.value = 1
    versionOffset.value = 0
    panelLeft.value = panelPositionSave.left
    panelTop.value = panelPositionSave.top
  }
}
const restart = () => {
  panelPositionSave.left = panelLeft.value
  panelPositionSave.top = panelTop.value
  savePreset({
    panelPositionSave: {
      left: panelPositionSave.left,
      top: panelPositionSave.top,
    }
  })
  status.value = 'init'
  answerMap.data = []
  puz.top = []
  puz.left = []
  focusRowIndex.value = -1
  focusColIndex.value = -1
  clearStorage()
  versionCount.value = 0
  versionOffset.value = 0
  panelLeft.value = 0
  panelTop.value = 0
}
// 处理拖拽相关
const panelPositionSave = reactive({
  left: 0,
  top: 0
})
const panelLeft = ref(0)
const panelTop = ref(0)
const dragStartX = ref(-1)
const dragStartY = ref(-1)
const handleDragStart = (e) => {
  if (status.value === 'resolving') {
    // console.log('start', e)
    dragStartX.value = e.clientX
    dragStartY.value = e.clientY
  }
  // e.dataTransfer.dropEffect = 'move'
}
const handleDragEnd = (e) => {
  if (status.value === 'resolving') {
    // console.log('end', e)
    if (dragStartX.value > -1 && dragStartY.value > -1) {
      const divX = e.clientX - dragStartX.value
      const divY = e.clientY - dragStartY.value
      panelLeft.value += divX
      panelTop.value += divY
      // console.log(divX, divY)
    }
  }
}
</script>

<template>
  <div class="action-panel"
    :class="[status === 'resolving' && 'right']"
    :style="{
      left: panelLeft + 'px',
      top: panelTop + 'px'
    }"
    draggable="true"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd">
    <div class="init-panel"
      v-show="status === 'init'">
      <input class="number-input" type="text"
        v-model="leftInputContent"
        @keydown="handleInput($event, 'left')"
        @focus="handleFocusInput($event, 'left')"
        @blur="handleBlurInput('left')"
        placeholder="👈left"
        style="margin-right: 1rem;">
      <input class="number-input" type="text"
        v-model="topInputContent"
        @keydown="handleInput($event, 'top')"
        @focus="handleFocusInput($event, 'top')"
        @blur="handleBlurInput('top')"
        placeholder="👇top"
        style="margin-right: 1rem;">
      <span style="display: inline-flex; align-items: center; margin-right: 1rem;">
        <input type="checkbox" v-model="isFastMode" id="fast-mode">
        <label for="fast-mode" style="font-size: 13px;">Fast mode</label>
      </span>
      <div class="box-tip" style="display: inline-block;"
        v-show="status === 'init'">
        <div class="cs-tip">
          <div class="tip" v-show="!isFastMode">Valid format is like 3 3 1 or 3,3,1 or 3/3/1. Hit "enter" to confirm</div>
          <div class="tip" v-show="isFastMode">Valid format is like 331(stands for 3,3,1), 1-4(stands for 14), 1*3(stands for 1,1,1), type alt+1~0 stands for 1-1~1-0, type ctrl+1~0 stands for 1*1~1*91</div>
        </div>
      </div>
    </div>
    <!-- buttons -->
    <p class="action-seg" v-show="status === 'init'">
      <button @click="startDecode">Decode</button>
    </p>
    <p class="action-seg" v-show="status === 'init'">
      <button @click="repeatLastInput()">Repeat Last Input(R)</button>
      <!-- <button @click="handleLoadOcr()">OCR (Experimental)</button> -->
      <input id="ocr-file-upload" type="file" name="image" accept=".jpg,.png,.jpeg,.bmp" @change="handleFileChange" style="display: none;" />
      <button @click="loadString">Load From String Save</button>
      <button @click="loadDemo('easy')">Load Easy Demo</button>
      <button @click="loadDemo('hard')">Load Hard Demo</button>
    </p>
    <p class="action-seg" v-show="status === 'resolving'">
      <button v-show="debug" @click="standardResolve">Resolve(R / blank space)</button>
      <button v-show="debug" @click="resolveByBlock">Resolve By Blocks</button>
      <button v-show="debug" @click="resolveByEdge">Resolve By Edge</button>
      <button v-show="debug" @click="resolveByMaxNumber">Resolve By Max Number</button>
      <button v-show="debug" @click="resolveByLonelyNumber">Resolve By Lonely Number</button>
      <button v-show="debug" @click="resolveByMarkedOrCrossed">Resolve By Marked/Crossed</button>
      <button v-show="debug" @click="resolveByMn">m**n Resolve({{ estTime }})</button>
    </p>
    <p class="action-seg" v-show="status === 'resolving'">
      <button v-show="versionOffset > -1 * (versionCount - 1)"
        @click="abortChange">Revert</button>
      {{ versionCount + versionOffset }} / {{ versionCount }}
      <button v-show="versionOffset < 0"
        @click="redoChange">Redo</button>
    </p>
    <p class="action-seg" v-show="status === 'resolving'">
      <button @click="save">Save</button>
      <button @click="load">Load</button>
      <button @click="getSaveString">Get Save String</button>
      <button @click="restart">Restart</button>
    </p>
    <div class="box-tip">
      <div class="cs-tip">
        <div class="tip">Size {{ width }} x {{ height }}</div>
        <div class="tip"
          v-show="status === 'resolving'">Resolved {{ resolveInfo.resolved }}/{{ resolveInfo.total }} ({{ resolveInfo.rate.toFixed(2) }})</div>
        <div class="tip"
          v-show="status === 'resolving'">Left click to mark, right click to cross</div>
      </div>
    </div>
  </div>

  <div class="box-main"
    :class="[status === 'resolving' && 'free']"
    @mouseup="handleMouseUp">
    <div class="box-top-indicators">
      <div class="box-top-indi"
        :class="[focusColIndex === index && 'focus', answerMapCalc.top.length && t.length < answerMapCalc.top[index].length && 'danger']"
        v-for="(t, index) in puz.top" :key="index"
        @dblclick.prevent="status === 'init' && editNumber('top', index, $event)"
        @click.right.prevent="handleShowDropdownMenu('top', index, $event)">
        <svg class="icon-btn icon-more"
          v-show="status === 'init'"
          @click="handleShowDropdownMenu('top', index, $event)"
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C10.9 3 10 3.9 10 5C10 6.1 10.9 7 12 7C13.1 7 14 6.1 14 5C14 3.9 13.1 3 12 3ZM12 17C10.9 17 10 17.9 10 19C10 20.1 10.9 21 12 21C13.1 21 14 20.1 14 19C14 17.9 13.1 17 12 17ZM12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10Z"></path></svg>
        <div class="cell"
          :class="[answerMapCalc.top.length && n !== answerMapCalc.top[index][nindex] && 'danger']"
          v-for="(n, nindex) in t" :key="nindex">
          {{ n }}
        </div>
      </div>
    </div>
    <div style="position: relative; top: 2px;">
      <div class="box-left-indicators">
        <div class="box-left-indi"
          :class="[focusRowIndex === index && 'focus', answerMapCalc.left.length && l.length < answerMapCalc.left[index].length && 'danger']"
          v-for="(l, index) in puz.left" :key="index"
          @dblclick.prevent="status === 'init' && editNumber('left', index, $event)"
          @click.right.prevent="handleShowDropdownMenu('left', index, $event)">
          <svg class="icon-btn icon-more"
            v-show="status === 'init'"
            @click="handleShowDropdownMenu('left', index, $event)"
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5 10C3.9 10 3 10.9 3 12C3 13.1 3.9 14 5 14C6.1 14 7 13.1 7 12C7 10.9 6.1 10 5 10ZM19 10C17.9 10 17 10.9 17 12C17 13.1 17.9 14 19 14C20.1 14 21 13.1 21 12C21 10.9 20.1 10 19 10ZM12 10C10.9 10 10 10.9 10 12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12C14 10.9 13.1 10 12 10Z"></path></svg>
          <div class="cell"
            :class="[answerMapCalc.left.length && n !== answerMapCalc.left[index][nindex] && 'danger']"
            v-for="(n, nindex) in l" :key="nindex">
            {{ n }}
          </div>
        </div>
      </div>
      <div class="box-canvas"
        v-show="status === 'resolving'">
        <div class="row"
          v-for="(r, index) in answerMap.data" :key="index">
          <div class="row-box">
            <div class="clk-cell"
              :class="['style-' + c]"
              v-for="(c, ci) in r" :key="ci"
              @mouseover="handleMouseOverCell($event, index, ci)"
              @mouseout="handleMouseOutCell()"
              @mousedown="handleMouseDown($event, index, ci)"
              >&nbsp;</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <follow-menu></follow-menu>

  <follow-input></follow-input>

  <follow-indicator></follow-indicator>

  <fly-top-indicator
    :is-show="!isTopNumbersShow && focusColPuz"
    :index="focusColIndex"
    :is-danger="answerMapCalc.top && answerMapCalc.top.length && focusColPuz && focusColPuz.length < answerMapCalc.top[focusColIndex].length"
    :answer-map-calc="answerMapCalc"
    :data="focusColPuz"></fly-top-indicator>

  <input-assist
    :menu="lastInput.history"></input-assist>
</template>

<style scoped>
.action-panel {
  position: fixed;
  z-index: 9;
  /* left: 0;
  top: 0; */
  /* right: 0; */
  width: 100%;
  height: 200px;
  padding: 16px 32px;
  background: #fff;
  border: 2px solid rgb(170, 190, 255);
}
.action-panel.right {
  /* left: auto;
  top: 0;
  right: 0; */
  width: 240px;
  height: auto;
}
.action-seg {
  padding: 6px 0;
  border-bottom: 1px solid rgb(237, 237, 237);
}
.box-main {
  margin-top: 200px;
}
.box-main.free {
  margin-top: auto;
}
.number-input {
  min-width: 400px;
  height: 30px;
  line-height: 30px;
}
button:not(:last-of-type) {
  margin-right: 1rem;
}
.box-top-indicators {
  margin-left: 262px;
  user-select: none;
}
.box-top-indi {
  position: relative;
  display: inline-block;
  margin-right: 2px;
  width:26px;
  height: auto;
  color: #888;
  background: rgb(250, 250, 250);
  transition: all 0.3s;
}
.box-top-indi.focus {
  color: #333;
  background: rgb(170, 190, 255);
}
.box-top-indi.danger {
  color: #333;
  background: rgba(255, 215, 215, 1);
}
.box-top-indi:hover > .icon-btn {
  opacity: 1;
}
.box-left-indicators {
  position: absolute;
  left: 0;
  top: 0;
  width: 260px;
  user-select: none;
}
.box-left-indi {
  position: relative;
  /* display: inline-block; */
  margin-bottom: 2px;
  width: auto;
  height: 26px;
  color: #888;
  background: rgb(250, 250, 250);
  text-align: right;
  transition: all 0.3s;
}
.box-left-indi.focus {
  color: #333;
  background: rgb(170, 190, 255);
}
.box-left-indi.danger {
  color: #333;
  background: rgba(255, 215, 215, 1);
}
.box-left-indi:hover > .icon-btn {
  opacity: 1;
}
.cell {
  width: 26px;
  height: 26px;
  line-height: 26px;
  text-align: center;
}
.cell.danger {
  color: red;
  /* border: 1px dashed red; */
  /* border-radius: 50%; */
  text-decoration: underline;
  font-weight: bold;
}
.box-left-indi > .cell {
  display: inline-block;
}
.icon-btn {
  width: 20px;
  height: 20px;
  padding: 2px;
  background: rgb(170, 190, 255);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}
/* .icon-btn.danger {
  background: rgb(255, 124, 124);
} */
.icon-more {
  position: absolute;
  z-index: 2;
  left: 5px;
  top: -16px;
  box-shadow: 1px 1px 2px rgba(115, 155, 155, 0.8);
  opacity: 0;
}
/* .icon-delete {
  position: absolute;
  z-index: 2;
  left: 5px;
  bottom: -16px;
  box-shadow: 1px 1px 2px rgba(115, 155, 155, 0.8);
  opacity: 0;
} */
/* .box-left-indi > .icon-edit {
  left: auto;
  right: -16px;
  top: 5px;
} */
.box-left-indi > .icon-more {
  left: -16px;
  top: 5px;
}
.box-canvas {
  margin-left: 262px;
  /* background: red; */
}
.row {
  margin-bottom: 2px;
}
.row-box {
  display: inline-block;
}
.row:nth-of-type(5n) > .row-box {
  position: relative;
  /* top: 2px; */
  /* border-bottom: 1px solid rgb(255, 176, 176); */
  /* border-bottom: 1px solid red; */
}
.row:nth-of-type(5n) > .row-box:after {
  content: "";
  position: absolute;
  width: 100%;
  height: 2px;
  bottom: -2px;
  left: 0;
  background: #999;
}
.clk-cell {
  position: relative;
  display: inline-block;
  margin-right: 2px;
  width: 26px;
  height: 26px;
  background: rgb(255, 176, 176);
  user-select: none;
}
.clk-cell:nth-of-type(5n) {
  position: relative;
}
.clk-cell:nth-of-type(5n):after {
  content: "";
  position: absolute;
  width: 2px;
  height: 100%;
  right: -2px;
  top: 0;
  background: #999;
}
.clk-cell.style-1 {
  background: rgb(52, 52, 186);
  /* box-shadow: -2px -2px 5px #fff, 2px 2px 5px #babecc; */
}
.clk-cell.style-0 {
  background: rgb(235, 235, 235);
  box-shadow: inset 1px 1px 2px #babecc, inset -1px -1px 2px #fff;
}
.clk-cell.style-0:before {
  content: "×";
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  line-height: 24px;
  color: rgb(185, 185, 185);
  font-size: 28px;
  text-align: center;
}
</style>