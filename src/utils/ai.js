// NOTE 以下方法为AI提供的推理算法编码，目前的准确率和效果还有待观察。
// 20250304 从目前AI推理逻辑测试结果初步看，AI的代码推理能力还无法和现有的人工推理逻辑匹敌，无法取代人工推理逻辑。
// 结论：当下AI推理的结果只作为参考，程序会比对单独的人工推理逻辑和单独的AI推理逻辑结果，会对AI未推理出的以及错误推理作出反馈，如果AI推理出来人工推理逻辑未推理出来的结果，视觉上给出提示，人为自行确认。并以此验证AI推理逻辑的正确率和能力。
export const aiSolve = (problem, existingGrid) => {
    const { top, left } = typeof problem === 'string' ? JSON.parse(problem) : problem;
    const rows = left.length;
    const cols = top.length;

    // 初始化网格并进行校验
    const grid = initializeGrid(rows, cols, existingGrid);
    validateGridConstraints(grid, top, left, generatePossibleLines);

    // 生成可能解的强化版回溯算法
    function generatePossibleLines (hints, length, current) {
        if (hints.length === 0) {
            return current.every(c => c !== '1') ? [Array(length).fill(0)] : [];
        }

        const totalBlock = hints.reduce((a, b) => a + b, 0);
        const minSpaces = hints.length - 1;
        const maxStart = length - totalBlock - minSpaces; // 关键变量

        const mustFill = current.map(c => c === '1');
        const mustEmpty = current.map(c => c === '0');
        const initialPath = current.map(c => c === '' ? null : Number(c));
        const result = [];

        const backtrack = (hintIndex, lastEnd, path) => {
            if (hintIndex === hints.length) {
                const final = path.map(v => v === null ? 0 : v);
                if (mustFill.every((v, i) => !v || final[i] === 1) &&
                    mustEmpty.every((v, i) => !v || final[i] === 0)) {
                    result.push(final);
                }
                return;
            }

            const blockSize = hints[hintIndex];
            let start, endLimit;

            // 修正位置计算逻辑
            if (hintIndex === 0) {
                start = 0;
                endLimit = Math.min(maxStart, length - blockSize);
            } else {
                start = lastEnd + 2;
                const remainingBlocks = hints.slice(hintIndex).reduce((a, b) => a + b, 0);
                const remainingSpaces = hints.length - hintIndex - 1;
                endLimit = length - remainingBlocks - remainingSpaces;
            }

            for (let pos = start; pos <= endLimit; pos++) {
                let valid = true;
                
                // 校验块放置区域
                for (let i = 0; i < blockSize; i++) {
                    const idx = pos + i;
                    if (idx >= length || mustEmpty[idx] || path[idx] === 0) {
                        valid = false;
                        break;
                    }
                }
                
                // 校验块后间隔（最后一个块除外）
                if (valid && hintIndex < hints.length - 1) {
                    const spaceIdx = pos + blockSize;
                    if (spaceIdx < length && (mustFill[spaceIdx] || path[spaceIdx] === 1)) {
                        valid = false;
                    }
                }

                if (!valid) continue;

                const newPath = [...path];
                for (let i = 0; i < blockSize; i++) {
                    newPath[pos + i] = 1;
                }

                backtrack(hintIndex + 1, pos + blockSize - 1, newPath);
            }
        };

        backtrack(0, -1, [...initialPath]);
        return result;
    }

    // 获取确定值
    const getDetermined = (lines) => {
        if (lines.length === 0) return [];
        return lines[0].map((_, i) => {
            const val = lines[0][i];
            return lines.every(line => line[i] === val) ? val : '';
        });
    };

    // 迭代推理
    let changed;
    do {
        changed = false;

        // 处理行
        for (let i = 0; i < rows; i++) {
            const possible = generatePossibleLines(left[i], cols, grid[i]);
            if (possible.length === 0) throw new Error(`行${i}无可行解`);
            const determined = getDetermined(possible);

            for (let j = 0; j < cols; j++) {
                if (grid[i][j] === '' && determined[j] !== '') {
                    grid[i][j] = determined[j].toString();
                    changed = true;
                }
            }
        }

        // 处理列
        for (let j = 0; j < cols; j++) {
            const column = grid.map(row => row[j]);
            const possible = generatePossibleLines(top[j], rows, column);
            if (possible.length === 0) throw new Error(`列${j}无可行解`);
            const determined = getDetermined(possible);

            for (let i = 0; i < rows; i++) {
                if (grid[i][j] === '' && determined[i] !== '') {
                    grid[i][j] = determined[i].toString();
                    changed = true;
                }
            }
        }
    } while (changed);

    return grid.map(row => [...row]); // 返回深拷贝防止外部修改
}

