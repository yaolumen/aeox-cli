---
name: typescript
description: TypeScript 代码规范
globs: ["*.ts", "*.tsx"]
keywords: ["typescript", "TS", "类型"]
---

# TypeScript 规范

- 严格类型：禁止 any，禁止 as 类型断言（确有必要时注释说明原因）
- 对象字面量、函数参数、返回值都显式标注类型，不给类型推断留歧义
- 优先用 interface 定义对象形状，type 用于联合类型和类型工具
- 异步代码统一用 async/await，不用裸 .then 链
- 错误必须处理，禁止空 catch 块
- 优先 const；只在确实需要重赋值时用 let，禁止 var
