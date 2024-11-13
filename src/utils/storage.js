
export const clearStorage = (key = 'snapshot') => {
  window.localStorage.removeItem(key)
}

export const addToStorage = (newData, offset = 0) => {
  let data = JSON.parse(window.localStorage.getItem('snapshot') || '[]')
  if (data.length) {
    data = data.slice(0, data.length + offset)
  }
  data.push({
    answerMap: newData,
    timestamp: (new Date()).getTime()
  })
  window.localStorage.setItem('snapshot', JSON.stringify(data))
  return {
    result: true,
    length: data.length
  }
}

export const getStorageByOffset = (offset) => {
  const data = JSON.parse(window.localStorage.getItem('snapshot'))
  const index = data.length - 1 + offset
  return data[index].answerMap
}

export const saveCopy = (newData) => {
  const data = [{
    puz: newData.puz,
    answerMap: newData.answerMap,
    name: newData.name || '',
    timestamp: (new Date()).getTime()
  }]
  window.localStorage.setItem('userSave', JSON.stringify(data))
}

export const getSavedCopy = () => {
  const data = JSON.parse(window.localStorage.getItem('userSave') || '[]')
  if (data.length) {
    return data[0]
  } else {
    return null
  }
}

export const savePreset = (newContent) => {
  let data = JSON.parse(window.localStorage.getItem('userPreset') || '{}')
  data = Object.assign({}, data, newContent)
  window.localStorage.setItem('userPreset', JSON.stringify(data))
}

export const getPreset = () => {
  const data = JSON.parse(window.localStorage.getItem('userPreset') || '{}')
  return data
}