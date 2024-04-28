# 调和 （Reconciliation）

按照前面的流程，已经实现挂载了，接下来我们就要考虑如何更新fiber树。

如果你对vue有一定程度的了解，其实这个过程就是 `patch`，简单来说就是对旧的vdom做更新，不过react这边换了描述叫 `reconciliation`。

因为react有fiber，**其实是对fiber做对比**，而不是拿jsx转换的vdom做对比，有一些区别。

## 准备工作

那么，我们就需要新增两个东西：

- 1、commit之后的root fiber，因为我们需要知道从哪里开始。我们定义为 `currentRoot`
- 2、每个fiber要新增一个属性保存之前的fiber状态，方便做对比，我们定义为 `alternate`

```js
/**
 * 渲染函数
 * @param {any} node 虚拟节点
 * @param {*} container  真实节点
 */
function render(node, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [node],
    },
    //  旧fiber
    alternate: currentRoot, // [!code ++]
  };

  nextUnitOfWork = wipRoot;
}


/**
 * 执行当前工作单元的工作 (就是一个个的任务)
 * @param {*} fiber
 * @returns
 */
function performUnitOfWork(fiber) {
  //*  创建节点，挂载到父节点上
  if (!fiber.dom) {
    const dom = createDom(fiber);
    fiber.dom = dom;
  }

  if (fiber.parent) {
    fiber.parent.dom.appendChild(fiber.dom);
  }
  //*  按照fiber的遍历规则，将children处理成fiber

  const { children = [] } = fiber.props;

  reconcileChildren(fiber, children); // [!code ++]

  //* 返回下一个要处理的fiber

  //  下面的一段理解成深度优先遍历
  if (fiber.child) {
    return fiber.child;
  }
  let curFiber = fiber;
  while (curFiber) {
    if (curFiber.sibling) {
      return curFiber.sibling;
    }
    curFiber = curFiber.parent;
  }
}


/**
 * 调和子元素
 * @param {*} fiber
 * @param {*} nodes 子元素结构为jsx转换后的vdom
 */
function reconcileChildren(fiber, nodes) {  // [!code ++]
  //  为了构建sibling，需要知道记录上一个fiber  // [!code ++]
  let prevFiber = null; // [!code ++]
  nodes.forEach((node, index) => {  // [!code ++]
    const newFiber = {  // [!code ++]
      type: node.type,  // [!code ++]
      props: node.props,  // [!code ++]
      parent: fiber,  // [!code ++]
      dom: null,  // [!code ++]
    };  // [!code ++]
    if (index === 0) {  // [!code ++]
      //  第一个子元素设为child // [!code ++]
      fiber.child = newFiber; // [!code ++]
    } else {  // [!code ++]
      //  后续的与前一个构建sibling // [!code ++]
      prevFiber.sibling = newFiber; // [!code ++]
    } // [!code ++]
    prevFiber = newFiber; // [!code ++]
  }); // [!code ++]
} // [!code ++]



//  =========== 统一提交 ===========
function commitRoot() {
  if (wipRoot) {
    //  为什么传child，是因为通过parent.dom就能拿到容器
    commitWork(wipRoot.child);
  }

  //  保存fiber入口
  currentRoot = wipRoot;  // [!code ++]

  //  处理完后置空
  wipRoot = null;
}

//  =========== 全局变量 ===========

//  下一个工作单元 (fiber结构)
let nextUnitOfWork = null;

//  工作中的根节点wipRoot (work in progress root)
let wipRoot = null;

//  完成工作后的根节点
let currentRoot = null;  // [!code ++]
```

## 完善reconcileChildren

这里可以划分出三种情况：

- 1、没有old fiber，有vdom，新增dom
- 2、有old fiber，有vdom，更新dom
- 3、有old fiber，没有vdom，删除dom
- <del>4、没有old fiber，没有vdom，你在想什么，虚空处理是吧</del>

上一章我们提到，dom操作要统一提交，目前我们只有新增dom的操作，并没有更新和删除。

所以，为了区分开这些dom的操作，我们给fiber加一个 `effectTag` 的属性，表示它是干嘛的。

另外，删除稍微特殊一点，因为这些节点是我们不想要的，所以**新的fiber树中不会记录这些fiber**。因此我们需要把这些需要删除的旧fiber单独收集起来，我们定义一个新的变量 `deletions` 来存储。

接下来我们就先完善reconcileChildren，把fiber都准备好。

