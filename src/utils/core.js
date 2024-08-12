
// example input data:
// {
//   top: [[1, 2, 1], [2, 2], ...],
//   left: [...]
// }

// Answer map data:
// [
//   ['1|0|<blank>']
// ]
// let answerMap = []
let tempAnswers = []
let tempSheets = []

// Some methods to resolve:
// 1. resolve 'big block's, e.g. 8 of 10, 3/4 of 10(9)
// 2. resolve by edge block, e.g. b1bbb... of 3
// 3. resolve rows/columns those have all completed marked cells or crossed cells. e.g. 0
// 4. resolve by seperated 'area's(This is the hardest part to resolve in program, leave to human)
// 5. m**n hard attack (care about the run time)

export const mnQuantaResolve = (puz, answer) => {
  // 1. find out all possible answers in each row
  // [
  //   ['110111...', ...] // possible answers in row
  // ]
  const possibleRowsSheet = getPossibleRows(puz, answer)
  console.log('possible rows sheet', possibleRowsSheet)
  // 2. arrange all possibles row answers to check if it's valid
  const correctSheet = crossCheckRowsSheet(puz, possibleRowsSheet)
  if (correctSheet) {
    return correctSheet.map(row => row.split(''))
  } else {
    return null
  }
}

const crossCheckRowsSheet = (puz, sheet) => {
  const width = puz.top.length
  const height = puz.left.length
  // base check
  if (!sheet || !sheet.length || sheet.length < height) {
    window.alert('没有有效的结果数据，或者原始录入数据有误')
    return null
  }
  let flag = true
  let possibleCount = 1
  for (let index = 0; index < sheet.length; index++) {
    const rowPossibleAnswers = sheet[index]
    if (!rowPossibleAnswers.length || rowPossibleAnswers.some(a => a.length !== width)) {
      flag = false
    } else {
      possibleCount *= rowPossibleAnswers.length
    }
  }
  if (!flag) {
    window.alert('没有有效的结果数据，或者原始录入数据有误')
    return null
  }
  console.log('possible answer count is ', possibleCount)
  // NOTE run time depends on sizes? if one check is about to last 10ms, the proper count is limited < 15000 (up to 1~2min). The MAX count is about 200K
  const maxCountLimit = 200000
  if (possibleCount > maxCountLimit) {
    window.alert(`可能情况数据量过大(超过${maxCountLimit})`)
    return null
  }
  // cross check by column!
  tempSheets = []
  recurPossibleAnswers([], sheet)
  // console.log('all possible sheets ', tempSheets)
  for (let index = 0; index < tempSheets.length; index++) {
    const s = tempSheets[index]
    let crossCheckFlag = true
    for (let i = 0; i < s[0].length; i++) {
      let toCheckColumn = ''
      for (let j = 0; j < s.length; j++) {
        toCheckColumn += s[j][i]
      }
      if (!checkRowValid(toCheckColumn, puz.top[i])) {
        crossCheckFlag = false
        break
      }
    }
    if (crossCheckFlag) {
      console.log('CORRECT answer sheet', s)
      return s
    } else {
      // console.log('wrong sheet')
    }
  }
}

const recurPossibleAnswers = (parent, data) => {
  const dataCopy = JSON.parse(JSON.stringify(data))
  const mySave = JSON.parse(JSON.stringify(parent))
  if (!dataCopy || !dataCopy.length) {
    // reach the end
    tempSheets.push(mySave)
    return
  }
  const toLoopItems = dataCopy.shift()
  toLoopItems.forEach(item => {
    mySave.push(item)
    recurPossibleAnswers(mySave, dataCopy)
  })
}

const getPossibleRows = (puz, data) => {
  const result = []
  data.forEach((row, index) => {
    console.log(`trying to resolve row ${index + 1}`, row)
    const rowCopy = JSON.parse(JSON.stringify(row))
    const unknownCount = rowCopy.reduce((soFar, item) => {
      if (item === '') {
        soFar++
      }
      return soFar
    }, 0)
    if (unknownCount > 15) {
      console.warn('存在过多未知内容的行')
      result.push([])
    } else {
      recurUnknownInRow('', rowCopy, rowCopy.length)
      result.push(JSON.parse(JSON.stringify(tempAnswers.filter(a => checkRowValid(a, puz.left[index])))))
      tempAnswers = []
    }
  })
  // console.log('possible rows ', result)
  return result
}

const recurUnknownInRow = (parentString, data, length) => {
  // data is like ['1', '0', ' ', '1', ...]
  const dataCopy = JSON.parse(JSON.stringify(data))
  let myString = parentString
  while (dataCopy.length) {
    if (dataCopy[0] === '1' || dataCopy[0] === '0') {
      myString += dataCopy[0]
      dataCopy.shift()
    } else {
      // unknown
      dataCopy.shift()
      recurUnknownInRow(myString + '1', dataCopy, length)
      recurUnknownInRow(myString + '0', dataCopy, length)
    }
  }
  if (myString.length >= length) {
    tempAnswers.push(myString)
    // console.log('write in ', myString)
  }
}

