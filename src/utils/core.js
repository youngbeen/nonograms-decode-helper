
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

// 方法会剔除所有左右两边连续的明确的cell，根据必定重叠的区间进行marked填充
export const resolveBlock = (puz, answer) => {
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
      const { preExactCount, preMarkedInfo, sufExactCount, sufMarkedInfo } = getLineSideExactInfo('column', answer, index)
      const fixedCol = col.slice(preMarkedInfo.length, col.length - sufMarkedInfo.length)
      const sums = sum(fixedCol)
      if (sums > 0) {
        const gapCount = fixedCol.length - 1
        const notSureCount = height - sums - gapCount - preExactCount - sufExactCount // eg. 2
        let baseLength = preExactCount
        fixedCol.forEach(c => {
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
    }
  })
  puz.left.forEach((row, index) => {
    if (!isLineClear('row', answer, index)) {
      // row is like [5, 4]
      const { preExactCount, preMarkedInfo, sufExactCount, sufMarkedInfo } = getLineSideExactInfo('row', answer, index)
      const fixedRow = row.slice(preMarkedInfo.length, row.length - sufMarkedInfo.length)
      const sums = sum(fixedRow)
      if (sums > 0) {
        const gapCount = fixedRow.length - 1
        const notSureCount = width - sums - gapCount - preExactCount - sufExactCount // eg. 2
        let baseLength = preExactCount
        fixedRow.forEach(r => {
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
    }
  })
  return result
}

// 方法根据左右边缘的大数字，结合在靠边缘位置已经marked的情况，计算必定应该marked的部分
export const resolveEdge = (puz, answer) => {
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
      const { preExactCount, preMarkedInfo, sufExactCount, sufMarkedInfo } = getLineSideExactInfo('row', answer, index)
      const firstMarkedIndex = answer[index].findIndex((a, i) => i >= preExactCount && a === '1')
      const lastMarkedIndex = answer[index].findLastIndex((a, i) => i < answer[index].length - sufExactCount && a === '1')
      const fixedRow = row.slice(preMarkedInfo.length, row.length - sufMarkedInfo.length)
      if (firstMarkedIndex > -1 && fixedRow.length) {
        const exactHeadSureLength = preExactCount + fixedRow[0] - (firstMarkedIndex + 1)
        for (let i = 1; i <= exactHeadSureLength; i++) {
          // 判断首
          result.push({
            x: firstMarkedIndex + i,
            y: index,
            value: '1'
          })
        }
        if (firstMarkedIndex === 0) {
          result.push({
            x: firstMarkedIndex + exactHeadSureLength + 1,
            y: index,
            value: '0'
          })
        }
      }
      if (lastMarkedIndex > -1 && fixedRow.length > 1) {
        // 判断尾
        const exactTailSureLength = sufExactCount + fixedRow[fixedRow.length - 1] - (width - lastMarkedIndex)
        for (let i = 1; i <= exactTailSureLength; i++) {
          result.push({
            x: lastMarkedIndex - i,
            y: index,
            value: '1'
          })
        }
        if (lastMarkedIndex === width - 1) {
          result.push({
            x: lastMarkedIndex - exactTailSureLength - 1,
            y: index,
            value: '0'
          })
        }
      }
    }
  })
  puz.top.forEach((col, index) => {
    if (!isLineClear('column', answer, index)) {
      const { preExactCount, preMarkedInfo, sufExactCount, sufMarkedInfo } = getLineSideExactInfo('column', answer, index)
      let firstMarkedIndex = -1
      let lastMarkedIndex = -1
      for (let i = preExactCount; i < answer.length - sufExactCount; i++) {
        const a = answer[i][index]
        if (a === '1') {
          if (firstMarkedIndex === -1) {
            firstMarkedIndex = i
          }
          lastMarkedIndex = i
        }
      }
      const fixedCol = col.slice(preMarkedInfo.length, col.length - sufMarkedInfo.length)
      if (firstMarkedIndex > -1 && fixedCol.length) {
        const exactHeadSureLength = preExactCount + fixedCol[0] - (firstMarkedIndex + 1)
        for (let i = 1; i <= exactHeadSureLength; i++) {
          // 判断首
          result.push({
            x: index,
            y: firstMarkedIndex + i,
            value: '1'
          })
        }
        if (firstMarkedIndex === 0) {
          result.push({
            x: index,
            y: firstMarkedIndex + exactHeadSureLength + 1,
            value: '0'
          })
        }
      }
      if (lastMarkedIndex > -1 && fixedCol.length > 1) {
        // 判断尾
        const exactTailSureLength = sufExactCount + fixedCol[fixedCol.length - 1] - (height - lastMarkedIndex)
        for (let i = 1; i <= exactTailSureLength; i++) {
          result.push({
            x: index,
            y: lastMarkedIndex - i,
            value: '1'
          })
        }
        if (lastMarkedIndex === width - 1) {
          result.push({
            x: index,
            y: lastMarkedIndex - exactTailSureLength - 1,
            value: '0'
          })
        }
      }
    }
  })
  return result
}

