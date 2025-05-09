
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
  const processLine = (direction, lines, answer, length) => {
    lines.forEach((line, index) => {
      if (!isLineClear(direction, answer, index)) {
        // line is like [5, 4]
        const { preExactCount, preMarkedInfo, sufExactCount, sufMarkedInfo } = getLineSideExactInfo(direction, answer, index)
        const fixedLine = line.slice(preMarkedInfo.length, line.length - sufMarkedInfo.length)
        const sums = sum(fixedLine)
        if (sums > 0) {
          const gapCount = fixedLine.length - 1
          const notSureCount = length - sums - gapCount - preExactCount - sufExactCount // eg. 2
          let baseLength = preExactCount
          fixedLine.forEach(l => {
            if (l > notSureCount) {
              for (let j = 0; j < l - notSureCount; j++) {
                result.push({
                  x: direction === 'row' ? baseLength + j + notSureCount : index,
                  y: direction === 'row' ? index : baseLength + j + notSureCount,
                  value: '1'
                })
              }
            }
            baseLength += l + 1
          })
        }
      }
    })
  }
  processLine('row', puz.left, answer, width)
  processLine('column', puz.top, answer, height)
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
  const processLine = (direction, lines, answer, length) => {
    lines.forEach((line, index) => {
      if (!isLineClear(direction, answer, index)) {
        const { preExactCount, preMarkedInfo, sufExactCount, sufMarkedInfo } = getLineSideExactInfo(direction, answer, index)
        let firstMarkedIndex = -1
        let lastMarkedIndex = -1
        if (direction === 'row') {
          firstMarkedIndex = answer[index].findIndex((a, i) => i >= preExactCount && a === '1')
          lastMarkedIndex = answer[index].findLastIndex((a, i) => i < answer[index].length - sufExactCount && a === '1')
        } else {
          for (let i = preExactCount; i < answer.length - sufExactCount; i++) {
            const a = answer[i][index]
            if (a === '1') {
              if (firstMarkedIndex === -1) {
                firstMarkedIndex = i
              }
              lastMarkedIndex = i
            }
          }
        }
        const fixedLine = line.slice(preMarkedInfo.length, line.length - sufMarkedInfo.length)
        if (firstMarkedIndex > -1 && fixedLine.length) {
          const exactHeadSureLength = preExactCount + fixedLine[0] - (firstMarkedIndex + 1)
          for (let i = 1; i <= exactHeadSureLength; i++) {
            // 判断首
            result.push({
              x: direction === 'row' ? firstMarkedIndex + i : index,
              y: direction === 'row' ? index : firstMarkedIndex + i,
              value: '1'
            })
          }
          if (firstMarkedIndex === 0) {
            result.push({
              x: direction === 'row' ? firstMarkedIndex + exactHeadSureLength + 1 : index,
              y: direction === 'row' ? index : firstMarkedIndex + exactHeadSureLength + 1,
              value: '0'
            })
          }
        }
        if (lastMarkedIndex > -1 && fixedLine.length > 1) {
          // 判断尾
          const exactTailSureLength = sufExactCount + fixedLine[fixedLine.length - 1] - (length - lastMarkedIndex)
          for (let i = 1; i <= exactTailSureLength; i++) {
            result.push({
              x: direction === 'row' ? lastMarkedIndex - i : index,
              y: direction === 'row' ? index : lastMarkedIndex - i,
              value: '1'
            })
          }
          if (lastMarkedIndex === length - 1) {
            result.push({
              x: direction === 'row' ? lastMarkedIndex - exactTailSureLength - 1 : index,
              y: direction === 'row' ? index : lastMarkedIndex - exactTailSureLength - 1,
              value: '0'
            })
          }
        }
      }
    })
  }
  processLine('row', puz.left, answer, width)
  processLine('column', puz.top, answer, height)
  return result
}

