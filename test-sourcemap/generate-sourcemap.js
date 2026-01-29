/**
 * Generate proper sourcemap using source-map library
 */
const { SourceMapGenerator } = require('source-map')
const fs = require('fs')
const path = require('path')

// Original source code
const sourceCode = `/**
 * 计算器类 - 原始源代码
 * 用于测试 Source Map 还原功能
 */

class Calculator {
  constructor() {
    this.result = 0
  }

  add(a, b) {
    this.result = a + b
    return this.result
  }

  subtract(a, b) {
    this.result = a - b
    return this.result
  }

  multiply(a, b) {
    this.result = a * b
    return this.result
  }

  divide(a, b) {
    if (b === 0) {
      throw new Error('除数不能为零！')
    }
    this.result = a / b
    return this.result
  }

  calculate(operation, a, b) {
    switch (operation) {
      case 'add':
        return this.add(a, b)
      case 'subtract':
        return this.subtract(a, b)
      case 'multiply':
        return this.multiply(a, b)
      case 'divide':
        return this.divide(a, b)
      default:
        throw new Error(\`未知的操作: \${operation}\`)
    }
  }
}

// 测试函数 - 这会触发一个错误
function testCalculate() {
  const calc = new Calculator()
  return calc.divide(10, 0) // 这里会抛出错误
}

// 暴露到全局
window.Calculator = Calculator
window.testCalculate = testCalculate

console.log('计算器模块已加载')
`

// Minified code (single line)
const minifiedCode = "class Calculator{constructor(){this.result=0}add(a,b){return this.result=a+b,this.result}subtract(a,b){return this.result=a-b,this.result}multiply(a,b){return this.result=a*b,this.result}divide(a,b){if(0===b)throw new Error(\"除数不能为零！\");return this.result=a/b,this.result}calculate(a,b,c){switch(a){case\"add\":return this.add(b,c);case\"subtract\":return this.subtract(b,c);case\"multiply\":return this.multiply(b,c);case\"divide\":return this.divide(b,c);default:throw new Error(\`未知的操作: \${a}\`)}}}function testCalculate(){const a=new Calculator;return a.divide(10,0)}window.Calculator=Calculator,window.testCalculate=testCalculate,console.log(\"计算器模块已加载\")"

// Create sourcemap
const map = new SourceMapGenerator({
  file: 'bundle.min.js'
})

// Add the source file
map.setSourceContent('src.js', sourceCode)

// Now we need to map the minified positions to source positions
// This is complex, so let's create a simpler approach
// Let's just map the key positions we care about for testing

// Find the divide method in minified code
// divide(a,b){if(0===b)throw new Error("除数不能为零！");return this.result=a/b,this.result}
// The "throw new Error" part in original is at line 28, column 10

// Find position of "throw new Error" in minified
const divideMethodPos = minifiedCode.indexOf('throw new Error("除数不能为零！")')
if (divideMethodPos !== -1) {
  // The actual throw keyword is at divideMethodPos
  // Line 1 (minified is single line)
  // Column is divideMethodPos

  // Map this position to source line 28, column 10 (start of throw new Error)
  map.addMapping({
    generated: {
      line: 1,
      column: divideMethodPos
    },
    source: 'src.js',
    original: {
      line: 28,
      column: 10  // After spaces: "      throw new Error"
    },
    name: 'Error'
  })
}

// Also map the divide function itself for context
const divideMethodStart = minifiedCode.indexOf('divide(a,b)')
if (divideMethodStart !== -1) {
  map.addMapping({
    generated: {
      line: 1,
      column: divideMethodStart
    },
    source: 'src.js',
    original: {
      line: 27,
      column: 2  // "  divide(a, b) {"
    },
    name: 'divide'
  })
}

const sourceMap = map.toString()

console.log('Generated sourcemap:')
console.log(sourceMap)

// Write the minified file
fs.writeFileSync(
  path.join(__dirname, 'bundle.min.js'),
  minifiedCode + '\n//# sourceMappingURL=bundle.min.js.map\n'
)

// Write the sourcemap
fs.writeFileSync(
  path.join(__dirname, 'bundle.min.js.map'),
  sourceMap
)

console.log('\n✅ Generated bundle.min.js and bundle.min.js.map')
console.log(`Error throw position in minified code: line 1, column ${divideMethodPos}`)
console.log('This maps to src.js line 28, column 10')
