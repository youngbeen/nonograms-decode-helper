// NOTE 这个语音识别方案会走云端交换数据识别，网络不通
let recognition = null

export const startRecording = () => {
  if (!recognition) {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)()
    recognition.lang = 'zh-CN' // 设置中文语言
    recognition.continuous = false // 单次识别模式
    recognition.interimResults = false // 不显示临时结果
    // recognition.grammars = new SpeechGrammarList()
    // const grammar = '#JSGF V1.0; grammar numbers; public <number> = 零 | 幺 | 一 | 二 | 三 | 四 | 五 | 六 | 七 | 八 | 九 | 十 | 百 | 千 | 万 | 亿 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;'
    // recognition.grammars.addFromString(grammar, 1)

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      const numbers = transcript.replace(/[^零幺一二三四五六七八九十百千万亿0-9]/g, '') // 过滤非数字内容
      console.log('识别结果', numbers)
    }

    recognition.onerror = (event) => {
      console.error('识别错误:', event.error)
      if (event.error === 'not-allowed') alert('请启用麦克风权限')
    }
    recognition.onend = () => console.log('识别结束')
  }
  recognition.start()
}