// 方法每次根据最大的数字已经出现的明确marked块，进行两边必定为cross的标识，直到已经明确的最大数字个数不够
export const resolveMaxNumber = (puz, answer) => {
  const width = puz.top.length
  const height = puz.left.length
  let result = [
    // {
    //   x: 0,
    //   y: 0,
    //   value: '1|0'
    // }
  ]
  const processLine = (direction, lines, answer, length) => {
    lines.forEach((line, index) => {
      if (!isLineClear(direction, answer, index)) {
        const lineInfo = getLineInfo(direction, answer, index)
        const puzInfo = getPuzLineInfo(line)
        let flagAllNumbersFound = true
        const tempResult = []
        for (let j = puzInfo.numberInfo.length - 1; j >= 0; j--) {
          // 从目前最大的数字开始检索已经明确出来的相同marked块，进行左右cross标识
          const item = puzInfo.numberInfo[j]
          let exactCount = 0
          lineInfo.markedPieces.forEach(p => {
            if (p.length === item.number) {
              exactCount++
              if (!p.resolved) {
                // 左右可以明确是cross
                if (p.fromIndex - 1 >= 0) {
                  tempResult.push({
                    x: direction === 'row' ? p.fromIndex - 1 : index,
                    y: direction === 'row' ? index : p.fromIndex - 1,
                    value: '0'
                  })
                }
                if (p.toIndex + 1 < length) {
                  tempResult.push({
                    x: direction === 'row' ? p.toIndex + 1 : index,
                    y: direction === 'row' ? index : p.toIndex + 1,
                    value: '0'
                  })
                }
              }
            }
          })
          if (exactCount >= item.count) {
            // 目前最大数字出现的明确数量已达标，继续往下一个最大的数字进行推理
            if (exactCount > item.count) {
              console.warn(`Invalid ${direction} ${index}, number ${item.number} should appear ${item.count} times but found ${exactCount}`)
            }
          } else {
            // 目前最大数字出现的明确数量不足，不再往下推理
            flagAllNumbersFound = false
            break
          }
        }
        if (flagAllNumbersFound) {
          // 所有当前行列的数字都已经出现，把所有还没标识的格子全部标识为cross
          for (let i = 0; i < length; i++) {
            let item
            if (direction === 'row') {
              item = answer[index][i]
            } else {
              item = answer[i][index]
            }
            if (!item) {
              result.push({
                x: direction === 'row' ? i : index,
                y: direction === 'row' ? index : i,
                value: '0'
              })
            }
          }
        } else {
          // 正常推理出了部分内容，将内容推入result
          result = [...result, ...tempResult]
        }
        // const maxNumber = Math.max(...line)
        // let firstMarkedIndex = -1
        // let combinedMarks = 0
        // for (let i = 0; i < length; i++) {
        //   let item
        //   if (direction === 'row') {
        //     item = answer[index][i]
        //   } else {
        //     item = answer[i][index]
        //   }
        //   if (item === '1') {
        //     combinedMarks === 0 && (firstMarkedIndex = i)
        //     combinedMarks++
        //   } else {
        //     if (combinedMarks >= maxNumber) {
        //       if (combinedMarks > maxNumber) {
        //         console.warn(`Invalid answer in ${direction}, ${index}, maxNumber is ${maxNumber} but found ${combinedMarks}`)
        //       }
        //       if (firstMarkedIndex > 0) {
        //         result.push({
        //           x: direction === 'row' ? firstMarkedIndex - 1 : index,
        //           y: direction === 'row' ? index : firstMarkedIndex - 1,
        //           value: '0'
        //         })
        //       }
        //       result.push({
        //         x: direction === 'row' ? i : index,
        //         y: direction === 'row' ? index : i,
        //         value: '0'
        //       })
        //     }
        //     firstMarkedIndex = -1
        //     combinedMarks = 0
        //   }
        // }
      }
    })
  }
  processLine('row', puz.left, answer, width)
  processLine('column', puz.top, answer, height)
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
  const processLine = (direction, lines, answer) => {
    lines.forEach((line, index) => {
      if (!isLineClear(direction, answer, index)) {
        const { numberInfo } = getPuzLineInfo(line)
        const ascNumbers = numberInfo.map(n => n.number)
        const lineInfo = getLineInfo(direction, answer, index)
        const unresolvedMarkedPieces = lineInfo.markedPieces.filter(m => !m.resolved)
        unresolvedMarkedPieces.forEach(p => {
          const preBorder = getLineNearBorder(direction, answer, index, p.fromIndex, {
            checkDirection: 'desc'
          })
          const sufBorder = getLineNearBorder(direction, answer, index, p.toIndex, {
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
                  x: direction === 'row' ? p.toIndex + i : index,
                  y: direction === 'row' ? index : p.toIndex + i,
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
                  x: direction === 'row' ? p.fromIndex - i : index,
                  y: direction === 'row' ? index : p.fromIndex - i,
                  value: '1'
                })
              }
            }
          }
        })
      }
    })
  }
  processLine('row', puz.left, answer)
  processLine('column', puz.top, answer)
  return result
}

