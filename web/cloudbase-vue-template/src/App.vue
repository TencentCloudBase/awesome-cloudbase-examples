<template>
  <div class="flex min-h-screen flex-col bg-gray-50 text-gray-900">
    <div
      v-if="isLoading"
      class="flex grow flex-col items-center justify-center px-4"
    >
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      <p class="mt-4 text-sm text-gray-500">加载中...</p>
    </div>
    <template v-else>
      <AppNavbar />
      <main class="grow">
        <RouterView />
      </main>
      <AppFooter />
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterView } from "vue-router";
import AppNavbar from "./components/AppNavbar.vue";
import AppFooter from "./components/HomeFooter.vue";
import { checkLogin } from "./utils/cloudbase";

const isLoading = ref(true);

onMounted(async () => {
  try {
    const result = await checkLogin();
    console.log("登录态检查完成:", result.isLoggedIn ? "已登录" : "未登录");
  } catch (error) {
    console.error("检查登录态失败", error);
  } finally {
    isLoading.value = false;
  }
});
</script>
