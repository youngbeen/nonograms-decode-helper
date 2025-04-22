<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import confetti from 'canvas-confetti'
import { clipboard } from '@youngbeen/angle-ctrl'
import eventBus from '@/EventBus'
import demoData from '@/demo/demoData'
import { initMap, resolveBlock, resolveEdge, resolveMaxNumber, resolveSideExactMarkedPiece, resolveSmallSideSpace, resolveSmallSpace, resolveAdjacentBlocks, resolveLonelyNumber, resolveMarkedOrCrossed, mnQuantaResolve, checkAnswerSheet, getLineSum, compareHumanAndAi } from '@/utils/core'
import { aiSolve } from '@/utils/ai'
import { addToStorage, clearStorage, getStorageByOffset, saveCopy, getSavedCopy, savePreset, getPreset, addToShowBox } from '@/utils/storage'
// import { startRecording } from '@/utils/speechRecognition'
import FollowMenu from './FollowMenu.vue'
import FollowInput from './FollowInput.vue'
import FollowNumberInput from './FollowNumberInput.vue'
import FollowIndicator from './FollowIndicator.vue'
import FlyTopIndicator from './FlyTopIndicator.vue'
import InputAssist from './InputAssist.vue'
import AiLegend from './AiLegend.vue'
import OcrResult from './OcrResult.vue'
import ShowBox from './ShowBox.vue'
import DotsMore from '@/assets/icons/DotsMore.vue'
import SaveIcon from '@/assets/icons/Save.vue'
import RestartIcon from '@/assets/icons/Restart.vue'
import ArrowGoBack from '@/assets/icons/ArrowGoBack.vue'
import ArrowGoForward from '@/assets/icons/ArrowGoForward.vue'
import CharacterRecognitionIcon from '@/assets/icons/CharacterRecognition.vue'
import LightBulbFlash from '@/assets/icons/LightBulbFlash.vue'
import PlayIcon from '@/assets/icons/Play.vue'
// const debounce = (fn, ms = 0) => {
//   let timeoutId
//   return function (...args) {
//     clearTimeout(timeoutId)
//     timeoutId = setTimeout(() => fn.apply(this, args), ms)
//   }
// }

