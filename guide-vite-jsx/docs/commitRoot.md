# 统一提交

统一提交就在先把fiber构建完成后，再去挂载dom。但是为什么要这么干？下面看下原因：


## performUnitOfWork 的缺陷

还记的上节我们实现的 `performUnitOfWork` 吗？里面有这么一段细节：

**每次构建fiber，都会把真实dom渲染上去**

```js
function performUnitOfWork(fiber) {
  //*  创建节点，挂载到父节点上
  if (!fiber.dom) {
    const dom = createDom(fiber);
    fiber.dom = dom;
  }

  if (fiber.parent) {       // [!code warning]
    fiber.parent.dom.appendChild(fiber.dom);    // [!code warning]
  }   // [!code warning]

  //  ...
}
```

以及你是否记得，我们的**渲染是可中断的**。

```js
//  即将执行的工作单元 (fiber结构)
let nextUnitOfWork = null;

/**
 * 任务调度
 * @param {IdleDeadline} deadline
 */
function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {  // [!code warning]
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork); // [!code warning]
    shouldYield = deadline.timeRemaining() < 1; // [!code warning]
  } // [!code warning]
  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);
```

所以，我们是有可能看到这么一个场景的：

如果dom节点比较多，然后同时用户有高优先级的任务打断渲染，然后我们就看到了渲染了一半的界面，然后等到高优先级任务处理完，再接着渲染另一半。

好家伙，那并不是用户想要的。

所以我们就要**保证在挂载真实dom的时候不能被打断**。

## 改造代码

要实现这个目的，我们要做的事情也十分的清楚：

- 1、首先，`performUnitOfWork` 里就不能把节点挂上去

- 2、要保留最开始的根fiber，因为我们要从根节点开始渲染

- 3、挂载真实dom的步骤应该是在 `workLoop` 把所有fiber都构建好后执行

```js

function performUnitOfWork(fiber) {
  //*  创建节点，挂载到父节点上
  if (!fiber.dom) {
    const dom = createDom(fiber);
    fiber.dom = dom;
  }

  //  1、移除掉dom的挂载
  if (fiber.parent) {       // [!code --]
    fiber.parent.dom.appendChild(fiber.dom);    // [!code --]
  }   // [!code --]

  //  ...
}


/**
 * 渲染函数
 * @param {any} node 虚拟节点
 * @param {*} container  真实节点
 */
function render(node, container) {
  //  2、保留根节点
  wipRoot = {             // [!code ++]
    dom: container,
    props: {
      children: [node],
    },
  };

  nextUnitOfWork = wipRoot; // [!code ++]
}

//  下一个工作单元 (fiber结构)
let nextUnitOfWork = null;

//  工作中的根节点wipRoot (work in progress root)
let wipRoot = null; // [!code ++]

/**
 * 任务调度
 * @param {IdleDeadline} deadline
 */
function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  //  3、判断fiber是否执行完毕，是的话执行挂载
  if (!nextUnitOfWork && wipRoot) {   // [!code ++]
    commitRoot(); // [!code ++]
  } // [!code ++]

  requestIdleCallback(workLoop);
}


/**
 * 统一提交
 */
function commitRoot() { // [!code ++]
  if (wipRoot) {  // [!code ++]
    //  为什么传child，是因为通过parent.dom就能拿到容器 // [!code ++]
    commitWork(wipRoot.child);  // [!code ++]
  } // [!code ++]
  //  处理完后置空  // [!code ++]
  wipRoot = null; // [!code ++]
} // [!code ++]

/**
 * 挂载节点
 * @param {*} fiber
 */
function commitWork(fiber) {  // [!code ++]
  if (!fiber) { // [!code ++]
    return; // [!code ++]
  } // [!code ++]
  const domParent = fiber.parent.dom; // [!code ++]
  domParent.appendChild(fiber.dom); // [!code ++]
  commitWork(fiber.child);  // [!code ++]
  commitWork(fiber.sibling);  // [!code ++]
}

```