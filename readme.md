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

### 同一提交

之前的操作是每次处理完一个任务，就挂载 dom，就可能会导致之前说到的用户看到了渲染了一半的 dom，但是后面的 dom 要等浏览器空闲才能渲染，体验不好。

所以，我们可以把渲染 dom 的这个动作后置，等到所有的任务处理完了再进行渲染。

### Function Component

之前的例子中，只支持了 `<div>`, `123` 这种标签或者文本节点的形式。如果是 `<App>` 这种是不支持的。

jsx 会解析成 `type: function App() {}` 这种形式

所以在 `performUnitOfWork` 的时候需要进行判断 `type` 是否是函数，就能推断出是否为函数组件。

然后调用 `type` 之后会返回一个 `vdom` 对象，此时要用数组进行包裹，丢到 `initChildren` 中进行处理。

另外，还要注意的是，函数组件自身并不具备 `dom` 这个属性，所以，他的 `children` 要挂载到函数组件的父节点上。但是，他的父节点也可能是函数组件，
所以要递归的往上找一个有 `dom` 的节点（不可能为空，根节点必定有真实的`dom`。

同时修复了一个挂载 dom 的 bug，在找处理完子节点和兄弟节点后，必须要递归向上的找到最近的叔叔节点。此前只向上找了一步，导致在多节点的情况下渲染不完整。

### Update

react 中如何找到修改后的节点？

fiber 结构中有 alternate 这个属性，他主要是在 update 的时候，指向旧 fiber 中的对应的节点。这样就可以高效的找到对应的节点。

```
    旧的fiber                新的fiber
      a   <- alternate        a
    /   \                  /    \
   b  -> c                b  ->  c
```

a.alternate.child 即可获取到旧 fiber 的 child，记为 oldFiber
再通过 oldFiber.sibling 即可获取到兄弟节点

可以看到，通过 alternate 轻易的将新旧 fiber 联系起来

过程：

在 commitRoot 结束后，我们需要记录当前的根 fiber 到 currentRoot;

然后从 currentRoot 新建一个 fiber，同时不要忘记设置 dom，和 alternate；

然后到 performUnitOfWork，处理 reconcileChildren 的时候，需要添加额外的操作，需要标记当前的 fiber 是新建还是更新，然后更新 fiber;

最后，在 commitWork 的时候根据 fiber 是新建还是更新，决定是 append 还是 updateProps 即可。

### hooks

react 中，hook 是存在于 fiber 节点中的，并且 fiber 是用数组的形式存储 hook。

所以有一道经典的面试题：为什么 hook 不能写在判断语句 或者在函数内部执行？ 这就是答案。

因为 hooks 必须按顺序执行，不然无法保证结果。

### useState

为什么组件通过 useState 可以拥有状态，更新的时候组件不是会重新执行吗？

因为 useState 把当前组件的状态记录到 fiber 中，通过 setState 更新组件的时候，他会通过 alternate 获取到旧的 hook 的状态，
然后在通过存储了调用 setState 的队列来计算出最新的 state 值，再返回出去，这样就达到了目的。
