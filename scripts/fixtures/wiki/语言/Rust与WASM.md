---
title: Rust与WASM
summary: Rust 的所有权模型与零成本抽象，使其成为编译到 WebAssembly 的首选语言之一。
tags: [语言, Rust]
aliases: [wasm入门, Rust]
---
Rust 编译到 wasm32 目标后，产物小、无 GC 停顿，适合计算密集场景。

与 [[WebAssembly]] 的关系类似 JVM 字节码与 Java，但更贴近机器模型。
