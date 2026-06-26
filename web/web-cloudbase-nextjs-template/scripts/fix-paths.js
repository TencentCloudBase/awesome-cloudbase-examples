/**
 * 构建后路径修复脚本
 * 将 out/ 目录中的绝对路径 /_next/ 替换为相对路径
 * 使构建产物可以部署到任意子目录，无需额外配置
 *
 * 策略：
 * - HTML/TXT 文件：将 /_next/ 替换为 ./_next/（根目录页面）或 ../_next/（子目录页面）
 * - webpack runtime JS：将固定 publicPath 替换为运行时动态计算的 publicPath
 * - 其他 JS 文件不修改（它们通过 webpack publicPath 间接引用）
 */
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '../out');

function getAllFiles(dir, exts) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath, exts));
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  return files;
}

function getRelativePrefix(file) {
  const relDir = path.relative(outDir, path.dirname(file));
  if (!relDir) return './';
  const depth = relDir.split(path.sep).length;
  return '../'.repeat(depth);
}

let count = 0;

// 1. 修复 HTML 和 TXT 文件中的所有 /_next/ 引用
const htmlFiles = getAllFiles(outDir, ['.html', '.txt']);
for (const file of htmlFiles) {
  let content = fs.readFileSync(file, 'utf-8');
  const prefix = getRelativePrefix(file);
  const newContent = content.replaceAll('/_next/', `${prefix}_next/`);
  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf-8');
    count++;
  }
}

// 2. 修复 webpack runtime 中的 publicPath
//    将固定的 r.p="/_next/" 替换为运行时动态计算的路径
const jsFiles = getAllFiles(outDir, ['.js']);
for (const file of jsFiles) {
  let content = fs.readFileSync(file, 'utf-8');

  // webpack runtime 中的 publicPath 模式: r.p="/_next/" 或 r.p=".../_next/"
  // 替换为运行时动态获取：根据当前 script 标签的 src 推导出 _next/ 的位置
  const newContent = content.replace(
    /r\.p\s*=\s*"[^"]*_next\/"/,
    'r.p=(function(){try{var s=document.currentScript||document.querySelector("script[src*=webpack]");if(s&&s.src){var u=s.src,i=u.lastIndexOf("_next/");if(i!==-1)return u.substring(0,i)+"_next/"}return"./_next/"}catch(e){return"./_next/"}})()'
  );

  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf-8');
    count++;
  }
}

console.log(`✅ 已修复 ${count} 个文件的资源路径为相对路径`);