// TODO 可以移除？
// 方法根据单个未知格子分隔开的两块marked，尝试判断是否是一个合法的连续完整块。如果连起来的长度超过最大数字，则为非法。该未知格子必定是cross
export const resolveSplitMarkedPieces = (puz, answer) => {
  const result = [
    // {
    //   x: 0,
    //   y: 0,
    //   value: '1|0'
    // }
  ]
  const processLine = (direction, lines, answer) => {
    lines.forEach((line, index) => {
      // line is like [4, 1, 2]
      if (!isLineClear(direction, answer, index)) {
        const maxNumber = Math.max(...line)
        const lineInfo = getLineInfo(direction, answer, index)
        if (lineInfo.markedPieces && lineInfo.markedPieces.length > 1) {
          for (let i = 0; i < lineInfo.markedPieces.length - 1; i++) {
            const markedPiece = lineInfo.markedPieces[i]
            const nextMarkedPiece = lineInfo.markedPieces[i + 1]
            if (!markedPiece.resolved && !nextMarkedPiece.resolved && (nextMarkedPiece.fromIndex - markedPiece.toIndex) === 2 && (nextMarkedPiece.toIndex - markedPiece.fromIndex + 1) > maxNumber) {
              result.push({
                x: direction === 'row' ? markedPiece.toIndex + 1 : index,
                y: direction === 'row' ? index : markedPiece.toIndex + 1,
                value: '0'
              })
            }
          }
        }
      }
    })
  }
  processLine('row', puz.left, answer)
  processLine('column', puz.top, answer)
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
  const processLine = (direction, lines, answer, length) => {
    lines.forEach((line, index) => {
      // line is like [4, 1, 2]
      if (line.length > 1 && !isLineClear(direction, answer, index)) {
        const preSideNumber = line[0]
        const sufSideNumber = line[line.length - 1]
        if (preSideNumber > 1) {
          let preSideSpace = length
          let firstUnknownIndex = -1
          let combinedUnknowns = 0
          for (let i = 0; i < length; i++) {
            let item
            if (direction === 'row') {
              item = answer[index][i]
            } else {
              item = answer[i][index]
            }
            if (item === '') {
              // 碰到未知格子，累计space
              combinedUnknowns === 0 && (firstUnknownIndex = i)
              combinedUnknowns++
            } else if (item === '0') {
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
                x: direction === 'row' ? i : index,
                y: direction === 'row' ? index : i,
                value: '0'
              })
            }
          }
        }
        if (sufSideNumber > 1) {
          let sufSideSpace = length
          let firstUnknownIndex = -1
          let combinedUnknowns = 0
          for (let i = length - 1; i >= 0; i--) {
            let item
            if (direction === 'row') {
              item = answer[index][i]
            } else {
              item = answer[i][index]
            }
            if (item === '') {
              // 碰到未知格子，累计space
              combinedUnknowns === 0 && (firstUnknownIndex = i)
              combinedUnknowns++
            } else if (item === '0') {
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
                x: direction === 'row' ? i : index,
                y: direction === 'row' ? index : i,
                value: '0'
              })
            }
          }
        }
      }
    })
  }
  processLine('row', puz.left, answer, width)
  processLine('column', puz.top, answer, height)
  return result
}

