/**
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
        throw new Error(`未知的操作: ${operation}`)
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