// 初始化与校验函数
function initializeGrid(rows, cols, existingGrid) {
    if (!existingGrid) return Array.from({ length: rows }, () => Array(cols).fill(''));
    
    // 结构校验
    if (existingGrid.length !== rows || existingGrid[0]?.length !== cols) {
        throw new Error(`网格应为${rows}x${cols}，当前为${existingGrid.length}x${existingGrid[0]?.length || 0}`);
    }
    
    // 值校验与标准化
    return existingGrid.map((row, i) => {
        if (row.length !== cols) throw new Error(`第${i}行长度应为${cols}`);
        return row.map((cell, j) => {
            if (!['0', '1', ''].includes(cell)) {
                throw new Error(`非法值 "${cell}" (位置${i},${j})，允许值：0/1/空字符串`);
            }
            return cell;
        });
    });
}

function validateGridConstraints(grid, top, left, generatePossibleLines) {
    // 行校验
    grid.forEach((row, i) => {
        const possible = generatePossibleLines(left[i], grid[0].length, row);
        if (possible.length === 0) {
            throw new Error(`第${i}行初始值与左侧提示冲突`);
        }
    });

    // 列校验
    for (let j = 0; j < grid[0].length; j++) {
        const column = grid.map(row => row[j]);
        const possible = generatePossibleLines(top[j], grid.length, column);
        if (possible.length === 0) {
            throw new Error(`第${j}列初始值与顶部提示冲突`);
        }
    }
}

// // 测试用例
// const puz = {"top":[[2,3,2],[5,8],[1,2,1,2],[2,4,3,4],[4,8,3],[3,7,1,2],[4,5,2,1],[2,4,3],[1,2,6,3,2],[1,1,4,3,3],[1,1,7,3],[1,2,1,1,3,5],[6,7,3],[2,3,2,2],[5,1,1],[1,3,3,1,1],[2,4,1,1],[1,3,5,2],[4,3,5],[2,1,1]],"left":[[9,3],[4,2,1],[1,3,1,2,1],[2,1,1,1,2,1,2],[1,2,1,4],[2,1,1,3,1,3],[2,2,1,1,3,1],[8,2,1],[10,3,1],[10,3,1],[1,12,1],[1,2,3,2,1],[2,2,4,1,1],[2,4,3,2,1,1],[2,2,4,2,1],[1,2,2,3,1],[3,1,1,2],[4,4,1],[1,4,7,3],[1,3,6,1,2]]};

// const answer = [["","","","","","","","1","1","","","","","","","","","","",""],["","","","","","","1","1","0","","","","","","","","","","",""],["","","","","","","1","0","1","","","","1","","","","","","",""],["","","","","1","0","1","0","1","","0","1","1","0","","","","","",""],["","","","","","","","0","0","","","","1","","","","","","",""],["","","","","","","0","0","1","","","","1","","","","","","",""],["","","","","","","1","0","1","0","","","","","","","","","",""],["0","0","","","","1","1","1","1","1","","","","0","","","","","",""],["0","","","","1","1","1","1","1","1","1","","","1","","","","","",""],["0","1","1","1","1","1","1","1","1","1","1","0","1","1","1","0","","","",""],["","1","","","1","1","1","1","1","1","1","1","1","1","","","","","",""],["","1","","","1","","0","0","0","0","1","1","1","0","","","","","",""],["","1","","","1","","0","0","0","","1","1","1","","","","","","",""],["1","1","0","1","1","1","1","0","1","1","1","0","1","1","0","","","","",""],["","1","","","","","1","","1","1","","0","","","","","","","",""],["0","1","0","","","","0","","1","","0","1","","0","","","","","",""],["0","","","","","","","","0","0","0","1","","0","","","","","",""],["0","","","","1","","","","0","1","1","1","1","0","","","","","",""],["","","","","1","1","","","1","1","1","1","1","1","","","","1","",""],["","","","","","","","","1","1","1","1","","1","","","","","",""]]


// // 使用示例
// try {
//   const result = aiSolve(puz, answer);
//     console.log(JSON.stringify(result));
// } catch (e) {
//     console.error('错误:', e.message);
// }