// 方法根据还未填充完成的空间大小，比对最小的未解决数字，如果空间不够填充最小的未解决数字，则此空间中的全部格子都应该是cross
// 方法还根据假如当前只剩一个未解决的marked块，将其不在的未填充空间全部标记cross，另外对其左右延展边缘之外的区域进行cross标记
// 方法还根据当前未解决明确的最大数字个数，寻找未填充完成的空间里面能放置下最大数字且不能放置下2个最大数字的空间个数，如果满足放置条件的空间个数小于等于当前未明确的最大数字个数，则说明这些满足放置条件的空间中都有一个此最大数字
export const resolveSmallSpace = (puz, answer) => {
  let result = [
    // {
    //   x: 0,
    //   y: 0,
    //   value: '1|0'
    // }
  ]
  // 方法根据还未填充完成的空间大小，比对最小的未解决数字，如果空间不够填充最小的未解决数字，则此空间中的全部格子都应该是cross
  const inspectMethod1 = (direction, index, puzInfo, lineInfo) => {
    const partResult = []
    let minUnresolvedNumber = puzInfo.numberInfo[0].number
    for (let j = 0; j < puzInfo.numberInfo.length; j++) {
      // 从目前最小的数字找起，如果全部找到明确的marked块，则继续找下一个
      const item = puzInfo.numberInfo[j]
      let exactCount = 0
      lineInfo.markedPieces.forEach(p => {
        if (p.resolved && p.length === item.number) {
          exactCount++
        }
      })
      if (exactCount < item.count) {
        // 当前最小数字未找全所有明确的块
        minUnresolvedNumber = item.number
        break
      }
    }
    // 检查所有未填充完成的空间，如果空间大小比目前最小数字还小，则此空间中全部应该填充cross
    lineInfo.spaces.forEach(s => {
      if (!s.filled && s.length < minUnresolvedNumber) {
        for (let k = s.fromIndex; k <= s.toIndex; k++) {
          partResult.push({
            x: direction === 'row' ? k : index,
            y: direction === 'row' ? index : k,
            value: '0'
          })
        }
      }
    })
    return partResult
  }
  // 方法根据假如当前只剩一个未解决的marked块，将其不在的未填充空间全部标记cross，另外对其左右延展边缘之外的区域进行cross标记
  const inspectMethod2 = (direction, index, puzInfo, lineInfo) => {
    const partResult = []
    let unresolvedMarkedPieceCount = 0
    let lastUnresolvedMarkedPiece = null
    const toResolveNumber = puzInfo.numberInfo.map(item => {
      return {
        number: item.number,
        leftCount: item.count
      }
    })
    lineInfo.markedPieces.forEach(p => {
      if (p.resolved) {
        // 已解决的marked块，处理待处理的统计数据
        const targetIndex = toResolveNumber.findIndex(t => t.number === p.length)
        if (targetIndex > -1) {
          const toResolveItem = toResolveNumber[targetIndex]
          toResolveItem.leftCount--
          if (toResolveItem.leftCount <= 0) {
            toResolveNumber.splice(targetIndex, 1)
          }
        }
      } else {
        unresolvedMarkedPieceCount++
        lastUnresolvedMarkedPiece = p
      }
    })
    if (unresolvedMarkedPieceCount === 1 && toResolveNumber.length === 1 && toResolveNumber[0].leftCount === 1) {
      // 未解决的marked块只剩1个，且待解决的marked块只剩1个
      const lastNumber = toResolveNumber[0].number
      const exactLength = lastUnresolvedMarkedPiece.length
      const unknownLength = lastNumber - exactLength
      // 根据目前已经明确的，确定左右的极限位置
      const preBoundIndex = lastUnresolvedMarkedPiece.fromIndex - unknownLength
      const sufBoundIndex = lastUnresolvedMarkedPiece.toIndex + unknownLength
      lineInfo.spaces.forEach(s => {
        if (!s.filled) {
          if (lastUnresolvedMarkedPiece.fromIndex >= s.fromIndex && lastUnresolvedMarkedPiece.toIndex <= s.toIndex) {
            // 未解决的marked块所处的空间
            // 计算左右的侵入空间大小，从而确定右左应该补充marked的空间
            let preEncroachLength = s.fromIndex - preBoundIndex
            let sufEncroachLength = sufBoundIndex - s.toIndex
            // 左右侵入空间的长度，如果小于0，则表示没有侵入空间
            preEncroachLength = preEncroachLength > 0 ? preEncroachLength : 0
            sufEncroachLength = sufEncroachLength > 0 ? sufEncroachLength : 0
            for (let k = s.fromIndex; k <= s.toIndex; k++) {
              if (k < preBoundIndex || k > sufBoundIndex) {
                // 已经明确的格子左右延展的极限边缘之外的格子，必定是cross
                partResult.push({
                  x: direction === 'row' ? k : index,
                  y: direction === 'row' ? index : k,
                  value: '0'
                })
              } else if (k > lastUnresolvedMarkedPiece.toIndex && k <= lastUnresolvedMarkedPiece.toIndex + preEncroachLength) {
                // 未解决的marked块右侧的侵入空间，全部标记marked
                partResult.push({
                  x: direction === 'row' ? k : index,
                  y: direction === 'row' ? index : k,
                  value: '1'
                })
              } else if (k >= lastUnresolvedMarkedPiece.fromIndex - sufEncroachLength && k < lastUnresolvedMarkedPiece.fromIndex) {
                // 未解决的marked块左侧的侵入空间，全部标记marked
                partResult.push({
                  x: direction === 'row' ? k : index,
                  y: direction === 'row' ? index : k,
                  value: '1'
                })
              }
            }
          } else {
            // 未解决的marked块不在的空间，全部标记cross
            for (let k = s.fromIndex; k <= s.toIndex; k++) {
              partResult.push({
                x: direction === 'row' ? k : index,
                y: direction === 'row' ? index : k,
                value: '0'
              })
            }
          }
        }
      })
    }
    return partResult
  }
  // 方法根据当前未解决明确的最大数字个数，寻找未填充完成的空间里面能放置下最大数字且不能放置下2个最大数字的空间个数，如果满足放置条件的空间个数小于等于当前未明确的最大数字个数，则说明这些满足放置条件的空间中都有一个此最大数字
  const inspectMethod3 = (direction, index, puzInfo, lineInfo) => {
    const partResult = []
    // 先确定目前未解决的明确的最大数字信息
    const toResolveNumber = puzInfo.numberInfo.map(item => {
      return {
        number: item.number,
        leftCount: item.count
      }
    })
    lineInfo.markedPieces.forEach(p => {
      if (p.resolved) {
        // 已解决的marked块，处理待处理的统计数据
        const targetIndex = toResolveNumber.findIndex(t => t.number === p.length)
        if (targetIndex > -1) {
          const toResolveItem = toResolveNumber[targetIndex]
          toResolveItem.leftCount--
          if (toResolveItem.leftCount <= 0) {
            toResolveNumber.splice(targetIndex, 1)
          }
        }
      }
    })
    if (toResolveNumber.length) {
      const maxToResolveNumber = toResolveNumber[toResolveNumber.length - 1]
      if (lineInfo.spaces.find(s => !s.filled && s.length > 2 * maxToResolveNumber.number)) {
        // 当前有存在一个能放多个最大数字的空间，可能性太多，放弃此算法
      } else {
        // 再确定目前符合条件的空间信息
        const validSpaces = lineInfo.spaces.filter((s) => !s.filled && s.length >= maxToResolveNumber.number && s.length < 2 * maxToResolveNumber.number + 1)
        if (validSpaces.length <= maxToResolveNumber.leftCount) {
          // 符合条件的空间个数小于等于当前未明确的最大数字个数，则说明这些满足放置条件的空间中都有一个此最大数字
          validSpaces.forEach(s => {
            const notSureLength = s.length - maxToResolveNumber.number
            const sureLength = maxToResolveNumber.number - notSureLength
            if (sureLength > 0) {
              for (let k = 0; k < sureLength; k++) {
                partResult.push({
                  x: direction === 'row' ? s.fromIndex + notSureLength + k : index,
                  y: direction === 'row' ? index : s.fromIndex + notSureLength + k,
                  value: '1'
                })
              }
            }
          })
        }
      }
    }
    return partResult
  }
  const processLine = (direction, lines, answer) => {
    lines.forEach((line, index) => {
      // line is like [4, 1, 2]
      if (!isLineClear(direction, answer, index)) {
        const lineInfo = getLineInfo(direction, answer, index)
        const puzInfo = getPuzLineInfo(line)
        const r1 = inspectMethod1(direction, index, puzInfo, lineInfo)
        const r2 = inspectMethod2(direction, index, puzInfo, lineInfo)
        const r3 = inspectMethod3(direction, index, puzInfo, lineInfo)
        result = [...result, ...concatAnswers([...r1, ...r2, ...r3])]
      }
    })
  }
  processLine('row', puz.left, answer)
  processLine('column', puz.top, answer)
  return result
}

