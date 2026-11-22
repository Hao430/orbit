---
title: WebAssembly
summary: 可移植的二进制指令格式，让 C/C++/Rust 以接近原生性能运行在浏览器中。
tags: [语言, 运行时]
aliases: [WASM]
---
WebAssembly 是跨语言的运行时契约，也是连接渲染与工程两个星系的中继站。

典型场景：

- 图像与音视频编解码，服务于 [[WebGL与GPU]]
- 大型文档解析，接入 [[浏览器渲染管线]]
- 与 [[TypeScript类型系统]] 共享类型描述，通过工具链生成绑定

生态与工具链细节可以看 [[Rust与WASM]]。
