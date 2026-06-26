#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { glob } = require('glob');

const projectRoot = path.dirname(__dirname);

/**
 * 读取配置文件
 */
function readConfig() {
  const configPath = path.join(__dirname, 'config.json');
  if (!fs.existsSync(configPath)) {
    console.error('❌ 配置文件 config.json 不存在');
    process.exit(1);
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config;
  } catch (error) {
    console.error('❌ 配置文件解析失败:', error.message);
    process.exit(1);
  }
}

/**
 * 确保目录存在
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 加载 .gitignore 中的忽略规则
 */
function loadGitignorePatterns() {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    return [];
  }

  const lines = fs.readFileSync(gitignorePath, 'utf8').split('\n');
  const patterns = [];

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      return;
    }
    if (line.startsWith('!')) {
      console.warn(`⚠️  不支持的 .gitignore 反向匹配: ${line}，已跳过`);
      return;
    }

    let normalized = line.replace(/^\//, '');
    if (normalized.endsWith('/')) {
      normalized = `${normalized}**`;
    }

    patterns.push(normalized);

    const hasWildcard = normalized.includes('*');
    const looksLikeFile = path.basename(normalized).includes('.');
    if (!hasWildcard && !looksLikeFile && !normalized.endsWith('/**')) {
      patterns.push(`${normalized}/**`);
    }
  });

  return patterns;
}

/**
 * 将相对路径转换为zip文件名
 * 例如: "web/cloudbase-react-template" -> "web-cloudbase-react-template.zip"
 */
function pathToZipName(relativePath) {
  return relativePath.replace(/\//g, '-') + '.zip';
}

/**
 * 从路径生成包名
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
 * 创建zip包
 */
async function createZip(sourcePath, outputPath, excludePatterns) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // 设置压缩级别
    });

    output.on('close', () => {
      console.log(`✅ ${path.basename(outputPath)} 创建成功 (${(archive.pointer() / 1024 / 1024).toFixed(2)} MB)`);
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // 获取所有文件，排除指定模式
    const files = glob.sync('**/*', {
      cwd: sourcePath,
      dot: true,
      ignore: excludePatterns,
      nodir: true
    });

    // 添加文件到压缩包
    files.forEach(file => {
      const filePath = path.join(sourcePath, file);
      archive.file(filePath, { name: file });
    });

    archive.finalize();
  });
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始构建 ZIP 包...\n');
  
  const config = readConfig();
  const rootDir = projectRoot;
  const distDir = path.join(rootDir, 'dist');
  const gitignorePatterns = loadGitignorePatterns();
  const excludePatterns = [...(config.exclude || []), ...gitignorePatterns];
  
  // 确保 dist 目录存在
  ensureDir(distDir);
  
  console.log(`📁 输出目录: ${distDir}\n`);
  
  const results = [];
  
  for (const packagePath of config.paths) {
    const sourcePath = path.join(rootDir, packagePath);
    
    // 检查源路径是否存在
    if (!fs.existsSync(sourcePath)) {
      console.log(`⚠️  跳过 ${packagePath}: 路径不存在`);
      continue;
    }
    
    // 检查是否为空目录
    const files = fs.readdirSync(sourcePath);
    if (files.length === 0) {
      console.log(`⚠️  跳过 ${packagePath}: 目录为空`);
      continue;
    }
    
    const zipName = pathToZipName(packagePath);
    const displayName = pathToDisplayName(packagePath);
    const outputPath = path.join(distDir, zipName);
    
    console.log(`📦 打包 ${displayName} (${packagePath}) -> ${zipName}`);
    
    try {
      await createZip(sourcePath, outputPath, excludePatterns);
      results.push({
        name: displayName,
        path: packagePath,
        zipName: zipName,
        size: fs.statSync(outputPath).size,
        success: true
      });
    } catch (error) {
      console.error(`❌ ${displayName} 打包失败:`, error.message);
      results.push({
        name: displayName,
        path: packagePath,
        zipName: zipName,
        error: error.message,
        success: false
      });
    }
  }
  
  // 输出统计信息
  console.log('\n📊 构建完成统计:');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  successful.forEach(result => {
    const sizeInMB = (result.size / 1024 / 1024).toFixed(2);
    console.log(`✅ ${result.name.padEnd(20)} ${result.zipName.padEnd(25)} ${sizeInMB.padStart(8)} MB`);
  });
  
  if (failed.length > 0) {
    console.log('\n❌ 失败的包:');
    failed.forEach(result => {
      console.log(`   ${result.name}: ${result.error}`);
    });
  }
  
  console.log(`\n🎉 成功: ${successful.length} 个包, 失败: ${failed.length} 个包`);
  console.log(`📂 所有 ZIP 文件已保存到: ${distDir}`);
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 构建过程中出现错误:', error);
    process.exit(1);
  });
}

module.exports = { main, readConfig, pathToZipName }; 