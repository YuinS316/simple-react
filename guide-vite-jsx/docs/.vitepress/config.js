import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Learn mini-react",
  description: "A site used for learning mini-react",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "首页", link: "/" },
      { text: "指引", link: "/start" },
    ],

    sidebar: [
      {
        text: "指引",
        items: [
          { text: "开始", link: "/start" },
          { text: "并发模式", link: "/concurrent" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/vuejs/vitepress" },
    ],
  },
});