const debug = ref(false)
const theme = ref('')
const loading = ref(false) // 是否正在推理中
let status = ref('init') // init | resolving
const answerMap = reactive({
  data: [
    // ['1|0|<blank>']
  ],
  aiPros: [ // AI推理出的新结果，提示观测用
    // {
    //   rowIndex: 0, // 即y
    //   colIndex: 0, // 即x
    //   aiValue: '1'
    // }
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
  if (userPreset.theme) {
    theme.value = userPreset.theme
  } else {
    theme.value = ''
  }
  if (userPreset.panelPositionSave) {
    panelPositionSave.left = userPreset.panelPositionSave.left
    panelPositionSave.top = userPreset.panelPositionSave.top
  }
  eventBus.on('confirmOcrResult', (data) => {
    // 将数据转换为数字格式
    data.leftResult = data.leftResult.map(row => {
      return row.map(c => parseInt(c, 10))
    })
    data.topResult = data.topResult.map(row => {
      return row.map(c => parseInt(c, 10))
    })
    puz.left = data.leftResult
    puz.top = data.topResult
  })
  window.addEventListener('scroll', checkTopNumberScrollOut)
  window.addEventListener('keydown', listenKeyStroke)
})
onUnmounted(() => {
  eventBus.off('confirmOcrResult')
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
  // if (status.value === 'resolving') {
  //   if (e.keyCode === 65) {
  //     // 侦听a按键
  //     acceptAiResolve()
  //   }
  // }
}
// const handleFocusInput = (e, location) => {
//   if (status.value !== 'init') {
//     return
//   }
//   eventBus.emit('notifyShowInputAssist', {
//     x: e.target.offsetLeft,
//     y: e.target.offsetTop + e.target.clientHeight,
//     tag: location,
//     callback: (content) => {
//       // console.log(content)
//       if (location === 'left') {
//         leftInputContent.value += content
//       } else if (location === 'top') {
//         topInputContent.value += content
//       }
//     }
//   })
// }
// const handleBlurInput = (location) => {
//   // NOTE 添加延时是为了避免过早销毁里面的事件执行
//   setTimeout(() => {
//     eventBus.emit('notifyHideInputAssist', location)
//   }, 100)
// }
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
// const handleLoadSpeech = () => {
//   startRecording()
// }
const handleLoadOcr = () => {
  eventBus.emit('ocrInput')
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
    window.alert(`Numbers are oversize(${wrongPuzLines.join(',')})`)
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
    window.alert(`Numbers sum is not correct(left${leftSum}, top${topSum})`)
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
const resolveBySideExactMarkedPiece = (noSave = false) => {
  resolveSideExactMarkedPiece(puz, answerMap.data).forEach(a => {
    answerMap.data[a.y][a.x] = a.value
  })
  if (!noSave) {
    const res = addToStorage(answerMap.data, versionOffset.value)
    versionCount.value = res.length
    versionOffset.value = 0
  }
}
// const resolveBySplitMarkedPieces = (noSave = false) => {
//   resolveSplitMarkedPieces(puz, answerMap.data).forEach(a => {
//     answerMap.data[a.y][a.x] = a.value
//   })
//   if (!noSave) {
//     const res = addToStorage(answerMap.data, versionOffset.value)
//     versionCount.value = res.length
//     versionOffset.value = 0
//   }
// }
const resolveBySmallSideSpace = (noSave = false) => {
  resolveSmallSideSpace(puz, answerMap.data).forEach(a => {
    answerMap.data[a.y][a.x] = a.value
  })
  if (!noSave) {
    const res = addToStorage(answerMap.data, versionOffset.value)
    versionCount.value = res.length
    versionOffset.value = 0
  }
}
const resolveBySmallSpace = (noSave = false) => {
  resolveSmallSpace(puz, answerMap.data).forEach(a => {
    answerMap.data[a.y][a.x] = a.value
  })
  if (!noSave) {
    const res = addToStorage(answerMap.data, versionOffset.value)
    versionCount.value = res.length
    versionOffset.value = 0
  }
}
const resolveByAdjacentBlocks = (noSave = false) => {
  resolveAdjacentBlocks(puz, answerMap.data).forEach(a => {
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
  if (loading.value) {
    return
  }
  // 推理开始
  loading.value = true
  const countBeforeResolve = resolveInfo.value.resolved
  // 先使用AI单独尝试推理
  const aiResult = aiSolve(puz, answerMap.data)
  resolveByBlock(true)
  resolveByEdge(true)
  resolveByMaxNumber(true)
  resolveBySideExactMarkedPiece(true)
  // resolveBySplitMarkedPieces(true)
  resolveBySmallSideSpace(true)
  resolveBySmallSpace(true)
  resolveByAdjacentBlocks(true)
  resolveByLonelyNumber(true)
  resolveByMarkedOrCrossed(true)
  const isAnswerCorrect = checkAnswerSheet(puz, answerMap.data)
  const compareResult = compareHumanAndAi(answerMap.data, aiResult)
  console.log('人工推理 vs AI推理结果', compareResult)
  if (compareResult && compareResult.aiPros) {
    answerMap.aiPros = compareResult.aiPros
  } else {
    answerMap.aiPros = []
  }
  if (answerMap.aiPros.length) {
    acceptAiResolve()
  }
  const res = addToStorage(answerMap.data, versionOffset.value)
  versionCount.value = res.length
  versionOffset.value = 0
  loading.value = false
  // 推理结束
  if (isAnswerCorrect) {
    fireworks()
    addToShowBox({
      puz: {
        top: puz.top,
        left: puz.left
      },
      answerMap: answerMap.data,
      name: 'default'
    })
    eventBus.emit('notifyUpdateShowBox')
  } else {
    if (resolveInfo.value.resolved > countBeforeResolve) {
      console.log('有新解决的cell，自动重复调用resolve')
      standardResolve()
    }
  }
}
const acceptAiResolve = () => {
  if (!answerMap.aiPros.length) {
    return
  }
  answerMap.aiPros.forEach(r => {
    answerMap.data[r.rowIndex][r.colIndex] = r.aiValue
  })
  answerMap.aiPros = []
  // const res = addToStorage(answerMap.data, versionOffset.value)
  // versionCount.value = res.length
  // versionOffset.value = 0
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
    if (savedData.puz.top.length !== puz.top.length || savedData.puz.left.length !== puz.left.length) {
      console.log('不一样尺寸的问题，清理掉之前的记录')
      clearStorage()
    }
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
    theme: theme.value,
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
const fireworks = () => {
  confetti({
    angle: 60,
    particleCount: 150,
    spread: 120,
    startVelocity: 60,
    origin: { y: 0.7 }
  })
  confetti({
    particleCount: 150,
    spread: 100,
    startVelocity: 60,
    origin: { y: 0.7 }
  })
  confetti({
    angle: 120,
    particleCount: 150,
    spread: 100,
    startVelocity: 60,
    origin: { y: 0.7 }
  })
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
      <input class="cs-input number-input" type="text"
        v-model="leftInputContent"
        @keydown="handleInput($event, 'left')"
        placeholder="👈left"
        style="margin-right: 1rem;">
      <input class="cs-input number-input" type="text"
        v-model="topInputContent"
        @keydown="handleInput($event, 'top')"
        placeholder="👇top"
        style="margin-right: 1rem;">
      <span style="margin-right: 1rem;">
        <label style="display: inline-flex; align-items: center;">
          <input class="cs-checkbox" type="checkbox" v-model="isFastMode" id="fast-mode">
          Fast mode
        </label>
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
      <button class="cs-button"
        @click="repeatLastInput()">
        <span class="shadow"></span>
        <span class="edge"></span>
        <span class="front text">Repeat Last Input(R)</span>
      </button>
      <!-- <button class="cs-button"
        @click="handleLoadSpeech()">
        <span class="shadow"></span>
        <span class="edge"></span>
        <span class="front text">Speech Recognition</span>
      </button> -->
      <button class="cs-button"
        @click="handleLoadOcr()">
        <span class="shadow"></span>
        <span class="edge"></span>
        <span class="front text">
          <CharacterRecognitionIcon class="cs-icon" />&nbsp;OCR Puzzle
        </span>
      </button>
      <button class="cs-button"
        @click="loadString()">
        <span class="shadow"></span>
        <span class="edge"></span>
        <span class="front text">Load From String Save</span>
      </button>
      <button class="cs-button"
        @click="loadDemo('easy')">
        <span class="shadow"></span>
        <span class="edge"></span>
        <span class="front text">Load Easy Demo</span>
      </button>
      <button class="cs-button"
        @click="loadDemo('hard')">
        <span class="shadow"></span>
        <span class="edge"></span>
        <span class="front text">Load Hard Demo</span>
      </button>
    </p>
    <p class="action-seg" v-show="status === 'init'">
      <button class="cs-button primary"
        @click="startDecode">
        <span class="shadow"></span>
        <span class="edge"></span>
        <span class="front text">
          <PlayIcon class="cs-icon" />&nbsp;Decode
        </span>
      </button>
    </p>
    <p class="action-seg" v-show="status === 'resolving'">
      <button class="cs-button primary"
        @click="standardResolve">
        <span class="shadow"></span>
        <span class="edge"></span>
        <span class="front text">
          <LightBulbFlash class="cs-icon" />&nbsp;Resolve(R / blank space)
        </span>
      </button>
      <!-- <button class="cs-button"
        v-show="answerMap.aiPros.length"
        @click="acceptAiResolve()">
        <span class="shadow"></span>
        <span class="edge"></span>
        <span class="front text">Accept AI Resolve(a)</span>
      </button> -->
      <!-- <button v-show="debug" @click="resolveByBlock">Resolve By Blocks</button> -->
      <!-- <button v-show="debug" @click="resolveByEdge">Resolve By Edge</button> -->
      <!-- <button v-show="debug" @click="resolveByMaxNumber">Resolve By Max Number</button> -->
      <!-- <button v-show="debug" @click="resolveBySideExactMarkedPiece">Resolve By Side Exact Marked Piece</button> -->
      <!-- <button v-show="debug" @click="resolveBySplitMarkedPieces">Resolve By Split Marked Pieces</button> -->
      <!-- <button v-show="debug" @click="resolveBySmallSideSpace">Resolve By Small Side Space</button> -->
      <!-- <button v-show="debug" @click="resolveBySmallSpace">Resolve By Small Space</button> -->
      <!-- <button v-show="debug" @click="resolveByAdjacentBlocks">Resolve By Adjacent Block</button> -->
      <!-- <button v-show="debug" @click="resolveByLonelyNumber">Resolve By Lonely Number</button> -->
      <!-- <button v-show="debug" @click="resolveByMarkedOrCrossed">Resolve By Marked/Crossed</button> -->
      <button class="cs-button"
        @click="resolveByMn">
        <span class="shadow"></span>
        <span class="edge"></span>
        <span class="front text">m**n Resolve({{ estTime }})</span>
      </button>
    </p>
    <p class="action-seg" v-show="status === 'resolving'">
      <button class="cs-button"
        v-show="versionOffset > -1 * (versionCount - 1)"
        @click="abortChange">
        <span class="shadow"></span>
        <span class="edge"></span>
        <span class="front text">
          <ArrowGoBack class="cs-icon" />
        </span>
      </button>
      {{ versionCount + versionOffset }} / {{ versionCount }}
      <button class="cs-button"
        v-show="versionOffset < 0"
        @click="redoChange">
        <span class="shadow"></span>
        <span class="edge"></span>
        <span class="front text">
          <ArrowGoForward class="cs-icon" />
        </span>
      </button>
    </p>
    <p class="action-seg" v-show="status === 'resolving'">
      <button class="cs-button"
        @click="save">
        <span class="shadow"></span>
        <span class="edge"></span>
        <span class="front text">
          <SaveIcon class="cs-icon" />&nbsp;Save
        </span>
      </button>
      <button class="cs-button"
        @click="load">
        <span class="shadow"></span>
        <span class="edge"></span>
        <span class="front text">Load</span>
      </button>
      <button class="cs-button"
        @click="getSaveString">
        <span class="shadow"></span>
        <span class="edge"></span>
        <span class="front text">Get Save String</span>
      </button>
      <button class="cs-button danger"
        @click="restart">
        <span class="shadow"></span>
        <span class="edge"></span>
        <span class="front text">
          <RestartIcon class="cs-icon" />&nbsp;Restart
        </span>
      </button>
    </p>
    <p class="action-seg" v-show="status === 'resolving'">
      <p>Theme</p>
      <div style="display: flex; align-items: center;">
        <div class="theme-cell"
          :class="[theme === '' && 'active']"
          @click="theme = ''"></div>
        <div class="theme-cell naturegreen"
          :class="[theme === 'naturegreen' && 'active']"
          @click="theme = 'naturegreen'"></div>
        <div class="theme-cell techdark"
          :class="[theme === 'techdark' && 'active']"
          @click="theme = 'techdark'"></div>
      </div>
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
    :class="[
      theme ? theme : '',
      status === 'resolving' && 'free'
    ]"
    @mouseup="handleMouseUp">
    <div class="box-top-indicators">
      <div class="box-top-indi"
        :class="[focusColIndex === index && 'focus', answerMapCalc.top.length && t.length < answerMapCalc.top[index].length && 'danger']"
        v-for="(t, index) in puz.top" :key="index"
        @dblclick.prevent="status === 'init' && editNumber('top', index, $event)"
        @click.right.prevent="handleShowDropdownMenu('top', index, $event)">
        <DotsMore class="icon-btn icon-more"
          v-show="status === 'init'"
          @click="handleShowDropdownMenu('top', index, $event)"
        />
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
          <DotsMore class="icon-btn icon-more"
            v-show="status === 'init'"
            @click="handleShowDropdownMenu('top', index, $event)"
          />
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
              :class="[
                'style-' + c,
                !c && answerMap.aiPros.find(item => item.rowIndex === index && item.colIndex === ci) ? 'style-possible-' + answerMap.aiPros.find(item => item.rowIndex === index && item.colIndex === ci).aiValue : ''
              ]"
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

  <follow-indicator></follow-indicator>

  <fly-top-indicator
    :is-show="!isTopNumbersShow && focusColPuz"
    :index="focusColIndex"
    :is-danger="answerMapCalc.top && answerMapCalc.top.length && focusColPuz && focusColPuz.length < answerMapCalc.top[focusColIndex].length"
    :answer-map-calc="answerMapCalc"
    :data="focusColPuz"></fly-top-indicator>

  <follow-menu></follow-menu>

  <input-assist
    :menu="lastInput.history"></input-assist>

  <show-box color="#086db9"
    v-if="status === 'resolving'"></show-box>

  <ocr-result></ocr-result>

  <follow-input></follow-input>
  <follow-number-input></follow-number-input>

  <ai-legend
    v-show="loading"></ai-legend>
</template>

<style lang="scss" scoped>
@use "../assets/var.scss" as var;
@use "../assets/thinkblue-theme.scss" as thinkblue;
@use "../assets/naturegreen-theme.scss" as naturegreen;
@use "../assets/techdark-theme.scss" as techdark;

.action-panel {
  position: fixed;
  z-index: 9;
  /* left: 0;
  top: 0; */
  /* right: 0; */
  width: 100%;
  height: 220px;
  padding: 16px 32px;
  background: #fff;
  border: 2px solid var.$system-color;
  &.right {
    /* left: auto;
    top: 0;
    right: 0; */
    width: 240px;
    height: auto;
  }
  .number-input {
    min-width: 300px;
    // height: 30px;
    // line-height: 30px;
  }
  .action-seg {
    padding: 6px 0;
    border-bottom: 1px solid var.$border-color;
    button:not(:last-of-type) {
      margin-right: 8px;
    }
    .theme-cell {
      position: relative;
      display: inline-block;
      margin-right: 4px;
      width: 26px;
      height: 26px;
      border-radius: 2px;
      background: radial-gradient(circle at center, thinkblue.$theme-color-highlight, thinkblue.$theme-color);
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
      user-select: none;
      &.naturegreen {
        background: radial-gradient(circle at center, naturegreen.$theme-color-highlight, naturegreen.$theme-color);
      }
      &.techdark {
        background: radial-gradient(circle at center, techdark.$theme-color-highlight, techdark.$theme-color);
      }
      &.active {
        position: relative;
        &:before {
          content: "";
          position: absolute;
          right: 2px;
          top: 2px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #fff;
        }
      }
    }
  }
}
.cell {
  width: 26px;
  height: 26px;
  line-height: 26px;
  text-align: center;
  &.danger {
    color: red;
    text-decoration: underline;
    font-weight: bold;
  }
}
.icon-btn {
  width: 20px;
  height: 20px;
  padding: 2px;
  background: var.$system-color;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}
.icon-more {
  position: absolute;
  z-index: 2;
  left: 5px;
  top: -16px;
  box-shadow: 1px 1px 2px rgba(115, 155, 155, 0.8);
  opacity: 0;
}
.box-main {
  margin-top: 220px;
  &.free {
    margin-top: auto;
  }
  .box-top-indicators {
    margin-left: 262px;
    user-select: none;
    .box-top-indi {
      position: relative;
      display: inline-block;
      margin-right: 2px;
      width: 26px;
      height: auto;
      color: var.$indicator-text-color;
      background: var.$indicator-bg-color;
      transition: all 0.3s;
      &.focus {
        color: #333;
        background: thinkblue.$theme-color-secondary;
      }
      &.danger {
        color: #333;
        background: var.$indicator-bg-color-danger;
      }
      &:hover > .icon-btn {
        opacity: 1;
      }
    }
  }
  .box-left-indicators {
    position: absolute;
    left: 0;
    top: 0;
    width: 260px;
    user-select: none;
    .box-left-indi {
      position: relative;
      /* display: inline-block; */
      margin-bottom: 2px;
      width: auto;
      height: 26px;
      color: var.$indicator-text-color;
      background: var.$indicator-bg-color;
      text-align: right;
      transition: all 0.3s;
      &.focus {
        color: #333;
        background: thinkblue.$theme-color-secondary;
      }
      &.danger {
        color: #333;
        background: var.$indicator-bg-color-danger;
      }
      &:hover > .icon-btn {
        opacity: 1;
      }
      & > .cell {
        display: inline-block;
      }
      & > .icon-more {
        left: -16px;
        top: 5px;
      }
    }
  }
  .box-canvas {
    margin-left: 262px;
    /* background: red; */
    .row {
      margin-bottom: 2px;
      .row-box {
        display: inline-block;
        .clk-cell {
          position: relative;
          display: inline-block;
          margin-right: 2px;
          width: 26px;
          height: 26px;
          border-radius: 2px;
          background: var.$system-color-danger;
          user-select: none;
          &:nth-of-type(5n) {
            position: relative;
            &:after {
              content: "";
              position: absolute;
              width: 2px;
              height: 100%;
              right: -2px;
              top: 0;
              background: #999;
            }
          }
          &.style-1 {
            background: radial-gradient(circle at center, thinkblue.$theme-color-highlight, thinkblue.$theme-color);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2); /* 添加阴影，增加立体感 */
            /* box-shadow: -2px -2px 5px #fff, 2px 2px 5px #babecc; */
          }
          &.style-possible-1 {
            background: radial-gradient(circle at center, thinkblue.$theme-color-highlight, thinkblue.$theme-color);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2); /* 添加阴影，增加立体感 */
            /* box-shadow: -2px -2px 5px #fff, 2px 2px 5px #babecc; */
            animation: blink infinite 1s linear;
          }
          &.style-0 {
            background: rgb(240, 240, 240);
            box-shadow: inset 1px 1px 2px #babecc, inset -1px -1px 2px #fff;
            &:before {
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
          }
          &.style-possible-0 {
            background: rgb(240, 240, 240);
            box-shadow: inset 1px 1px 2px #babecc, inset -1px -1px 2px #fff;
            animation: blink infinite 1s linear;
            &:before {
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
          }
        }
      }
      &:nth-of-type(5n) > .row-box {
        position: relative;
        /* top: 2px; */
        /* border-bottom: 1px solid red; */
        &:after {
          content: "";
          position: absolute;
          width: 100%;
          height: 2px;
          bottom: -2px;
          left: 0;
          background: #999;
        }
      }
    }
  }
  &.naturegreen {
    .box-top-indicators {
      .box-top-indi {
        &.focus {
          background: naturegreen.$theme-color-secondary;
        }
      }
    }
    .box-left-indicators {
      .box-left-indi {
        &.focus {
          background: naturegreen.$theme-color-secondary;
        }
      }
    }
    .box-canvas {
      .row {
        .row-box {
          .clk-cell {
            &.style-1 {
              background: radial-gradient(circle at center, naturegreen.$theme-color-highlight, naturegreen.$theme-color);
            }
          }
        }
      }
    }
  }
  &.techdark {
    .box-top-indicators {
      .box-top-indi {
        &.focus {
          background: techdark.$theme-color-secondary;
        }
      }
    }
    .box-left-indicators {
      .box-left-indi {
        &.focus {
          background: techdark.$theme-color-secondary;
        }
      }
    }
    .box-canvas {
      .row {
        .row-box {
          .clk-cell {
            &.style-1 {
              background: radial-gradient(circle at center, techdark.$theme-color-highlight, techdark.$theme-color);
            }
          }
        }
      }
    }
  }
}
@keyframes blink {
  0% {
    opacity: 0.8;
  }
  50% {
    opacity: 0.3;
  }
  100% {
    opacity: 0.8;
  }
}
</style>