// 方法根据最大的数字不管有几个，只要已经出现了连续最大数字个marked格子，则两边必定为cross
export const resolveMaxNumber = (puz, answer) => {
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
      const maxNumber = Math.max(...row)
      let firstMarkedIndex = -1
      let combinedMarks = 0
      for (let i = 0; i < width; i++) {
        if (answer[index][i] === '1') {
          combinedMarks === 0 && (firstMarkedIndex = i)
          combinedMarks++
        } else {
          if (combinedMarks >= maxNumber) {
            if (combinedMarks > maxNumber) {
              console.warn(`Invalid answer in row ${index}, maxNumber is ${maxNumber} but found ${combinedMarks}`)
            }
            if (firstMarkedIndex > 0) {
              result.push({
                x: firstMarkedIndex - 1,
                y: index,
                value: '0'
              })
            }
            result.push({
              x: i,
              y: index,
              value: '0'
            })
          }
          firstMarkedIndex = -1
          combinedMarks = 0
        }
      }
    }
  })
  puz.top.forEach((col, index) => {
    if (!isLineClear('column', answer, index)) {
      const maxNumber = Math.max(...col)
      let firstMarkedIndex = -1
      let combinedMarks = 0
      for (let i = 0; i < height; i++) {
        if (answer[i][index] === '1') {
          combinedMarks === 0 && (firstMarkedIndex = i)
          combinedMarks++
        } else {
          if (combinedMarks >= maxNumber) {
            if (combinedMarks > maxNumber) {
              console.warn(`Invalid answer in col ${index}, maxNumber is ${maxNumber} but found ${combinedMarks}`)
            }
            if (firstMarkedIndex > 0) {
              result.push({
                x: index,
                y: firstMarkedIndex - 1,
                value: '0'
              })
            }
            result.push({
              x: index,
              y: i,
              value: '0'
            })
          }
          firstMarkedIndex = -1
          combinedMarks = 0
        }
      }
    }
  })
  return result
}