const checkRowValid = (pa, rule) => {
  // pa is like '1011100111', rule is like [1, 3, 3]'
  // this fn is to check if possible answer matchs the rule
  // console.log('check', pa, rule)
  let toCheck = []
  let count = 0
  for (let index = 0; index < pa.length; index++) {
    const s = pa[index]
    if (s === '1') {
      count++
    } else if (count > 0) {
      toCheck.push(count)
      count = 0
    }
  }
  if (count > 0) {
    toCheck.push(count)
    count = 0
  } else if (toCheck.length === 0) {
    toCheck.push(0)
    count = 0
  }
  return toCheck.join(',') === rule.join(',')
}

export const resolveBlock = (puz, answer) => {
  // 方法会剔除所有左右两边连续的cross，根据必定重叠的区间进行marked填充
  const width = puz.top.length
  const height = puz.left.length
  const result = [
    // {
    //   x: 0,
    //   y: 0,
    //   value: '1|0'
    // }
  ]
  puz.top.forEach((col, index) => {
    if (!isLineClear('column', answer, index)) {
      // col is like [5, 4]
      const sums = sum(col)
      const gapCount = col.length - 1
      const { preCrossedCount, sufCrossedCount } = getLineSideCrossedCount('column', answer, index)
      const notSureCount = height - sums - gapCount - preCrossedCount - sufCrossedCount // eg. 2
      let baseLength = preCrossedCount
      col.forEach(c => {
        if (c > notSureCount) {
          for (let j = 0; j < c - notSureCount; j++) {
            result.push({
              x: index,
              y: baseLength + j + notSureCount,
              value: '1'
            })
          }
        }
        baseLength += c + 1
      })
    }
  })
  puz.left.forEach((row, index) => {
    if (!isLineClear('row', answer, index)) {
      // row is like [5, 4]
      const sums = sum(row)
      const gapCount = row.length - 1
      const { preCrossedCount, sufCrossedCount } = getLineSideCrossedCount('row', answer, index)
      const notSureCount = width - sums - gapCount - preCrossedCount - sufCrossedCount // eg. 2
      let baseLength = preCrossedCount
      row.forEach(r => {
        if (r > notSureCount) {
          for (let j = 0; j < r - notSureCount; j++) {
            result.push({
              x: baseLength + j + notSureCount,
              y: index,
              value: '1'
            })
          }
        }
        baseLength += r + 1
      })
    }
  })
  return result
}

export const resolveEdge = (puz, answer) => {
  // 方法根据左右边缘的大数字，结合在靠边缘位置已经marked的情况，计算必定应该marked的部分
  const width = puz.top.length
  const height = puz.left.length
  const result = [
    // {
    //   x: 0,
    //   y: 0,
    //   value: '1|0'
    // }
  ]
  puz.left.forEach((row, index) => {
    // line is like [4, 1, 2]
    if (!isLineClear('row', answer, index)) {
      const { preCrossedCount, sufCrossedCount } = getLineSideCrossedCount('row', answer, index)
      const firstMarkedIndex = answer[index].findIndex(a => a === '1')
      const lastMarkedIndex = answer[index].findLastIndex(a => a === '1')
      if (firstMarkedIndex > -1) {
        const exactHeadSureLength = preCrossedCount + row[0] - (firstMarkedIndex + 1)
        for (let i = 1; i <= exactHeadSureLength; i++) {
          // 判断首
          result.push({
            x: firstMarkedIndex + i,
            y: index,
            value: '1'
          })
        }
      }
      if (lastMarkedIndex > -1 && row.length > 1) {
        // 判断尾
        const exactTailSureLength = sufCrossedCount + row[row.length - 1] - (width - lastMarkedIndex)
        for (let i = 1; i <= exactTailSureLength; i++) {
          result.push({
            x: lastMarkedIndex - i,
            y: index,
            value: '1'
          })
        }
      }
    }
  })
  puz.top.forEach((col, index) => {
    if (!isLineClear('column', answer, index)) {
      const { preCrossedCount, sufCrossedCount } = getLineSideCrossedCount('column', answer, index)
      let firstMarkedIndex = -1
      let lastMarkedIndex = -1
      for (let i = 0; i < answer.length; i++) {
        const a = answer[i][index]
        if (a === '1') {
          if (firstMarkedIndex === -1) {
            firstMarkedIndex = i
          }
          lastMarkedIndex = i
        }
      }
      if (firstMarkedIndex > -1) {
        const exactHeadSureLength = preCrossedCount + col[0] - (firstMarkedIndex + 1)
        for (let i = 1; i <= exactHeadSureLength; i++) {
          // 判断首
          result.push({
            x: index,
            y: firstMarkedIndex + i,
            value: '1'
          })
        }
      }
      if (lastMarkedIndex > -1 && col.length > 1) {
        // 判断尾
        const exactTailSureLength = sufCrossedCount + col[col.length - 1] - (height - lastMarkedIndex)
        for (let i = 1; i <= exactTailSureLength; i++) {
          result.push({
            x: index,
            y: lastMarkedIndex - i,
            value: '1'
          })
        }
      }
    }
  })
  return result
}

