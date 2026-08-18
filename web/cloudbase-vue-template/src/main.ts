import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import App from "./App.vue";

// 导入页面组件
import HomePage from "./pages/HomePage.vue";

// 定义路由
const routes = [
  { path: "/", component: HomePage },
  { path: "/:pathMatch(.*)*", redirect: "/" }, // 404重定向到首页
];

// 创建路由实例 - 使用hash模式避免静态托管时的刷新404问题
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// 创建应用实例
const app = createApp(App);

// 使用路由
app.use(router);

// 挂载应用
app.mount("#app");