// 方法根据左右两侧最近的一侧边界（是cross或者左右边界）的marked块，根据当前未解决的数字升序情况，判断属于哪一挡位并进行必定mark标记
export const resolveSideExactMarkedPiece = (puz, answer) => {
  const result = [
    // {
    //   x: 0,
    //   y: 0,
    //   value: '1|0'
    // }
  ]
  puz.left.forEach((row, index) => {
    if (!isLineClear('row', answer, index)) {
      const { numberInfo } = getPuzLineInfo(row)
      const ascNumbers = numberInfo.map(n => n.number)
      const lineInfo = getLineInfo('row', answer, index)
      const unresolvedMarkedPieces = lineInfo.markedPieces.filter(m => !m.resolved)
      unresolvedMarkedPieces.forEach(p => {
        const preBorder = getLineNearBorder('row', answer, index, p.fromIndex, {
          checkDirection: 'desc'
        })
        const sufBorder = getLineNearBorder('row', answer, index, p.toIndex, {
          checkDirection: 'asc'
        })
        // 查找计算当前块至少包含几个
        let shouldBeNumber = p.length
        for (let i = 0; i < ascNumbers.length - 1; i++) {
          const n = ascNumbers[i]
          const nextNumber = ascNumbers[i + 1]
          if (p.length > n && p.length < nextNumber) {
            shouldBeNumber = nextNumber
          }
        }
        if (shouldBeNumber < ascNumbers[0]) {
          // 不会比最小数字还小
          shouldBeNumber = ascNumbers[0]
        }
        // 查找最近的边界
        const preDistance = p.fromIndex - preBorder.borderIndex - 1
        const sufDistance = sufBorder.borderIndex - p.toIndex - 1
        if (preDistance < sufDistance) {
          const shouldMarkCount = shouldBeNumber - p.length - preDistance
          if (shouldMarkCount > 0) {
            // 进行标记
            for (let i = 1; i <= shouldMarkCount; i++) {
              result.push({
                x: p.toIndex + i,
                y: index,
                value: '1'
              })
            }
          }
        } else {
          const shouldMarkCount = shouldBeNumber - p.length - sufDistance
          if (shouldMarkCount > 0) {
            // 进行标记
            for (let i = 1; i <= shouldMarkCount; i++) {
              result.push({
                x: p.fromIndex - i,
                y: index,
                value: '1'
              })
            }
          }
        }
      })
    }
  })
  puz.top.forEach((col, index) => {
    if (!isLineClear('col', answer, index)) {
      const { numberInfo } = getPuzLineInfo(col)
      const ascNumbers = numberInfo.map(n => n.number)
      const lineInfo = getLineInfo('col', answer, index)
      const unresolvedMarkedPieces = lineInfo.markedPieces.filter(m => !m.resolved)
      unresolvedMarkedPieces.forEach(p => {
        const preBorder = getLineNearBorder('col', answer, index, p.fromIndex, {
          checkDirection: 'desc'
        })
        const sufBorder = getLineNearBorder('col', answer, index, p.toIndex, {
          checkDirection: 'asc'
        })
        // 查找计算当前块至少包含几个
        let shouldBeNumber = p.length
        for (let i = 0; i < ascNumbers.length - 1; i++) {
          const n = ascNumbers[i]
          const nextNumber = ascNumbers[i + 1]
          if (p.length > n && p.length < nextNumber) {
            shouldBeNumber = nextNumber
          }
        }
        if (shouldBeNumber < ascNumbers[0]) {
          // 不会比最小数字还小
          shouldBeNumber = ascNumbers[0]
        }
        // 查找最近的边界
        const preDistance = p.fromIndex - preBorder.borderIndex - 1
        const sufDistance = sufBorder.borderIndex - p.toIndex - 1
        if (preDistance < sufDistance) {
          const shouldMarkCount = shouldBeNumber - p.length - preDistance
          if (shouldMarkCount > 0) {
            // 进行标记
            for (let i = 1; i <= shouldMarkCount; i++) {
              result.push({
                x: index,
                y: p.toIndex + i,
                value: '1'
              })
            }
          }
        } else {
          const shouldMarkCount = shouldBeNumber - p.length - sufDistance
          if (shouldMarkCount > 0) {
            // 进行标记
            for (let i = 1; i <= shouldMarkCount; i++) {
              result.push({
                x: index,
                y: p.fromIndex - i,
                value: '1'
              })
            }
          }
        }
      })
    }
  })
  return result
}

// 方法根据单个未知格子分隔开的两块marked，尝试判断是否是一个合法的连续完整块。如果连起来的长度超过最大数字，则为非法。该未知格子必定是cross
export const resolveSplitMarkedPieces = (puz, answer) => {
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
      const maxNumber = Math.max(...row)
      const lineInfo = getLineInfo('row', answer, index)
      if (lineInfo.markedPieces && lineInfo.markedPieces.length > 1) {
        for (let i = 0; i < lineInfo.markedPieces.length - 1; i++) {
          const markedPiece = lineInfo.markedPieces[i]
          const nextMarkedPiece = lineInfo.markedPieces[i + 1]
          if (!markedPiece.resolved && !nextMarkedPiece.resolved && (nextMarkedPiece.fromIndex - markedPiece.toIndex) === 2 && (nextMarkedPiece.toIndex - markedPiece.fromIndex + 1) > maxNumber) {
            result.push({
              x: markedPiece.toIndex + 1,
              y: index,
              value: '0'
            })
          }
        }
      }
    }
  })
  puz.top.forEach((col, index) => {
    if (!isLineClear('column', answer, index)) {
      const maxNumber = Math.max(...col)
      const lineInfo = getLineInfo('column', answer, index)
      if (lineInfo.markedPieces && lineInfo.markedPieces.length > 1) {
        for (let i = 0; i < lineInfo.markedPieces.length - 1; i++) {
          const markedPiece = lineInfo.markedPieces[i]
          const nextMarkedPiece = lineInfo.markedPieces[i + 1]
          if (!markedPiece.resolved && !nextMarkedPiece.resolved && (nextMarkedPiece.fromIndex - markedPiece.toIndex) === 2 && (nextMarkedPiece.toIndex - markedPiece.fromIndex + 1) > maxNumber) {
            result.push({
              x: index,
              y: markedPiece.toIndex + 1,
              value: '0'
            })
          }
        }
      }
    }
  })
  return result
}

