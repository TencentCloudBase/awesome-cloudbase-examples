import { createSSRApp } from "vue";
import App from "./App.vue";
// import { initCloudBase } from "./utils/cloudbase";
import showCaptcha from "./components/show-captcha.vue";

export function createApp() {
  const app = createSSRApp(App);

  app.component("show-captcha", showCaptcha);
  
  return {
    app,
  };
}
