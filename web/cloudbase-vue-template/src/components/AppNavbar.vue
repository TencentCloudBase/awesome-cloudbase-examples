<template>
  <header class="border-b border-gray-200 bg-white">
    <nav class="container mx-auto flex items-center justify-between px-4 py-4">
      <RouterLink to="/" class="text-xl font-semibold text-gray-900">
        CloudBase + Vue
      </RouterLink>
      <a
        href="https://docs.cloudbase.net"
        target="_blank"
        rel="noopener noreferrer"
        class="text-sm text-blue-600 hover:text-blue-800"
      >
        文档
      </a>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>