```js

//  标志fiber在提交阶段的操作
const EFFECT_TAG = {  // [!code ++]
  update: "UPDATE", // [!code ++]
  new: "NEW", // [!code ++]
  delete: "DELETE", // [!code ++]
};

/**
 * 渲染函数
 * @param {any} node 虚拟节点
 * @param {*} container  真实节点
 */
function render(node, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [node],
    },
    alternate: currentRoot,
  };

  //  初始化
  deletions = []; // [!code ++]
  nextUnitOfWork = wipRoot;
}

/**
 * 调和子元素
 * @param {*} fiber
 * @param {*} nodes 子元素结构为jsx转换后的vdom
 */
function reconcileChildren(fiber, nodes) {
  //  为了构建sibling，需要知道记录上一个fiber
  let prevFiber = null;

  //  上一次提交后的fiber
  let oldFiber = fiber?.alternate?.child; // [!code ++]

  nodes.forEach((node, index) => {
    let newFiber = null;  // [!code ++]

    //  判断是类型是否相同
    const isSameType = oldFiber && node && oldFiber.type === node.type; // [!code ++]

    //  更新节点
    if (isSameType) {   // [!code ++]
      newFiber = {  // [!code ++]
        type: oldFiber.type,  // [!code ++]
        props: oldFiber.props,  // [!code ++]
        parent: fiber,  // [!code ++]
        alternate: oldFiber,  // [!code ++]
        dom: oldFiber.dom,  // [!code ++]
        effectTag: EFFECT_TAG.update, // [!code ++]
      };
    }
    //  挂载or新增节点
    if (node && !isSameType) {  // [!code ++]
      newFiber = {  // [!code ++]
        type: node.type,  // [!code ++]
        props: node.props,  // [!code ++]
        parent: fiber,  // [!code ++]
        alternate: null,  // [!code ++]
        dom: null,  // [!code ++]
        effectTag: EFFECT_TAG.new,  // [!code ++]
      };  // [!code ++]
    } // [!code ++]
    //  移除节点
    if (oldFiber && !isSameType) {  // [!code ++]
      oldFiber.effectTag = EFFECT_TAG.delete; // [!code ++]
      deletions.push(oldFiber); // [!code ++]
    } // [!code ++]

    // const newFiber = { // [!code --]
    //   type: node.type, // [!code --]
    //   props: node.props, // [!code --]
    //   parent: fiber, // [!code --]
    //   dom: null, // [!code --]
    // }; // [!code --]

    if (index === 0) {
      //  第一个子元素设为child
      fiber.child = newFiber;
    } else {
      //  后续的与前一个构建sibling
      prevFiber.sibling = newFiber;
    }

    prevFiber = newFiber;

    oldFiber = oldFiber?.sibling;
  });
}

// ===========  统一提交处理 ===========

/**
 * 统一提交
 */
function commitRoot() {
  if (wipRoot) {
    //  批量删除节点
    commitDeletion(); // [!code ++]
    //  为什么传child，是因为通过parent.dom就能拿到容器
    commitWork(wipRoot.child);
  }

  //  保存fiber入口
  currentRoot = wipRoot;

  //  处理完后置空
  wipRoot = null;
}

/**
 * 删除不需要的节点
 */
function commitDeletion() { // [!code ++]
  //...  // [!code ++]
}// [!code ++]

//  =========== 全局变量 ===========

//  下一个工作单元 (fiber结构)
let nextUnitOfWork = null;

//  工作中的根节点wipRoot (work in progress root)
let wipRoot = null;

//  完成工作后的根节点
let currentRoot = null;

//  记录需要移除dom的fiber
let deletions = []; // [!code ++]
```

## 完善dom操作

上面我们提到，我们通过fiber的effectTag来区分要具体做什么dom操作。之前我们的commitWork只能做到新增，肯定是不符合的，所以我们需要对  `commitWork` 做改造，让其可以通过 `effectTag` 做相应的dom操作。

### 删除

```js
/**
 * 挂载节点
 * @param {*} fiber
 */
function commitWork(fiber) {
  if (!fiber) {
    return;
  }

  switch (fiber.effectTag) {
    case EFFECT_TAG.new: {
      //  ...
      break;
    }

    case EFFECT_TAG.update: {
      //  ...
      break;
    }

    case EFFECT_TAG.delete: { // [!code ++]
      //  递归向上需要找到有dom节点的fiber，后面实现组件渲染的时候，组件类型的fiber没有dom  // [!code ++]
      let fiberParent = fiber.parent; // [!code ++]
      while (!fiberParent.dom) {  // [!code ++]
        fiberParent = fiberParent.parent; // [!code ++]
      } // [!code ++]
      //  同样的，需要向下递归找到有dom的子节点 // [!code ++]
      let fiberChild = fiber; // [!code ++]
      while (!fiberChild.dom) { // [!code ++]
        fiberChild = fiberChild.child;  // [!code ++]
      } // [!code ++]
      //  移除dom // [!code ++]
      fiberParent.dom.removeChild(fiberChild.dom);  // [!code ++]
      //  delete是特殊的，我们只需要把deletions中的移除掉即可，不需要去管child和sibling // [!code ++]
      return; // [!code ++]
    } // [!code ++]

    default: {
      if (fiber.effectTag) {
        console.warn("检测到未知类型的effect tag:", fiber.effectTag);
      }
      break;
    }
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

/**
 * 删除不需要的节点
 */
function commitDeletion() {
  deletions.forEach((fiber) => {  // [!code ++]
    commitWork(fiber);  // [!code ++]
  }); // [!code ++]
}
```


