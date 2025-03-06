// 灰度化 & 二值化图片内容，使其更容易识别
export const optimizeImage = (imageData) => {
  // 计算平均亮度
  const avg = getAverageBrightness(imageData)
  // 动态选择阈值
  const threshold = getThreshold(avg)
  applyThreshold(imageData, threshold)
}

const getAverageBrightness = (imageData) => {
  let sum = 0
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    sum += 0.299 * r + 0.587 * g + 0.114 * b // 加权灰度公式
  }
  return sum / (data.length / 4) // 返回0-255的平均值
}

const getThreshold = (avg) => {
  // 根据图片亮度设置合适的阈值
  // NOTE
  // 深色 左60~70 上52调大？
  // 浅色 左84未测 上84未测
  // avg越小，图片越暗
  console.log('图片平均亮度', avg)
  if (avg < 80) return 44
  if (avg < 100) return 56
  if (avg < 120) return 70 // 无场景，未调试
  if (avg < 140) return 70 // 无场景，未调试
  return 84
}

// 二值化应用
const applyThreshold = (imageData, threshold) => {
  console.log('使用二值化阈值', threshold)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    // const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
    const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    const binary = brightness > threshold ? 255 : 0
    data[i] = data[i + 1] = data[i + 2] = binary
  }
}