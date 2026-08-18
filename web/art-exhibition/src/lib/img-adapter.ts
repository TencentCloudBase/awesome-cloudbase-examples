let init = false;
// 判断是否需要拦截的 URL
function shouldInterceptUrl(url) {
  return url && /cloud:\/\//.test(url);
}

function createBatchUrlConverter(
  options: { batchSize?: number; batchTimeout?: number } = {}
) {
  const batchSize = options.batchSize || 50;
  const batchTimeout = options.batchTimeout || 100;

  const pendingQueue = [];
  let batchTimer = null;
  const cache = new Map(); // 添加缓存
  const processingUrls = new Set(); // 正在处理的URL

  async function convertUrl(url) {
    // 检查缓存
    if (cache.has(url)) {
      return cache.get(url);
    }

    // 如果正在处理中，等待结果
    if (processingUrls.has(url)) {
      return waitForProcessing(url);
    }

    return new Promise((resolve, reject) => {
      pendingQueue.push({ url, resolve, reject });

      if (pendingQueue.length >= batchSize) {
        processBatch();
      } else {
        if (batchTimer) clearTimeout(batchTimer);
        batchTimer = setTimeout(processBatch, batchTimeout);
      }
    });
  }

  function waitForProcessing(url) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (cache.has(url)) {
          clearInterval(checkInterval);
          resolve(cache.get(url));
        }
      }, 10);
    });
  }

  async function processBatch() {
    if (pendingQueue.length === 0) return;

    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }

    const currentBatch = pendingQueue.splice(0, batchSize);
    const urls = currentBatch.map((item) => item.url);

    // 标记为处理中
    urls.forEach((url) => processingUrls.add(url));

    try {
      console.log(`批量处理 ${urls.length} 个 URL`);

      const map = await (window as any).$w.cloud.getTempFileURL(urls);

      for (const key in map) {
        // 更新缓存
        cache.set(key, map[key]);
      }

      // resolve Promise
      currentBatch.forEach((item) => {
        item.resolve(map[item.url] || item.url);
      });
      // 移除处理标记
      urls.forEach((url) => processingUrls.delete(url));
    } catch (error) {
      console.error("批量处理失败:", error);

      currentBatch.forEach((item, index) => {
        const originalUrl = urls[index];
        cache.delete(originalUrl);
        item.resolve(originalUrl);
        processingUrls.delete(originalUrl);
      });
    }

    // 继续处理剩余请求
    if (pendingQueue.length > 0) {
      if (pendingQueue.length >= batchSize) {
        processBatch();
      } else {
        batchTimer = setTimeout(processBatch, batchTimeout);
      }
    }
  }

  // 返回转换函数和一些工具方法
  convertUrl.clearCache = () => cache.clear();
  convertUrl.getStats = () => ({
    cacheSize: cache.size,
    pendingCount: pendingQueue.length,
    processingCount: processingUrls.size,
  });

  return convertUrl;
}

// 创建全局转换函数
const convertUrl = createBatchUrlConverter({
  batchSize: 50,
  batchTimeout: 100,
});

async function interceptImageSrc(img) {
  const originalSrc = img.src;

  if (shouldInterceptUrl(originalSrc)) {
    try {
      const newSrc = await convertUrl(originalSrc);
      img.src = newSrc;
    } catch (error) {
      console.error("图片 URL 转换失败:", error);
    }
  }
}

function initImageInterceptor() {
  // 先处理已存在的图片
  processExistingImages();

  // 然后设置观察器监听新增的图片
  setupMutationObserver();
}

// 处理页面中已存在的图片
function processExistingImages() {
  const existingImages = document.querySelectorAll("img");
  existingImages.forEach((img) => {
    interceptImageSrc(img);
  });
}

// 设置 MutationObserver
function setupMutationObserver() {
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      // 监听新增的节点
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // 检查新增的节点本身是否是 img
            if (node.tagName === "IMG") {
              interceptImageSrc(node);
            }
            // 检查新增节点的子元素中是否有 img
            const images =
              node.querySelectorAll && node.querySelectorAll("img");
            if (images) {
              images.forEach((img) => interceptImageSrc(img));
            }
          }
        });
      }

      // 监听属性变化
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "src" &&
        (mutation.target as any).tagName === "IMG"
      ) {
        interceptImageSrc(mutation.target);
      }
    });
  });

  // 开始观察整个文档
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src"],
  });

  console.log("MutationObserver 已启动");
}

export function runImageAdapter() {
  if (!init) {
    init = true;
    // 确保在 DOM 加载完成后执行
    document.addEventListener("DOMContentLoaded", function () {
      initImageInterceptor();
    });

    // 如果页面已经加载完成
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initImageInterceptor);
    } else {
      initImageInterceptor();
    }
  }
}
