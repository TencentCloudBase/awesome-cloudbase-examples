import { app } from "@/utils/cloudbase";

/**
 * Image adapter
 * ----------------------------------------------------------------------------
 * Intercepts every <img> on the page whose `src` is a `cloud://` file ID,
 * batch-resolves them to temporary HTTPS URLs via the CloudBase JS SDK
 * (`app.getTempFileURL`), then rewrites `img.src` in place.
 *
 * Two entry points:
 *   1. processExistingImages — runs once on init for already-rendered <img>s
 *   2. MutationObserver       — watches for <img> additions and src changes
 *
 * Requests are batched (default: up to 50 URLs per call, or after 100ms idle)
 * to amortize round-trips, with an in-memory cache to avoid re-resolving the
 * same fileID twice.
 */

let init = false;

const CLOUD_URL_RE = /^cloud:\/\//;

function shouldInterceptUrl(url: string | null | undefined): url is string {
  return !!url && CLOUD_URL_RE.test(url);
}

interface PendingItem {
  url: string;
  resolve: (resolved: string) => void;
  reject: (err: unknown) => void;
}

interface BatchOptions {
  batchSize?: number;
  batchTimeout?: number;
}

interface BatchConverter {
  (url: string): Promise<string>;
  clearCache: () => void;
  getStats: () => {
    cacheSize: number;
    pendingCount: number;
    processingCount: number;
  };
}

function createBatchUrlConverter(options: BatchOptions = {}): BatchConverter {
  const batchSize = options.batchSize ?? 50;
  const batchTimeout = options.batchTimeout ?? 100;

  const pendingQueue: PendingItem[] = [];
  let batchTimer: ReturnType<typeof setTimeout> | null = null;
  const cache = new Map<string, string>();
  const processingUrls = new Set<string>();

  function waitForProcessing(url: string): Promise<string> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (cache.has(url)) {
          clearInterval(checkInterval);
          resolve(cache.get(url)!);
        }
      }, 10);
    });
  }

  async function processBatch(): Promise<void> {
    if (pendingQueue.length === 0) return;

    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }

    const currentBatch = pendingQueue.splice(0, batchSize);
    const urls = currentBatch.map((item) => item.url);

    urls.forEach((url) => processingUrls.add(url));

    try {
      const result = await app.getTempFileURL({ fileList: urls });
      // Build a fileID → tempURL map. Items without a temp URL (404, no perm,
      // etc.) fall through to the original `cloud://` URL so the page at least
      // doesn't break — the browser will just fail to load that image.
      const map = new Map<string, string>();
      const list = (result as { fileList?: Array<{ fileID: string; tempFileURL?: string }> })
        .fileList;
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item.fileID && item.tempFileURL) {
            map.set(item.fileID, item.tempFileURL);
          }
        }
      }

      for (const [fileID, tempURL] of map) {
        cache.set(fileID, tempURL);
      }

      currentBatch.forEach((item) => {
        item.resolve(map.get(item.url) ?? item.url);
      });
      urls.forEach((url) => processingUrls.delete(url));
    } catch (error) {
      console.error("批量处理失败:", error);

      currentBatch.forEach((item) => {
        cache.delete(item.url);
        item.resolve(item.url);
        processingUrls.delete(item.url);
      });
    }

    // Drain any remaining requests scheduled while we awaited.
    if (pendingQueue.length > 0) {
      if (pendingQueue.length >= batchSize) {
        processBatch();
      } else {
        batchTimer = setTimeout(processBatch, batchTimeout);
      }
    }
  }

  const convertUrl = ((url: string): Promise<string> => {
    if (cache.has(url)) {
      return Promise.resolve(cache.get(url)!);
    }
    if (processingUrls.has(url)) {
      return waitForProcessing(url);
    }
    return new Promise<string>((resolve, reject) => {
      pendingQueue.push({ url, resolve, reject });

      if (pendingQueue.length >= batchSize) {
        processBatch();
      } else {
        if (batchTimer) clearTimeout(batchTimer);
        batchTimer = setTimeout(processBatch, batchTimeout);
      }
    });
  }) as BatchConverter;

  convertUrl.clearCache = () => cache.clear();
  convertUrl.getStats = () => ({
    cacheSize: cache.size,
    pendingCount: pendingQueue.length,
    processingCount: processingUrls.size,
  });

  return convertUrl;
}

const convertUrl = createBatchUrlConverter({
  batchSize: 50,
  batchTimeout: 100,
});

async function interceptImageSrc(img: HTMLImageElement): Promise<void> {
  const originalSrc = img.src;
  if (!shouldInterceptUrl(originalSrc)) return;
  try {
    const newSrc = await convertUrl(originalSrc);
    img.src = newSrc;
  } catch (error) {
    console.error("图片 URL 转换失败:", error);
  }
}

function processExistingImages(): void {
  document.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
    interceptImageSrc(img);
  });
}

function setupMutationObserver(): void {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const el = node as Element;
          if (el.tagName === "IMG") {
            interceptImageSrc(el as HTMLImageElement);
          }
          const images = el.querySelectorAll?.<HTMLImageElement>("img");
          images?.forEach((img) => interceptImageSrc(img));
        });
      }

      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "src"
      ) {
        const target = mutation.target as Element;
        if (target.tagName === "IMG") {
          interceptImageSrc(target as HTMLImageElement);
        }
      }
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src"],
  });
}

function initImageInterceptor(): void {
  processExistingImages();
  setupMutationObserver();
}

export function runImageAdapter(): void {
  if (init) return;
  init = true;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initImageInterceptor);
  } else {
    initImageInterceptor();
  }
}
