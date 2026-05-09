<template>
  <footer class="border-t border-gray-200 bg-white py-8">
    <div class="container mx-auto px-4 text-center">
      <div class="flex justify-center gap-4">
        <a
          href="https://github.com/TencentCloudBase/awesome-cloudbase-examples"
          target="_blank"
          rel="noopener noreferrer"
          class="text-gray-500 hover:text-gray-900"
        >
          GitHub
        </a>
        <a
          href="https://docs.cloudbase.net"
          target="_blank"
          rel="noopener noreferrer"
          class="text-gray-500 hover:text-gray-900"
        >
          文档
        </a>
      </div>
      <p class="mt-4 text-sm text-gray-500">
        基于 Vue + Vite + CloudBase 构建
      </p>
      <p class="mt-2 text-xs text-gray-400">
        Copyright © {{ currentYear }} - All rights reserved
      </p>
    </div>
  </footer>
</template>

<script setup lang="ts">
const currentYear = new Date().getFullYear();
</script>
