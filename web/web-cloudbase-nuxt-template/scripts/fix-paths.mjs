/**
 * 构建后路径修复脚本
 * 将 .output/public/ 目录中 HTML 文件里的绝对路径替换为相对路径
 * 使构建产物可以部署到任意子目录，无需额外配置
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../.output/public');

function getHtmlFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getHtmlFiles(fullPath));
    } else if (entry.name.endsWith('.html') || entry.name.endsWith('.json')) {
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

const files = getHtmlFiles(outDir);
let count = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  const prefix = getRelativePrefix(file);

  // 替换 /_nuxt/ 和 /_payload.json 为相对路径
  // 同时替换 Nuxt 运行时配置中的 baseURL，使动态请求也使用相对路径
  let newContent = content
    .replace(/(["'=])\/_nuxt\//g, `$1${prefix}_nuxt/`)
    .replace(/(["'=])\/_payload\.json/g, `$1${prefix}_payload.json`)
    .replace(/baseURL:"\/"/g, `baseURL:"./"`)
    .replace(/baseURL:'\/'/g, `baseURL:'./'`);

  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf-8');
    count++;
  }
}

console.log(`✅ 已修复 ${count} 个文件的资源路径为相对路径`);