// 方法根据边缘形成的空间大小，同边缘的数字比对，如果数字超过边缘空间大小，则此空间中的全部未知格子都应该是cross
export const resolveSmallSideSpace = (puz, answer) => {
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
    if (row.length > 1 && !isLineClear('row', answer, index)) {
      const preSideNumber = row[0]
      const sufSideNumber = row[row.length - 1]
      if (preSideNumber > 1) {
        let preSideSpace = width
        let firstUnknownIndex = -1
        let combinedUnknowns = 0
        for (let i = 0; i < width; i++) {
          if (answer[index][i] === '') {
            // 碰到未知格子，累计space
            combinedUnknowns === 0 && (firstUnknownIndex = i)
            combinedUnknowns++
          } else if (answer[index][i] === '0') {
            if (combinedUnknowns > 0) {
              // 碰到了cross格子，并且之前已经在累计未知个数了，则说明第一个space已经明确了
              preSideSpace = combinedUnknowns
              combinedUnknowns = 0
              break
            } else {
              // 碰到了cross格子，但是没有累计未知个数，继续往下一个看
              continue
            }
          } else {
            // 碰到marked格子了，属于异常状态，放弃
            combinedUnknowns = 0
            break
          }
        }
        if (combinedUnknowns > 0) {
          preSideSpace = combinedUnknowns
          combinedUnknowns = 0
        }
        if (preSideNumber > preSideSpace) {
          for (let i = firstUnknownIndex; i < firstUnknownIndex + preSideSpace; i++) {
            result.push({
              x: i,
              y: index,
              value: '0'
            })
          }
        }
      }
      if (sufSideNumber > 1) {
        let sufSideSpace = width
        let firstUnknownIndex = -1
        let combinedUnknowns = 0
        for (let i = width - 1; i >= 0; i--) {
          if (answer[index][i] === '') {
            // 碰到未知格子，累计space
            combinedUnknowns === 0 && (firstUnknownIndex = i)
            combinedUnknowns++
          } else if (answer[index][i] === '0') {
            if (combinedUnknowns > 0) {
              // 碰到了cross格子，并且之前已经在累计未知个数了，则说明第一个space已经明确了
              sufSideSpace = combinedUnknowns
              combinedUnknowns = 0
              break
            } else {
              // 碰到了cross格子，但是没有累计未知个数，继续往下一个看
              continue
            }
          } else {
            // 碰到marked格子了，属于异常状态，放弃
            combinedUnknowns = 0
            break
          }
        }
        if (combinedUnknowns > 0) {
          sufSideSpace = combinedUnknowns
          combinedUnknowns = 0
        }
        if (sufSideNumber > sufSideSpace) {
          for (let i = firstUnknownIndex; i > firstUnknownIndex - sufSideSpace; i--) {
            result.push({
              x: i,
              y: index,
              value: '0'
            })
          }
        }
      }
    }
  })
  puz.top.forEach((col, index) => {
    if (col.length > 1 && !isLineClear('column', answer, index)) {
      const preSideNumber = col[0]
      const sufSideNumber = col[col.length - 1]
      if (preSideNumber > 1) {
        let preSideSpace = height
        let firstUnknownIndex = -1
        let combinedUnknowns = 0
        for (let i = 0; i < height; i++) {
          if (answer[i][index] === '') {
            // 碰到未知格子，累计space
            combinedUnknowns === 0 && (firstUnknownIndex = i)
            combinedUnknowns++
          } else if (answer[i][index] === '0') {
            if (combinedUnknowns > 0) {
              // 碰到了cross格子，并且之前已经在累计未知个数了，则说明第一个space已经明确了
              preSideSpace = combinedUnknowns
              combinedUnknowns = 0
              break
            } else {
              // 碰到了cross格子，但是没有累计未知个数，继续往下一个看
              continue
            }
          } else {
            // 碰到marked格子了，属于异常状态，放弃
            combinedUnknowns = 0
            break
          }
        }
        if (combinedUnknowns > 0) {
          preSideSpace = combinedUnknowns
          combinedUnknowns = 0
        }
        if (preSideNumber > preSideSpace) {
          for (let i = firstUnknownIndex; i < firstUnknownIndex + preSideSpace; i++) {
            result.push({
              x: index,
              y: i,
              value: '0'
            })
          }
        }
      }
      if (sufSideNumber > 1) {
        let sufSideSpace = height
        let firstUnknownIndex = -1
        let combinedUnknowns = 0
        for (let i = height - 1; i >= 0; i--) {
          if (answer[i][index] === '') {
            // 碰到未知格子，累计space
            combinedUnknowns === 0 && (firstUnknownIndex = i)
            combinedUnknowns++
          } else if (answer[i][index] === '0') {
            if (combinedUnknowns > 0) {
              // 碰到了cross格子，并且之前已经在累计未知个数了，则说明第一个space已经明确了
              sufSideSpace = combinedUnknowns
              combinedUnknowns = 0
              break
            } else {
              // 碰到了cross格子，但是没有累计未知个数，继续往下一个看
              continue
            }
          } else {
            // 碰到marked格子了，属于异常状态，放弃
            combinedUnknowns = 0
            break
          }
        }
        if (combinedUnknowns > 0) {
          sufSideSpace = combinedUnknowns
          combinedUnknowns = 0
        }
        if (sufSideNumber > sufSideSpace) {
          for (let i = firstUnknownIndex; i > firstUnknownIndex - sufSideSpace; i--) {
            result.push({
              x: index,
              y: i,
              value: '0'
            })
          }
        }
      }
    }
  })
  return result
}

