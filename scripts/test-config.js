#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { readConfig, pathToZipName } = require('./build-zips');

/**
 * 从路径生成包名（复制自build-zips.js）
 */
function pathToDisplayName(relativePath) {
  const parts = relativePath.split('/');
  if (parts.length === 1) {
    return parts[0];
  }
  const category = parts[0];
  const name = parts[parts.length - 1];
  
  // 简化一些常见的前缀
  const cleanName = name.replace(/^tcb-demo-/, '').replace(/^tcb-/, '');
  
  return `${category}-${cleanName}`;
}

/**
 * 测试配置文件
 */
function testConfig() {
  console.log('🧪 测试配置文件...\n');
  
  try {
    const config = readConfig();
    const rootDir = path.dirname(__dirname);
    
    console.log('✅ 配置文件解析成功');
    console.log(`📦 共配置了 ${config.paths.length} 个包`);
    console.log(`🚫 排除模式: ${(config.exclude || []).length} 个\n`);
    
    // 检查每个包的路径
    console.log('📋 包列表检查:');
    console.log('-'.repeat(70));
    
    config.paths.forEach((packagePath, index) => {
      const sourcePath = path.join(rootDir, packagePath);
      const exists = fs.existsSync(sourcePath);
      const zipName = pathToZipName(packagePath);
      const displayName = pathToDisplayName(packagePath);
      
      const status = exists ? '✅' : '❌';
      const existsText = exists ? '存在' : '不存在';
      
      console.log(`${(index + 1).toString().padStart(2)}. ${status} ${displayName.padEnd(20)} ${packagePath.padEnd(25)} -> ${zipName}`);
      console.log(`    状态: ${existsText.padEnd(10)}`);
      
      if (exists) {
        try {
          const files = fs.readdirSync(sourcePath);
          console.log(`    文件数: ${files.length} 个`);
        } catch (error) {
          console.log(`    ⚠️  无法读取目录: ${error.message}`);
        }
      }
      console.log('');
    });
    
    // 统计
    const existingPaths = config.paths.filter(packagePath => 
      fs.existsSync(path.join(rootDir, packagePath))
    );
    
    console.log('📊 统计信息:');
    console.log('-'.repeat(30));
    console.log(`总包数: ${config.paths.length}`);
    console.log(`存在的路径: ${existingPaths.length}`);
    console.log(`不存在的路径: ${config.paths.length - existingPaths.length}`);
    
    if (existingPaths.length > 0) {
      console.log('\n🎯 建议: 运行 npm run build 开始构建 ZIP 包');
    } else {
      console.log('\n⚠️  警告: 没有找到有效的源路径，请检查配置文件');
    }
    
  } catch (error) {
    console.error('❌ 配置测试失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testConfig();
} 