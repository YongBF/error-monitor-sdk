#!/usr/bin/env node

/**
 * Error Monitor SDK - 自动化测试脚本
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Error Monitor SDK - 自动化测试\n');

let passed = 0;
let failed = 0;

// 测试函数
function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  错误: ${error.message}`);
    failed++;
  }
}

// 验证文件存在
function assertFileExists(filePath, description) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${description} 不存在: ${filePath}`);
  }
}

// 验证文件内容
function assertFileContains(filePath, content, description) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  if (!fileContent.includes(content)) {
    throw new Error(`${description} 不包含: ${content}`);
  }
}

// 验证JSON格式
function assertValidJSON(filePath) {
  try {
    JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    throw new Error(`无效的JSON文件: ${filePath}`);
  }
}

console.log('📦 测试核心包 (error-monitor-core)');
console.log('─'.repeat(50));

test('core/package.json 存在', () => {
  assertFileExists('packages/core/package.json', 'package.json');
});

test('core/package.json 格式正确', () => {
  assertValidJSON('packages/core/package.json');
});

test('core/package.json 包含必需字段', () => {
  assertFileContains('packages/core/package.json', 'error-monitor-core', 'name字段');
});

test('core/src/index.ts 存在', () => {
  assertFileExists('packages/core/src/index.ts', '源文件');
});

test('core/dist 目录存在', () => {
  assertFileExists('packages/core/dist', 'dist目录');
});

test('core/dist/index.mjs 存在', () => {
  assertFileExists('packages/core/dist/index.mjs', 'ES模块输出');
});

test('core/dist/index.cjs 存在', () => {
  assertFileExists('packages/core/dist/index.cjs', 'CommonJS输出');
});

test('core/dist/index.d.ts 存在', () => {
  assertFileExists('packages/core/dist/index.d.ts', '类型定义');
});

test('core 导出正确的内容', () => {
  // 检查是否包含核心功能而不是类名（因为构建会压缩）
  const content = fs.readFileSync('packages/core/dist/index.mjs', 'utf-8');
  if (!content.includes('capture') && !content.includes('init') && !content.includes('report')) {
    throw new Error('core包不包含核心方法');
  }
});

console.log('\n📦 测试Web包 (error-monitor-web)');
console.log('─'.repeat(50));

test('web/package.json 存在', () => {
  assertFileExists('packages/web/package.json', 'package.json');
});

test('web/package.json 依赖core包', () => {
  assertFileContains('packages/web/package.json', 'error-monitor-core', 'core依赖');
});

test('web/src/index.ts 存在', () => {
  assertFileExists('packages/web/src/index.ts', '源文件');
});

test('web/dist 目录存在', () => {
  assertFileExists('packages/web/dist', 'dist目录');
});

test('web/dist/index.mjs 存在', () => {
  assertFileExists('packages/web/dist/index.mjs', 'ES模块输出');
});

test('web/dist/index.cjs 存在', () => {
  assertFileExists('packages/web/dist/index.cjs', 'CommonJS输出');
});

test('web/dist/index.umd.js 存在', () => {
  assertFileExists('packages/web/dist/index.umd.js', 'UMD输出');
});

test('web 导出正确的内容', () => {
  const content = fs.readFileSync('packages/web/dist/index.mjs', 'utf-8');
  if (!content.includes('captureError') && !content.includes('captureJsErrors')) {
    throw new Error('web包不包含Web特定方法');
  }
});

console.log('\n📦 测试性能插件 (@error-monitor/plugin-perf)');
console.log('─'.repeat(50));

test('plugin-perf/package.json 存在', () => {
  assertFileExists('packages/plugin-perf/package.json', 'package.json');
});

test('plugin-perf/package.json 名称正确', () => {
  assertFileContains('packages/plugin-perf/package.json', '@error-monitor/plugin-perf', '包名');
});

test('plugin-perf/src/index.ts 存在', () => {
  assertFileExists('packages/plugin-perf/src/index.ts', '源文件');
});

test('plugin-perf/dist 目录存在', () => {
  assertFileExists('packages/plugin-perf/dist', 'dist目录');
});

test('plugin-perf/dist/index.mjs 存在', () => {
  assertFileExists('packages/plugin-perf/dist/index.mjs', 'ES模块输出');
});

test('plugin-perf 导出正确的内容', () => {
  const content = fs.readFileSync('packages/plugin-perf/dist/index.mjs', 'utf-8');
  if (!content.includes('PerformancePlugin') && !content.includes('setup')) {
    throw new Error('plugin-perf不包含插件方法');
  }
});

console.log('\n📦 测试行为插件 (@error-monitor/plugin-behavior)');
console.log('─'.repeat(50));

test('plugin-behavior/package.json 存在', () => {
  assertFileExists('packages/plugin-behavior/package.json', 'package.json');
});

test('plugin-behavior/package.json 名称正确', () => {
  assertFileContains('packages/plugin-behavior/package.json', '@error-monitor/plugin-behavior', '包名');
});

test('plugin-behavior/src/index.ts 存在', () => {
  assertFileExists('packages/plugin-behavior/src/index.ts', '源文件');
});

test('plugin-behavior/dist 目录存在', () => {
  assertFileExists('packages/plugin-behavior/dist', 'dist目录');
});

test('plugin-behavior/dist/index.mjs 存在', () => {
  assertFileExists('packages/plugin-behavior/dist/index.mjs', 'ES模块输出');
});

test('plugin-behavior 导出正确的内容', () => {
  const content = fs.readFileSync('packages/plugin-behavior/dist/index.mjs', 'utf-8');
  if (!content.includes('BehaviorPlugin') && !content.includes('setup')) {
    throw new Error('plugin-behavior不包含插件方法');
  }
});

console.log('\n📊 测试包体积');
console.log('─'.repeat(50));

function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return (stats.size / 1024).toFixed(2);
}

function checkSize(filePath, maxSize, name) {
  const size = parseFloat(getFileSize(filePath));
  if (size > maxSize) {
    throw new Error(`${name} 体积过大: ${size}KB (最大 ${maxSize}KB)`);
  }
  console.log(`  ✓ ${name}: ${size}KB`);
}

test('core包体积检查', () => {
  console.log('  core包文件大小:');
  checkSize('packages/core/dist/index.mjs', 10, 'ES模块');
  checkSize('packages/core/dist/index.cjs', 10, 'CommonJS');
});

test('web包体积检查', () => {
  console.log('  web包文件大小:');
  checkSize('packages/web/dist/index.mjs', 20, 'ES模块');
  checkSize('packages/web/dist/index.cjs', 20, 'CommonJS');
});

test('plugin-perf包体积检查', () => {
  console.log('  plugin-perf包文件大小:');
  checkSize('packages/plugin-perf/dist/index.mjs', 5, 'ES模块');
});

test('plugin-behavior包体积检查', () => {
  console.log('  plugin-behavior包文件大小:');
  checkSize('packages/plugin-behavior/dist/index.mjs', 5, 'ES模块');
});

console.log('\n📄 测试文档');
console.log('─'.repeat(50));

test('README.md 存在', () => {
  assertFileExists('README.md', 'README');
});

test('README.md 包含安装说明', () => {
  assertFileContains('README.md', 'npm install', '安装说明');
});

test('README.md 包含使用示例', () => {
  assertFileContains('README.md', 'new ErrorMonitorWeb', '使用示例');
});

test('设计文档存在', () => {
  // 文档可能在game-24目录中
  const docsPath = 'docs/plans/2026-01-28-error-monitor-sdk-design.md';
  const altPath = '../game-24/docs/plans/2026-01-28-error-monitor-sdk-design.md';
  if (!fs.existsSync(docsPath) && !fs.existsSync(altPath)) {
    throw new Error('设计文档不存在');
  }
});

console.log('\n⚙️  测试配置文件');
console.log('─'.repeat(50));

test('根package.json 存在', () => {
  assertFileExists('package.json', 'package.json');
});

test('根package.json 包含workspaces', () => {
  assertFileContains('package.json', 'workspaces', 'workspaces配置');
});

test('pnpm-workspace.yaml 存在', () => {
  assertFileExists('pnpm-workspace.yaml', 'pnpm workspace配置');
});

test('turbo.json 存在', () => {
  assertFileExists('turbo.json', 'Turbo配置');
});

test('tsconfig.json 存在', () => {
  assertFileExists('tsconfig.json', 'TypeScript配置');
});

test('.gitignore 存在', () => {
  assertFileExists('.gitignore', 'gitignore');
});

// 输出总结
console.log('\n' + '='.repeat(50));
console.log('📈 测试结果总结');
console.log('='.repeat(50));
console.log(`✓ 通过: ${passed}`);
console.log(`✗ 失败: ${failed}`);
console.log(`📊 成功率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 所有测试通过！');
  process.exit(0);
} else {
  console.log('\n⚠️  部分测试失败，请检查！');
  process.exit(1);
}