export const resolveMarkedOrCrossed = (puz, answer) => {
  // 方法根据行列内已经明确了所有的marked，或者所有待明确的全部应该是marked的情况，进行剩余的填充
  const result = [
    // {
    //   x: 0,
    //   y: 0,
    //   value: '1|0'
    // }
  ]
  puz.top.forEach((col, index) => {
    if (!isLineClear('column', answer, index)) {
      // col is like [5, 4]
      const sums = sum(col)
      const { markedCount, unknownCount } = getLineInfo('column', answer, index)
      if (markedCount === sums) {
        // found all marked, fill all unknown cells with cross
        for (let j = 0; j < answer.length; j++) {
          const val = answer[j][index]
          if (!val) {
            result.push({
              x: index,
              y: j,
              value: '0'
            })
          }
        }
      } else if (markedCount + unknownCount === sums) {
        // all unknown cells should be marked
        for (let j = 0; j < answer.length; j++) {
          const val = answer[j][index]
          if (!val) {
            result.push({
              x: index,
              y: j,
              value: '1'
            })
          }
        }
      }
    }
  })
  puz.left.forEach((row, index) => {
    if (!isLineClear('row', answer, index)) {
      // row is like [4, 3]
      const sums = sum(row)
      const { markedCount, unknownCount } = getLineInfo('row', answer, index)
      if (markedCount === sums) {
        // found all marked, fill all unknown cells with cross
        for (let j = 0; j < answer[index].length; j++) {
          const val = answer[index][j]
          if (!val) {
            result.push({
              x: j,
              y: index,
              value: '0'
            })
          }
        }
      } else if (markedCount + unknownCount === sums) {
        // all unknown cells should be marked
        for (let j = 0; j < answer[index].length; j++) {
          const val = answer[index][j]
          if (!val) {
            result.push({
              x: j,
              y: index,
              value: '1'
            })
          }
        }
      }
    }
  })
  return result
}

const isLineClear = (direction, answer, index) => {
  if (direction === 'row') {
    return answer[index].every(val => val)
  } else {
    let flag = true
    for (let i = 0; i < answer.length; i++) {
      const val = answer[i][index]
      if (!val) {
        flag = false
        break
      }
    }
    return flag
  }
}

const getLineInfo = (direction, answer, index) => {
  let markedCount = 0
  let crossedCount = 0
  let unknownCount = 0
  let totalCount = 0
  if (direction === 'row') {
    for (let i = 0; i < answer[index].length; i++) {
      totalCount++
      if (answer[index][i] === '1') {
        markedCount++
      } else if (answer[index][i] === '0') {
        crossedCount++
      } else {
        unknownCount++
      }
    }
  } else {
    for (let i = 0; i < answer.length; i++) {
      totalCount++
      if (answer[i][index] === '1') {
        markedCount++
      } else if (answer[i][index] === '0') {
        crossedCount++
      } else {
        unknownCount++
      }
    }
  }
  return {
    markedCount,
    crossedCount,
    unknownCount,
    totalCount
  }
}

const getLineSideCrossedCount = (direction, answer, index) => {
  let preCrossedCount = 0
  let sufCrossedCount = 0
  if (direction === 'row') {
    // calc pre
    for (let i = 0; i < answer[index].length; i++) {
      if (answer[index][i] === '0') {
        preCrossedCount++
      } else {
        break
      }
    }
    // calc suf
    for (let i = answer[index].length - 1; i >= 0; i--) {
      if (answer[index][i] === '0') {
        sufCrossedCount++
      } else {
        break
      }
    }
  } else {
    // calc pre
    for (let i = 0; i < answer.length; i++) {
      if (answer[i][index] === '0') {
        preCrossedCount++
      } else {
        break
      }
    }
    // calc suf
    for (let i = answer.length - 1; i >= 0; i--) {
      if (answer[i][index] === '0') {
        sufCrossedCount++
      } else {
        break
      }
    }
  }
  return {
    preCrossedCount,
    sufCrossedCount
  }
}

const fillLine = (data, length) => {
  const result = []
  if (data.length === 1 && data[0] === 0) {
    for (let j = 0; j < length; j++) {
      result.push('0')
    }
    return result
  }
  data.forEach((v, index) => {
    if (index > 0) {
      // the gap, fill with a '0'
      result.push('0')
    }
    for (let j = 0; j < v; j++) {
      result.push('1')
    }
  })
  return result
}

export const initMap = (width, height) => {
  const result = []
  for (let index = 0; index < height; index++) {
    const row = []
    for (let j = 0; j < width; j++) {
      row.push('')
    }
    result.push(row)
  }
  return result
}

const sum = (data) => {
  return data.reduce((total, val) => {
    return total + val
  }, 0)
}
