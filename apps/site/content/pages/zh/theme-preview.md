---
title: 试试你的主题
description: 在自定义 Svelte 页面里调整颜色和圆角。
layout: page
---

这个页面通过 Vite 插件的 `pageComponents` 注册 Svelte 组件。组件使用 `useSvedocsTheme()` 读取当前语言和站点配置。

颜色和圆角控件只修改局部预览。把生成的值复制到配置里的 `theme.palette.accent` 和 `theme.radius` 即可使用。

注册方式见[主题自定义](/docs/zh/configuration/theme)。
