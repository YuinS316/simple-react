# 并发模式（concurrent mode）

## 并发模式的必要性

注意到上一节我们的render是通过递归实现的。

一旦我们开始渲染，那么我们直到整颗树完成前，主线程都会被阻塞，期间我们无法做任何事情。

这就意味着，假设这颗树很大，那么这会阻塞主线程很久，如果期间用户输入、动画等高优先级的事件需要优先处理的时候，
都无法进行。

所以，我们要考虑的事情就是：

- 1、**如何可以不阻塞主线程**

- 2、如何把**任务中断**

- 3、以及任务我不想重头开始跑，是否可以**任务恢复**

下面我们就来探究这两个点。

```js{22,23,24}
/**
 * 渲染函数
 * @param {any} node 虚拟节点
 * @param {*} container  真实节点
 */
function render(node, container) {
  //  1、创建dom
  const dom =
    node.type === NODE_TYPE.text
      ? document.createTextNode("")
      : document.createElement(node.type);

  //  2、处理props
  Object.keys(node.props).forEach((key) => {
    if (key !== "children") {
      dom[key] = node.props[key];
    }
  });

  //  3、处理children
  const children = node.props.children || [];
  children.forEach((child) => {
    render(child, dom);
  });

  //  4、挂载dom
  container.append(dom);
}
```

## requestIdleCallback

要实现不阻塞主线程，我们先谈一下 [`requestIdleCallback`](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestIdleCallback) 这个api。

> [!TIP]
> react并没有使用原生的 `requestIdleCallback`，而是自己实现了一个类似的功能 [scheduler](https://github.com/facebook/react/tree/main/packages/scheduler)

简单来说，这个这个api的使用方式类似于 `setTimeout`，可以接受一个回调函数，然后 **函数将在浏览器空闲时期被调用**。这使开发者能够在主事件循环上执行后台和低优先级工作，而不会影响延迟关键事件，如动画和输入响应。

你可以copy一下这段代码体验下。


```js
let taskId = 0;

/**
 * 任务调度
 * @param {IdleDeadline} deadline 
 */
function workLoop(deadline) {
  taskId++;

  //  是否中断
  let shouldYield = false;

  while (!shouldYield) {
    //  run task
    console.log(`taskId:${taskId} is runing task`);

    //  如果浏览器剩余的空闲时间不够，就中断
    shouldYield = deadline.timeRemaining() < 1;
  }

  //  强制终止
  if (taskId >= 10) {
    return;
  }

  //  任务放到下次执行
  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)
```

![workLoop](/images/2.png)

## 工作单元 (unitOfWork)

为了让任务可中断，我们需要把任务拆分成一个个单元（unit），再慢慢执行这些单元。如果浏览器有更高优先级的任务需要处理时，也可以停下来，处理其他事情。

然后这个工作单元的具体细节我们下节再说，我们把workloop完善下。

```js
//  下一个工作单元 (fiber结构)
let nextUnitOfWork = null
​
/**
 * 任务调度
 * @param {IdleDeadline} deadline 
 */
function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(
      nextUnitOfWork
    )
    shouldYield = deadline.timeRemaining() < 1
  }
  requestIdleCallback(workLoop)
}
​
requestIdleCallback(workLoop)
​
/**
 * 执行当前工作单元的工作 (就是一个个的任务)
 * @param {*} fiber
 * @returns
 */
function performUnitOfWork(fiber) {
  // TODO
}
```