// 方法根据两个相邻的未解决块，如果相邻块之间只有一个未知格子，则判断两个相邻块合并之后是否超过未解决数字的最大值。如果非法则将此未知格子标记为cross
// 方法根据某行/列未解决的marked块只有2个，且未解决的数字只剩1个，则尝试合并连接这2个块，如果合并连接之后的新完整块长度小于等于未解决的最后一个数字，则说明2个未解决的marked块中间的所有未知格子都应该是'1'。此时如果新完整块正好等于最后一个数字，则说明所有块都已经找到并明确，应当把其他剩余的未知格子全部标记'0'。如果此时新完整块还不足最后一个数字，例如新完整块是3，最后一个未解决数字是4，则说明连接之后的完整块左右两个格子是不确定的未知格子''，而其他的未知格子都应该标记'0'
export const resolveAdjacentBlocks = (puz, answer) => {
  const result = []
  const { top: colClues, left: rowClues } = puz
  const width = colClues.length
  const height = rowClues.length

  // 处理行和列的统一逻辑
  const process = (direction, clues) => {
    for (let index = 0; index < clues.length; index++) {
      const lineInfo = getLineInfo(direction, answer, index)
      const unsolvedNumbers = getUnsolvedNumbers(clues[index], lineInfo.markedPieces)
      const unresolvedPieces = lineInfo.markedPieces.filter(p => !p.resolved)

      /* 两个未解决块 + 一个未解决数字 */
      if (unsolvedNumbers.length === 1 && unresolvedPieces.length === 2) {
        const [current, next] = unresolvedPieces
        const gap = next.fromIndex - current.toIndex - 1
        const mergedLength = current.length + gap + next.length
        const target = unsolvedNumbers[0]

        // 验证间隙全部为未知格子
        let canMerge = true
        for (let i = current.toIndex + 1; i < next.fromIndex; i++) {
          const val = direction === 'row' ? answer[index][i] : answer[i][index]
          if (val !== '') {
            canMerge = false
            break
          }
        }

        if (canMerge) {
          // 场景1：合并后长度正好匹配
          if (mergedLength === target) {
            // 填充间隙为1
            for (let i = current.toIndex + 1; i < next.fromIndex; i++) {
              result.push({
                x: direction === 'row' ? i : index,
                y: direction === 'row' ? index : i,
                value: '1'
              })
            }
            // 标记其他未知为0
            const lineLength = direction === 'row' ? width : height
            for (let i = 0; i < lineLength; i++) {
              const val = direction === 'row' ? answer[index][i] : answer[i][index]
              if (val === '' && (i < current.fromIndex || i > next.toIndex)) {
                result.push({
                  x: direction === 'row' ? i : index,
                  y: direction === 'row' ? index : i,
                  value: '0'
                })
              }
            }
          }
          // 场景2：合并后长度不足
          else if (mergedLength < target) {
            // 填充间隙为1
            for (let i = current.toIndex + 1; i < next.fromIndex; i++) {
              result.push({
                x: direction === 'row' ? i : index,
                y: direction === 'row' ? index : i,
                value: '1'
              })
            }
            // 计算需要保留的扩展边界
            const extendSize = target - mergedLength
            const leftBound = current.fromIndex - extendSize
            const rightBound = next.toIndex + extendSize
            // 标记远端未知为0
            const lineLength = direction === 'row' ? width : height
            for (let i = 0; i < lineLength; i++) {
              const val = direction === 'row' ? answer[index][i] : answer[i][index]
              if (val === '' && (i < leftBound || i > rightBound)) {
                result.push({
                  x: direction === 'row' ? i : index,
                  y: direction === 'row' ? index : i,
                  value: '0'
                })
              }
            }
          }
        }
      }

      // 寻找需要处理的相邻块
      for (let i = 0; i < lineInfo.markedPieces.length - 1; i++) {
        const current = lineInfo.markedPieces[i]
        const next = lineInfo.markedPieces[i + 1]

        // 仅处理未解决的相邻块
        if (!current.resolved && !next.resolved) {
          const gap = next.fromIndex - current.toIndex - 1

          // 当间隔正好为1个未知格子时
          if (gap === 1) {
            const gapIndex = current.toIndex + 1

            // 验证间隔格确实未知（空字符串）
            const cellValue = direction === 'row'
              ? answer[index][gapIndex]
              : answer[gapIndex][index]

            if (cellValue === '') {
              // 计算合并后的总长度（包含间隔）
              const mergedLength = current.length + 1 + next.length

              // 检查是否超过未解决数字的最大值
              const maxUnsolved = unsolvedNumbers.length > 0
                ? Math.max(...unsolvedNumbers)
                : 0

              if (mergedLength > maxUnsolved) {
                // 标记间隔格为0
                const coord = direction === 'row'
                  ? { x: gapIndex, y: index }
                  : { x: index, y: gapIndex }

                result.push({ ...coord, value: '0' })
              }
            }
          }
        }
      }
    }
  }

  // 处理所有行
  process('row', rowClues)
  // 处理所有列
  process('column', colClues)

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
  const processLine = (direction, lines, answer, length) => {
    lines.forEach((line, index) => {
      // line is like [4, 1, 2]
      if (line.length === 1 && line[0] > 0) {
        let startIndex = -1
        let endIndex = -1
        for (let j = 0; j < length; j++) {
          let val
          if (direction === 'row') {
            val = answer[index][j]
          } else {
            val = answer[j][index]
          }
          if (val === '1') {
            if (startIndex === -1) {
              startIndex = j
            }
            endIndex = j
          }
        }
        if (startIndex > -1 && endIndex > -1) {
          const exactMarkedLength = endIndex - startIndex + 1
          const notSureMarkedLength = line[0] - exactMarkedLength
          for (let j = 0; j < length; j++) {
            if (j < startIndex - notSureMarkedLength || j > endIndex + notSureMarkedLength) {
              result.push({
                x: direction === 'row' ? j : index,
                y: direction === 'row' ? index : j,
                value: '0'
              })
            } else if (j > startIndex && j < endIndex) {
              result.push({
                x: direction === 'row' ? j : index,
                y: direction === 'row' ? index : j,
                value: '1'
              })
            }
          }
        }
      }
    })
  }
  processLine('row', puz.left, answer, width)
  processLine('column', puz.top, answer, height)
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
  const ascLine = [...puzLine].sort((a, b) => a - b)
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
  const width = answer[0].length
  const height = answer.length
  let markedCount = 0
  let crossedCount = 0
  let unknownCount = 0
  let totalCount = 0
  const markedPieces = []
  let currentMarkedPieceFromIndex = -1
  const spaces = []
  let currentSpaceFromIndex = -1
  let currentSpaceFilled = true // 当前space是否全部填充了内容（即中间填充了marked）
  const processLine = (direction, answer, index, length) => {
    for (let i = 0; i < length; i++) {
      totalCount++
      let item
      if (direction === 'row') {
        item = answer[index][i]
      } else {
        item = answer[i][index]
      }
      if (item === '1') {
        markedCount++
        if (currentMarkedPieceFromIndex === -1) {
          currentMarkedPieceFromIndex = i
        }
        if (currentSpaceFromIndex === -1) {
          currentSpaceFromIndex = i
        }
      } else if (item === '0') {
        crossedCount++
        if (currentMarkedPieceFromIndex > -1) {
          const preSiblingIndex = currentMarkedPieceFromIndex - 1
          const sufSiblingIndex = i
          let resolved
          if (direction === 'row') {
            resolved = Boolean((preSiblingIndex === -1 || answer[index][preSiblingIndex] === '0') && (sufSiblingIndex === length || answer[index][sufSiblingIndex] === '0'))
          } else {
            resolved = Boolean((preSiblingIndex === -1 || answer[preSiblingIndex][index] === '0') && (sufSiblingIndex === length || answer[sufSiblingIndex][index] === '0'))
          }
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
            length: i - 1 - currentSpaceFromIndex + 1,
            filled: currentSpaceFilled
          })
          currentSpaceFromIndex = -1
          currentSpaceFilled = true
        }
      } else {
        unknownCount++
        if (currentMarkedPieceFromIndex > -1) {
          const preSiblingIndex = currentMarkedPieceFromIndex - 1
          const sufSiblingIndex = i
          let resolved
          if (direction === 'row') {
            resolved = Boolean((preSiblingIndex === -1 || answer[index][preSiblingIndex] === '0') && (sufSiblingIndex === length || answer[index][sufSiblingIndex] === '0'))
          } else {
            resolved = Boolean((preSiblingIndex === -1 || answer[preSiblingIndex][index] === '0') && (sufSiblingIndex === length || answer[sufSiblingIndex][index] === '0'))
          }
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
        currentSpaceFilled = false
      }
    }
    if (currentMarkedPieceFromIndex > -1) {
      const preSiblingIndex = currentMarkedPieceFromIndex - 1
      const sufSiblingIndex = length
      let resolved
      if (direction === 'row') {
        resolved = Boolean((preSiblingIndex === -1 || answer[index][preSiblingIndex] === '0') && (sufSiblingIndex === length || answer[index][sufSiblingIndex] === '0'))
      } else {
        resolved = Boolean((preSiblingIndex === -1 || answer[preSiblingIndex][index] === '0') && (sufSiblingIndex === length || answer[sufSiblingIndex][index] === '0'))
      }
      markedPieces.push({
        fromIndex: currentMarkedPieceFromIndex,
        toIndex: length - 1,
        length: length - 1 - currentMarkedPieceFromIndex + 1,
        resolved
      })
      currentMarkedPieceFromIndex = -1
    }
    if (currentSpaceFromIndex > -1) {
      spaces.push({
        fromIndex: currentSpaceFromIndex,
        toIndex: length - 1,
        length: length - 1 - currentSpaceFromIndex + 1,
        filled: currentSpaceFilled
      })
      currentSpaceFromIndex = -1
      currentSpaceFilled = true
    }
  }
  processLine(direction, answer, index, direction === 'row' ? width : height)
  return {
    spaces,
    // [
    //   {
    //     fromIndex: 0,
    //     toIndex: 2,
    //     length: 3,
    //     filled: true, // 当前space是否全部被填充完毕
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

// 辅助方法：获取未解决的线索数字
const getUnsolvedNumbers = (clueNumbers, markedPieces) => {
  const solvedLengths = markedPieces
    .filter(p => p.resolved)
    .map(p => p.length)

  // 深拷贝原始数字并过滤已解决的
  const unsolved = [...clueNumbers]
  for (const len of solvedLengths) {
    const index = unsolved.indexOf(len)
    if (index > -1) unsolved.splice(index, 1)
  }

  return unsolved.length > 0 ? unsolved : [...clueNumbers]
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
      for (let i = startIndex + 1; i < answer.length; i++) {
        const cell = answer[i][index]
        if (cell === '0') {
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

// 整合所有的answer，剔除重复项
const concatAnswers = (raw) => {
  // {
  //   x: 0,
  //   y: 0,
  //   value: '1|0'
  // }
  const exists = [] // 存储格式为`${x}-${y}`，从而确保判断重复很方便
  const fixed = []
  raw.forEach(item => {
    const key = `${item.x}-${item.y}`
    if (exists.indexOf(key) === -1) {
      exists.push(key)
      fixed.push(item)
    }
  })
  return fixed
}

export const checkAnswerSheet = (puz, answer) => {
  let correctFlag = true
  const checkLine = (direction, lines, answer) => {
    lines.forEach((line, index) => {
      if (isLineClear(direction, answer, index)) {
        const lineInfo = getLineInfo(direction, answer, index)
        if (line[0] !== 0) {
          if (lineInfo.markedPieces.length !== line.length) {
            correctFlag = false
            console.error('错误行列', direction, '索引：', index, '错误原因：marked块数量不相等')
          } else if (lineInfo.markedPieces.length === line.length) {
            for (let j = 0; j < line.length; j++) {
              const n = line[j]
              if (n !== lineInfo.markedPieces[j].length) {
                correctFlag = false
                console.error('错误行列', direction, '索引：', index, `错误原因：索引${j}的数字标记不正确`)
                break
              }
            }
          }
        } else {
          if (lineInfo.markedPieces.length) {
            correctFlag = false
            console.error('错误行列', direction, '索引：', index, '错误原因：不应该出现任何marked格子')
          }
        }
      } else {
        correctFlag = false
      }
    })
  }
  checkLine('row', puz.left, answer)
  checkLine('column', puz.top, answer)
  return correctFlag
}

export const compareHumanAndAi = (humanAnswer, aiAnswer) => {
  const result = {
    aiFaults: [ // ai推理错误的结果，即人工和AI都有推理结果，但是AI推理错误
      // {
      //   rowIndex: 0,
      //   colIndex: 0,
      //   aiValue: '1'
      // }
    ],
    aiPros: [ // ai推理出结果，人工未推理出
      // {
      //   rowIndex: 0,
      //   colIndex: 0,
      //   aiValue: '1'
      // }
    ],
    aiCons: [ // ai未推理出结果，人工推理出
      // {
      //   rowIndex: 0,
      //   colIndex: 0,
      //   humanValue: '1'
      // }
    ]
  }
  humanAnswer.forEach((row, i) => {
    row.forEach((cell, j) => {
      const aiCell = aiAnswer[i][j]
      if (cell !== aiCell) {
        if (cell && aiCell) {
          result.aiFaults.push({
            rowIndex: i,
            colIndex: j,
            aiValue: aiCell
          })
        } else if (cell) {
          result.aiCons.push({
            rowIndex: i,
            colIndex: j,
            humanValue: cell
          })
        } else if (aiCell) {
          result.aiPros.push({
            rowIndex: i,
            colIndex: j,
            aiValue: aiCell
          })
        }
      }
    })
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
    return total + parseInt(val, 10)
  }, 0)
}

export const getLineSum = (data) => {
  const numberSum = sum(data)
  return numberSum + data.length - 1
}