// NOTE 此策略已经被resolveMaxNumber涵盖了，已废弃
export const resolveAllOne = (puz, answer) => {
  // 根据所有项都是1的行/列，将已明确的marked周围标cross
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
    if (col.every(c => c === 1)) {
      for (let j = 0; j < height; j++) {
        const val = answer[j][index]
        if (val === '1') {
          if (j - 1 >= 0) {
            result.push({
              x: index,
              y: j - 1,
              value: '0'
            })
          }
          if (j + 1 < height) {
            result.push({
              x: index,
              y: j + 1,
              value: '0'
            })
          }
        }
      }
    }
  })
  puz.left.forEach((row, index) => {
    if (row.every(r => r === 1)) {
      for (let j = 0; j < width; j++) {
        const val = answer[index][j]
        if (val === '1') {
          if (j - 1 >= 0) {
            result.push({
              x: j - 1,
              y: index,
              value: '0'
            })
          }
          if (j + 1 < width) {
            result.push({
              x: j + 1,
              y: index,
              value: '0'
            })
          }
        }
      }
    }
  })
  return result
}

// 只有一个数字，将所有之间的未知项连起来，最后处理左右余数之外的全部标cross
export const resolveLonelyNumber = (puz, answer) => {
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
    if (col.length === 1 && col[0] > 0) {
      let startIndex = -1
      let endIndex = -1
      for (let j = 0; j < height; j++) {
        const val = answer[j][index]
        if (val === '1') {
          if (startIndex === -1) {
            startIndex = j
          }
          endIndex = j
        }
      }
      if (startIndex > -1 && endIndex > -1) {
        const exactMarkedLength = endIndex - startIndex + 1
        const notSureMarkedLength = col[0] - exactMarkedLength
        for (let j = 0; j < height; j++) {
          if (j < startIndex - notSureMarkedLength || j > endIndex + notSureMarkedLength) {
            result.push({
              x: index,
              y: j,
              value: '0'
            })
          } else if (j > startIndex && j < endIndex) {
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
    if (row.length === 1 && row[0] > 0) {
      let startIndex = -1
      let endIndex = -1
      for (let j = 0; j < width; j++) {
        const val = answer[index][j]
        if (val === '1') {
          if (startIndex === -1) {
            startIndex = j
          }
          endIndex = j
        }
      }
      if (startIndex > -1 && endIndex > -1) {
        const exactMarkedLength = endIndex - startIndex + 1
        const notSureMarkedLength = row[0] - exactMarkedLength
        for (let j = 0; j < width; j++) {
          if (j < startIndex - notSureMarkedLength || j > endIndex + notSureMarkedLength) {
            result.push({
              x: j,
              y: index,
              value: '0'
            })
          } else if (j > startIndex && j < endIndex) {
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

// TODO 下面的方法后续将废弃或改写，整合到新的根据space和marked piece进行对比方法中
// 方法根据行列内已经明确了所有的marked，或者所有待明确的全部应该是marked的情况，进行剩余的填充
export const resolveMarkedOrCrossed = (puz, answer) => {
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

// 获取谜题行的信息，包含所有出现的数字升序、所有出现的数字降序，各个数字出现的次数等
const getPuzLineInfo = (puzLine, answerLine) => {
  const ascLine = [...puzLine].sort()
  let number = undefined
  let count = 0
  const numberInfo = []
  for (let i = 0; i < ascLine.length; i++) {
    const n = ascLine[i]
    if (n !== number) {
      if (number !== undefined) {
        numberInfo.push({
          number,
          count
        })
      }
      number = n
      count = 1
    } else {
      count++
    }
  }
  if (number !== undefined) {
    numberInfo.push({
      number,
      count
    })
  }
  return {
    numberInfo,
    ascLine
  }
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

// 获取行/列信息，包含其中的所有空间spaces，标记的块markedPieces，以及已标记数量、未知数量、总数据等等
const getLineInfo = (direction, answer, index) => {
  let markedCount = 0
  let crossedCount = 0
  let unknownCount = 0
  let totalCount = 0
  const markedPieces = []
  let currentMarkedPieceFromIndex = -1
  const spaces = []
  let currentSpaceFromIndex = -1
  if (direction === 'row') {
    for (let i = 0; i < answer[index].length; i++) {
      totalCount++
      if (answer[index][i] === '1') {
        markedCount++
        if (currentMarkedPieceFromIndex === -1) {
          currentMarkedPieceFromIndex = i
        }
      } else if (answer[index][i] === '0') {
        crossedCount++
        if (currentMarkedPieceFromIndex > -1) {
          const preSiblingIndex = currentMarkedPieceFromIndex - 1
          const sufSiblingIndex = i
          const resolved = Boolean((preSiblingIndex === -1 || answer[index][preSiblingIndex] === '0') && (sufSiblingIndex === answer[index].length || answer[index][sufSiblingIndex] === '0'))
          markedPieces.push({
            fromIndex: currentMarkedPieceFromIndex,
            toIndex: i - 1,
            length: i - 1 - currentMarkedPieceFromIndex + 1,
            resolved
          })
          currentMarkedPieceFromIndex = -1
        }
        if (currentSpaceFromIndex > -1) {
          spaces.push({
            fromIndex: currentSpaceFromIndex,
            toIndex: i - 1,
            length: i - 1 - currentSpaceFromIndex + 1
          })
          currentSpaceFromIndex = -1
        }
      } else {
        unknownCount++
        if (currentMarkedPieceFromIndex > -1) {
          const preSiblingIndex = currentMarkedPieceFromIndex - 1
          const sufSiblingIndex = i
          const resolved = Boolean((preSiblingIndex === -1 || answer[index][preSiblingIndex] === '0') && (sufSiblingIndex === answer[index].length || answer[index][sufSiblingIndex] === '0'))
          markedPieces.push({
            fromIndex: currentMarkedPieceFromIndex,
            toIndex: i - 1,
            length: i - 1 - currentMarkedPieceFromIndex + 1,
            resolved
          })
          currentMarkedPieceFromIndex = -1
        }
        if (currentSpaceFromIndex === -1) {
          currentSpaceFromIndex = i
        }
      }
    }
    if (currentMarkedPieceFromIndex > -1) {
      const preSiblingIndex = currentMarkedPieceFromIndex - 1
      const sufSiblingIndex = answer[index].length
      const resolved = Boolean((preSiblingIndex === -1 || answer[index][preSiblingIndex] === '0') && (sufSiblingIndex === answer[index].length || answer[index][sufSiblingIndex] === '0'))
      markedPieces.push({
        fromIndex: currentMarkedPieceFromIndex,
        toIndex: answer[index].length - 1,
        length: answer[index].length - 1 - currentMarkedPieceFromIndex + 1,
        resolved
      })
      currentMarkedPieceFromIndex = -1
    }
    if (currentSpaceFromIndex > -1) {
      spaces.push({
        fromIndex: currentSpaceFromIndex,
        toIndex: answer[index].length - 1,
        length: answer[index].length - 1 - currentSpaceFromIndex + 1
      })
      currentSpaceFromIndex = -1
    }
  } else {
    for (let i = 0; i < answer.length; i++) {
      totalCount++
      if (answer[i][index] === '1') {
        markedCount++
        if (currentMarkedPieceFromIndex === -1) {
          currentMarkedPieceFromIndex = i
        }
      } else if (answer[i][index] === '0') {
        crossedCount++
        if (currentMarkedPieceFromIndex > -1) {
          const preSiblingIndex = currentMarkedPieceFromIndex - 1
          const sufSiblingIndex = i
          const resolved = Boolean((preSiblingIndex === -1 || answer[preSiblingIndex][index] === '0') && (sufSiblingIndex === answer.length || answer[sufSiblingIndex][index] === '0'))
          markedPieces.push({
            fromIndex: currentMarkedPieceFromIndex,
            toIndex: i - 1,
            length: i - 1 - currentMarkedPieceFromIndex + 1,
            resolved
          })
          currentMarkedPieceFromIndex = -1
        }
        if (currentSpaceFromIndex > -1) {
          spaces.push({
            fromIndex: currentSpaceFromIndex,
            toIndex: i - 1,
            length: i - 1 - currentSpaceFromIndex + 1
          })
          currentSpaceFromIndex = -1
        }
      } else {
        unknownCount++
        if (currentMarkedPieceFromIndex > -1) {
          const preSiblingIndex = currentMarkedPieceFromIndex - 1
          const sufSiblingIndex = i
          const resolved = Boolean((preSiblingIndex === -1 || answer[preSiblingIndex][index] === '0') && (sufSiblingIndex === answer.length || answer[sufSiblingIndex][index] === '0'))
          markedPieces.push({
            fromIndex: currentMarkedPieceFromIndex,
            toIndex: i - 1,
            length: i - 1 - currentMarkedPieceFromIndex + 1,
            resolved
          })
          currentMarkedPieceFromIndex = -1
        }
        if (currentSpaceFromIndex === -1) {
          currentSpaceFromIndex = i
        }
      }
    }
    if (currentMarkedPieceFromIndex > -1) {
      const preSiblingIndex = currentMarkedPieceFromIndex - 1
      const sufSiblingIndex = answer.length
      const resolved = Boolean((preSiblingIndex === -1 || answer[preSiblingIndex][index] === '0') && (sufSiblingIndex === answer.length || answer[sufSiblingIndex][index] === '0'))
      markedPieces.push({
        fromIndex: currentMarkedPieceFromIndex,
        toIndex: answer.length - 1,
        length: answer.length - 1 - currentMarkedPieceFromIndex + 1,
        resolved
      })
      currentMarkedPieceFromIndex = -1
    }
    if (currentSpaceFromIndex > -1) {
      spaces.push({
        fromIndex: currentSpaceFromIndex,
        toIndex: answer.length - 1,
        length: answer.length - 1 - currentSpaceFromIndex + 1
      })
      currentSpaceFromIndex = -1
    }
  }
  return {
    spaces,
    // [
    //   {
    //     fromIndex: 0,
    //     toIndex: 2,
    //     length: 3
    //   }
    // ]
    markedPieces,
    // [
    //   {
    //     fromIndex: 0,
    //     toIndex: 2,
    //     length: 3,
    //     resolved: false // 前后为边界或者cross的认定为已解决明确
    //   }
    // ]
    markedCount,
    crossedCount,
    unknownCount,
    totalCount
  }
}

// 获取指定行/列中下一个边界信息（cross或者左右边界）
const getLineNearBorder = (direction, answer, index, startIndex, option) => {
  const checkDirection = option?.checkDirection || 'asc'
  let borderIndex = null
  let borderType = null
  if (direction === 'row') {
    const row = answer[index]
    if (checkDirection === 'desc') {
      for (let i = startIndex - 1; i >= 0; i--) {
        const cell = row[i]
        if (cell === '0') {
          borderIndex = i
          borderType = cell
          break
        }
      }
      if (!borderIndex) {
        borderIndex = -1
        borderType = 'edge'
      }
    } else {
      for (let i = startIndex + 1; i < row.length; i++) {
        const cell = row[i]
        if (cell === '0') {
          borderIndex = i
          borderType = cell
          break
        }
      }
      if (!borderIndex) {
        borderIndex = row.length
        borderType = 'edge'
      }
    }
  } else {
    if (checkDirection === 'desc') {
      for (let i = startIndex - 1; i >= 0; i--) {
        const cell = answer[i][index]
        if (cell) {
          borderIndex = i
          borderType = cell
          break
        }
      }
      if (!borderIndex) {
        borderIndex = -1
        borderType = 'edge'
      }
    } else {
      for (let i = startIndex + 1; i < answer.length; i++) {
        const cell = answer[i][index]
        if (cell) {
          borderIndex = i
          borderType = cell
          break
        }
      }
      if (!borderIndex) {
        borderIndex = answer.length
        borderType = 'edge'
      }
    }
  }
  return {
    borderIndex,
    borderType
  }
}

// 获取指定行/列中下一个明确的格子信息
const getLineNextExactCell = (direction, answer, index, startIndex, option) => {
  const checkDirection = option?.checkDirection || 'asc'
  let exactCellIndex = null
  let exactCell = null
  if (direction === 'row') {
    const row = answer[index]
    if (checkDirection === 'desc') {
      for (let i = startIndex - 1; i >= 0; i--) {
        const cell = row[i]
        if (cell) {
          exactCellIndex = i
          exactCell = cell
          break
        }
      }
    } else {
      for (let i = startIndex + 1; i < row.length; i++) {
        const cell = row[i]
        if (cell) {
          exactCellIndex = i
          exactCell = cell
          break
        }
      }
    }
  } else {
    if (checkDirection === 'desc') {
      for (let i = startIndex - 1; i >= 0; i--) {
        const cell = answer[i][index]
        if (cell) {
          exactCellIndex = i
          exactCell = cell
          break
        }
      }
    } else {
      for (let i = startIndex + 1; i < answer.length; i++) {
        const cell = answer[i][index]
        if (cell) {
          exactCellIndex = i
          exactCell = cell
          break
        }
      }
    }
  }
  return {
    exactCellIndex,
    exactCell
  }
}

// 获取行列两边连续明确的cell信息
const getLineSideExactInfo = (direction, answer, index) => {
  let preExactCount = 0
  let preMarkedInfo = []
  let sufExactCount = 0
  let sufMarkedInfo = []
  if (direction === 'row') {
    // calc pre
    let markedCount = 0
    for (let i = 0; i < answer[index].length; i++) {
      if (answer[index][i] !== '') {
        preExactCount++
        if (answer[index][i] === '1') {
          markedCount++
        } else {
          if (markedCount) {
            preMarkedInfo.push(markedCount)
            markedCount = 0
          }
        }
      } else {
        // 结束
        if (markedCount) {
          // 需要回溯未填充完毕的连续marked
          preExactCount -= markedCount
          markedCount = 0
        }
        break
      }
    }
    // calc suf
    markedCount = 0
    for (let i = answer[index].length - 1; i >= 0; i--) {
      if (answer[index][i] !== '') {
        sufExactCount++
        if (answer[index][i] === '1') {
          markedCount++
        } else {
          if (markedCount) {
            sufMarkedInfo.unshift(markedCount)
            markedCount = 0
          }
        }
      } else {
        // 结束
        if (markedCount) {
          // 需要回溯未填充完毕的连续marked
          sufExactCount -= markedCount
          markedCount = 0
        }
        break
      }
    }
  } else {
    // calc pre
    let markedCount = 0
    for (let i = 0; i < answer.length; i++) {
      if (answer[i][index] !== '') {
        preExactCount++
        if (answer[i][index] === '1') {
          markedCount++
        } else {
          if (markedCount) {
            preMarkedInfo.push(markedCount)
            markedCount = 0
          }
        }
      } else {
        // 结束
        if (markedCount) {
          // 需要回溯未填充完毕的连续marked
          preExactCount -= markedCount
          markedCount = 0
        }
        break
      }
    }
    // calc suf
    markedCount = 0
    for (let i = answer.length - 1; i >= 0; i--) {
      if (answer[i][index] !== '') {
        sufExactCount++
        if (answer[i][index] === '1') {
          markedCount++
        } else {
          if (markedCount) {
            sufMarkedInfo.unshift(markedCount)
            markedCount = 0
          }
        }
      } else {
        // 结束
        if (markedCount) {
          // 需要回溯未填充完毕的连续marked
          sufExactCount -= markedCount
          markedCount = 0
        }
        break
      }
    }
  }
  return {
    preExactCount, // eg 5
    preMarkedInfo, // eg [1, 2]
    sufExactCount,
    sufMarkedInfo
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

export const getLineSum = (data) => {
  const numberSum = sum(data)
  return numberSum + data.length - 1
}
