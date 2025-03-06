# nonograms-decode-helper

A helper to assist you to decode complicate nonograms puzzles.

This helper ONLY makes stead resolving, all resolvings are 100% correct, helper will NOT make resolving by guessing or possiblities. Meanwhile, this helper doesn't contain an AI.

All resolving stratages are based on my personal skills and methods. I coded all these into this program.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## Shortcuts

To provide a comfortable UE, nonograms helper supports several shortcuts as below:

### `r` for Repeat input content

Whenever input a puzzle, press `r` will show your last input content in current input box. Press `r` again will show another previews input content, ect.

### `blank space` for Resovle

If you are in decoding state, whenever press `blank space` will trigger auto resolving action. Nonograms helper will only stop until it cannot resolve anymore new cells.

### `F1`~`F10` for `11`~`20` content

Whenever input a puzzle, press `F1`~`F10` will add `1-1`~`2-0` content into current input box. Which stands for number `11`~`20`.

## Notes

### OCR识别方案

目前使用的是tesseract，经过算法调优，左侧识别准确率大概能达到90%以上。上侧的识别准确率稍低，大概能达到75%。

这个OCR识别方案的唯一缺点是使用的依赖比较大，单从网络上下载需要几十M，通过github公网走就更头疼，目前只能在本地环境玩。

因为依赖比较大，使用的时候需要把以下几个文件复制到public目录下方便调用。

```
tesseract-core-simd-lstm.wasm
tesseract-core-simd-lstm.wasm.js
tesseract-core-simd.wasm
tesseract-core-simd.wasm.js
tesseract-core.wasm
tesseract-core.wasm.js
```

```shell
# 使用下面的命令
cp node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm public/ && cp node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js public/ && cp node_modules/tesseract.js-core/tesseract-core-simd.wasm public/ && cp node_modules/tesseract.js-core/tesseract-core-simd.wasm.js public/ && cp node_modules/tesseract.js-core/tesseract-core.wasm public/ && cp node_modules/tesseract.js-core/tesseract-core.wasm.js public/
```

### 快速录入

在识别辅助解谜之前，最重要的工作就是录入谜题。录入复杂的谜题常规情况下会耗费大量时间，且手工录入容易出错。

最优的快速录入方案毋庸置疑是OCR识别，但目前找到纯前端的OCR方案唯一的缺陷就是依赖大。如果不能跑本地环境，只能现实一点，先从事实进行优化。

录入的内容主要包含数字，分隔。经过分析，快速录入的核心在于如何处理以下关键：

1. 大量的分隔，例如`1 1 1 1 1 1 1`
2. 连续重复出现的数字，例如`1 1 1 1 2`
3. 重复出现相同/相似内容
4. 夹杂的大数字，例如`1 13 1 2`

快速录入的设计目标是快速、符合常识、一致

#### 大量分隔的处理

经过分析，常规情况下，数字之间的分隔是除数字之外，最高频率出现的内容。不管录入的是空格还是其他任何符号分隔符，都无法避免高频率敲击按键的尴尬。

所以，处理这个问题的最好方案就是完全不用录入分隔符，让程序自动分隔。

（这个方案能延长键盘的寿命，而且不会让你表现得像一个鬼畜发作的中二少年）

#### 连续重复出现的数字

录入时，经常会碰到类似`1 1 1 1 1 1`、`1 1 1 1 3`之类的内容。需要连续按6次1，连续按4次1，再按一次3好像也没太大问题。

但是感觉很不方便，特别是在连续重复的数字很多的情况下，少录/多录的情况就比较容易出现了。（等等，我刚录入了几个？）

当前的方案是，支持`m*n`录入形式。代表连续n个数字m。例如上述例如可以改为录入`1*6`以及`1*43`。（注意，并不是43个1，因为程序会自动分隔所有数字）

同时，你可以用`ctrl` + `1`~`9` 来快速录入`1*1`~`1*9`。

（这个方案进一步延长了键盘的寿命，太好了）

#### 重复出现相同/相似内容

录入的时候，有时会碰到这种情况。刚刚录入了一些内容，接下来要录入的内容和刚刚/之前的内容相同或者相似。假如这个内容很长，又需要录入一遍。

当前的方案是，程序自动记录最近的3次录入内容。可以通过`r`按键来切换历史的录入内容。历史录入内容会自动录入到当前录入框中。

#### 夹杂的大数字

不要分隔录入内容简直太棒了，但是要怎么录入大数字？录入的大数字会被自动分隔为多个单数字！

假如要录入的是`1 12 1 3`，录入`11213`会被自动拆分为`1 1 2 1 3`。要怎么把1和2连起来？

当前设计的最基础的方案是使用`m-n`形式，代表mn是一个连续的数字。上述例子可以录入`11-213`。（好像还不错，但是感觉还是有些麻烦）

对于常用的10~19这些大数字，可以通过`alt`+`0`之类的数字快速录入`1-0`~`1-9`这样的内容到录入框。
