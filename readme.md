# 学习笔记

## 思考过程

### 为什么需要任务调度器

如果递归的 render 函数，在遇到 dom 树特别巨大的情况下，会一直递归导致主线程阻塞，页面变得十分卡顿。

此时如果能将 render 拆分，在浏览器每次空闲的时间进行，那么就不会导致卡顿。

此时带来另一个问题：如果进行到一半的时候，浏览器没有空闲时间，这时候只渲染了一部分的 dom，用户等了好久都没看到后续的 dom，此时需要怎么解决？

相关 api： `requestIdleCallback`, `deadline.timeReamining`

### 为什么需要 fiber

为了让任务可中断，我们最好是采用链表的结构，那么只要获取到当前节点，就能知道上次执行到哪里，恢复起来也更简单。

fiber 的遍历规则

1、child (孩子)
2、sibling (兄弟)
3、叔叔

比如有如下 fiber 结构的

```
      a
    /   \
   b  -> c
  / \   / \
 d-> e f-> g
```

a -> b (child)
b -> d (child)
d -> e (sibling)
e -> c (uncle)
c -> f (child)
f -> g (sibling)

### 关于任务调度

任务调度的最小单位是称为 Fiber 的数据结构，代码中为 `nextUnitOfWork`，每个节点都代表了一个可中断的工作单元；

通过调用 `performUnitOfWork` 去执行一个个任务。