### 更新

```js
/**
 * 是否是属性
 * @param {string} key
 * @returns
 */
const isProperty = (key) => key !== "children"; // [!code ++]

/**
 * 是否为该移除的属性
 * @param {Record<string, any>} nextProps
 * @returns {(key: string) => boolean}
 */
const isRemoveProperty = (nextProps) => (key) => !Object.hasOwn(nextProps, key);  // [!code ++]

/**
 * 是否是事件属性
 * @param {string} key
 * @returns {boolean}
 */
const isEvent = (key) => key.startsWith("on");  // [!code ++]

/**
 * 获取事件名
 * @param {string} key
 * @returns
 */
const getEventName = (key) => key.slice(2).toLocaleLowerCase(); // [!code ++]

/**
 * 更新属性
 * @param {HTMLElement} dom
 * @param {Record<string, any>} nextProps 新的属性
 * @param {Record<string, any>} prevProps 旧的属性
 */
function updateProps(dom, nextProps, prevProps = {}) {  // [!code ++]
  //  新属性有，旧属性也有，直接新的覆盖旧的
  Object.keys(nextProps)
    .filter(isProperty)
    .forEach((key) => {
      //  处理事件
      if (isEvent(key)) {
        const eventName = getEventName(key);
        dom.removeEventListener(eventName, prevProps[key]);
        dom.addEventListener(eventName, nextProps[key]);
      } else {
        //  普通的属性
        dom[key] = nextProps[key];
      }
    });

  //  新属性没有，旧属性有，需要删除
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isRemoveProperty(nextProps))
    .forEach((key) => {
      //  处理事件
      if (isEvent(key)) {
        const eventName = getEventName(key);
        dom.removeEventListener(eventName, prevProps[key]);
      } else {
        //  普通的属性
        dom.removeAttribute(key);
      }
    });
}

/**
 * 挂载节点
 * @param {*} fiber
 */
function commitWork(fiber) {
  if (!fiber) {
    return;
  }

  switch (fiber.effectTag) {
    case EFFECT_TAG.new: {
      //  ...
      break;
    }

    case EFFECT_TAG.update: { // [!code ++]
      if (fiber.dom) {  // [!code ++]
        updateProps(fiber.dom, fiber.props, fiber.alternate?.props);  // [!code ++]
      } // [!code ++] 
      break;  // [!code ++]
    } // [!code ++]

    case EFFECT_TAG.delete: {
      //  ...
      break;
    }

    default: {
      if (fiber.effectTag) {
        console.warn("检测到未知类型的effect tag:", fiber.effectTag);
      }
      break;
    }
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}
```

### 创建

这里有一些小重构，因为我们上面已经有 `updateProps` 去处理props了， `createDom` 部分就不需要去处理了。

```js

/**
 * 根据fiber创建dom
 * @param {*} fiber
 */
function createDom(fiber) {
  //  1、创建dom
  const dom =
    fiber.type === NODE_TYPE.text
      ? document.createTextNode("")
      : document.createElement(fiber.type);

  //  2、处理props  // [!code --]
  Object.keys(fiber.props).forEach((key) => { // [!code --]
    if (key !== "children") { // [!code --]
      dom[key] = fiber.props[key];  // [!code --]
    } // [!code --]
  }); // [!code --]

  return dom;
}

/**
 * 执行当前工作单元的工作 (就是一个个的任务)
 * @param {*} fiber
 * @returns
 */
function performUnitOfWork(fiber) {
  //*  创建节点，挂载到父节点上
  if (!fiber.dom) {
    const dom = createDom(fiber);
    fiber.dom = dom;

    //  转而在这里去处理props // [!code ++]
    updateProps(dom, fiber.props);  // [!code ++]
  }

  //  ...
}

/**
 * 挂载节点
 * @param {*} fiber
 */
function commitWork(fiber) {
  if (!fiber) {
    return;
  }

  switch (fiber.effectTag) {
    case EFFECT_TAG.new: {  // [!code ++]
      if (fiber.dom) {  // [!code ++]
        //  一直向上找到有dom的父节点 // [!code ++]
        let fiberParent = fiber.parent; // [!code ++]
        while (!fiberParent.dom) {  // [!code ++]
          fiberParent = fiberParent.parent; // [!code ++]
        } // [!code ++]
        const domParent = fiberParent.dom;  // [!code ++]
        domParent.appendChild(fiber.dom); // [!code ++]
      } // [!code ++]
      break;  // [!code ++]
    } // [!code ++]

    case EFFECT_TAG.update: {
      //  ...
      break;
    }

    case EFFECT_TAG.delete: {
      //  ...
      break;
    }

    default: {
      if (fiber.effectTag) {
        console.warn("检测到未知类型的effect tag:", fiber.effectTag);
      }
      break;
    }
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}
```