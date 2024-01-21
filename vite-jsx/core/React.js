const NODE_TYPE = {
  text: "TEXT_ELEMENT",
};

const EFFECT_TYPE = {
  new: "PLACEMENT",
  update: "UPDATE",
};

/**
 * 创建文本节点的虚拟节点
 * @param {string} text
 * @returns
 */
function createTextNode(text) {
  return {
    type: NODE_TYPE.text,
    props: {
      nodeValue: text,
      children: [],
    },
  };
}

/**
 * 创建节点的虚拟节点
 * @param {any} type
 * @param {any} props
 * @param  {...any} children
 * @returns
 */
function createElement(type, props = {}, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) => {
        const isTextNode = ["string", "number"].includes(typeof child);
        return isTextNode ? createTextNode(child) : child;
      }),
    },
  };
}

//* ==========  任务调度 ==========

//  下一个工作单元 (fiber结构)
let nextUnitOfWork = null;

//  记录根fiber，此时的fiber与初始的nextUnitOfWork相同
//  work in progress root  正在工作中的根节点
let wipRoot = null;

//  当前工作中的fc fiber
let wipFiber = null;

//  记录初始化后的root（commitRoot是赋值）
let currentRoot = null;

//  需要删除的dom，统一删除
let deletions = [];

//  开启任务调度
requestIdleCallback(workLoop);

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
    child: null,
    sibling: null,
  };

  nextUnitOfWork = wipRoot;
}

//  任务调度
function workLoop(deadline) {
  //  是否中断
  let shouldYield = false;

  while (!shouldYield && nextUnitOfWork) {
    //  run task
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);

    //  组件的更新，从自身fiber开始，到遇到他的兄弟节点结束
    if (wipRoot?.sibling?.type === nextUnitOfWork?.type) {
      nextUnitOfWork = null;
    }

    //  如果浏览器剩余的空闲时间不够，就中断
    shouldYield = deadline.timeRemaining() < 1;
  }

  //  如果此时没任务了，说明任务已经执行完毕，再一次性挂载dom
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  //  任务放到下次执行
  requestIdleCallback(workLoop);
}

//* ========== 统一提交 ==========
function commitRoot() {
  commitDeletion();
  commitWork(wipRoot.child);
  commitHooks();
  currentRoot = wipRoot;
  wipRoot = null;
  deletions = [];
}

function commitDeletion() {
  deletions.forEach((fiber) => {
    // fiber.parent.dom.removeChild(fiber.dom);

    //  向上一直找到有dom的父fiber
    let fiberParent = fiber.parent;
    while (!fiberParent.dom) {
      fiberParent = fiberParent.parent;
    }

    //  向下找到有dom的子fiber
    let fiberChild = fiber;
    while (!fiberChild.dom) {
      fiberChild = fiberChild.child;
    }

    fiberParent.dom.removeChild(fiberChild.dom);
  });
}

function commitWork(fiber) {
  if (!fiber) {
    return;
  }

  //  fix：此时组件不具备dom，所以要向上找他的父节点的dom
  //  fiber.parent.dom.append(fiber.dom);

  let fiberParent = fiber.parent;
  while (!fiberParent.dom) {
    fiberParent = fiberParent.parent;
  }

  if (fiber.efffectTag === EFFECT_TYPE.update) {
    if (fiber.dom) {
      updateProps(fiber.dom, fiber.props, fiber?.alternate?.props);
    }
  } else if (fiber.efffectTag === EFFECT_TYPE.new) {
    if (fiber.dom) {
      fiberParent.dom.append(fiber.dom);
    }
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

//  处理useEffect
function commitHooks() {
  //  从根节点开始，递归向下的执行useEffect

  function run(fiber) {
    if (!fiber) {
      return;
    }

    const oldFiber = fiber.alternate;

    //  如果没有alternate，说明是初始化
    if (!oldFiber) {
      fiber?.effectHooks?.forEach((hook) => {
        hook.cleanup = hook.callback();
      });
    } else {
      //  说明是更新
      const oldEffectHooks = oldFiber?.effectHooks;
      const newEffectHooks = fiber.effectHooks;

      newEffectHooks?.forEach((newEffectHook, hookIndex) => {
        if (newEffectHook.deps.length > 0) {
          const shouldUpdate = newEffectHook.deps.some((newDep, index) => {
            return oldEffectHooks[hookIndex].deps[index] !== newDep;
          });
          if (shouldUpdate) {
            newEffectHook.cleanup = newEffectHook.callback();
          }
        }
      });
    }

    run(fiber.child);
    run(fiber.sibling);
  }

  function runCleanup(fiber) {
    if (!fiber) {
      return;
    }

    const oldFiber = fiber.alternate;

    oldFiber?.effectHooks?.forEach((hook) => {
      hook.deps.length > 0 && hook.cleanup?.();
    });

    runCleanup(fiber.child);
    runCleanup(fiber.sibling);
  }

  runCleanup(wipRoot);
  run(wipRoot);
}

//* ========== 统一提交 ==========

function updateFunctionComponent(fiber) {
  //  每次处理fc的时候记录当前fiber，通过闭包记录起来
  wipFiber = fiber;

  stateHooks = [];
  stateHookIndex = 0;
  effectHooks = [];

  //  组件的type调用后是一个vdom对象
  const children = [fiber.type(fiber.props)];

  //  转换指针
  reconcileChildren(fiber, children);
}

function updateHostComponent(fiber) {
  if (!fiber.dom) {
    const dom = createDom(fiber.type);

    fiber.dom = dom;
    //  后置挂载dom
    // fiber.parent.dom.append(dom);

    updateProps(dom, fiber.props);
  }

  //  组件的type调用后是一个vdom对象
  const children = fiber.props.children;

  //  转换指针
  reconcileChildren(fiber, children);
}

/**
 * 执行当前工作单元的工作 (就是一个个的任务)
 * @param {*} fiber
 * @returns
 */
function performUnitOfWork(fiber) {
  const isFunctionComponent = typeof fiber.type === "function";

  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  //  返回下一个要处理的指针
  if (fiber.child) {
    return fiber.child;
  }

  let prevFiber = fiber;

  //  fix: 应该一直往上找，找到上层最近的兄弟节点
  while (prevFiber) {
    if (prevFiber.sibling) {
      return prevFiber.sibling;
    }
    prevFiber = prevFiber.parent;
  }
}

function createDom(type) {
  return type === NODE_TYPE.text
    ? document.createTextNode("")
    : document.createElement(type);
}

function updateProps(dom, nextProps, prevProps = {}) {
  //  新的也有，旧的有，覆盖
  Object.keys(nextProps).forEach((key) => {
    if (key !== "children") {
      if (key.startsWith("on")) {
        const event = key.slice(2).toLocaleLowerCase();
        dom.removeEventListener(event, prevProps[key]);
        dom.addEventListener(event, nextProps[key]);
      } else {
        dom[key] = nextProps[key];
      }
    }
  });

  //  旧的有，新的没有，移除
  Object.keys(prevProps).forEach((key) => {
    if (!nextProps[key]) {
      if (key !== "children") {
        if (key.startsWith("on")) {
          const event = key.slice(2).toLocaleLowerCase();
          dom.removeEventListener(event, prevProps[key]);
        } else {
          // dom[key] = nextProps[key];
          dom.removeAttribute(key);
        }
      }
    }
  });
}

function reconcileChildren(fiber, children) {
  //  更新前的fiber
  let oldFiber = fiber?.alternate?.child;

  //  遍历时候的上一个fiber，用于构建sibling
  let prevFiber = null;
  children.forEach((child, index) => {
    //  更新前后是否标签的类型一致
    const isSameType = oldFiber && oldFiber.type === child.type;

    let nextFiber;
    if (isSameType) {
      //  更新fiber
      nextFiber = {
        type: child.type,
        props: child.props,
        child: null,
        parent: fiber,
        sibling: null,
        dom: oldFiber.dom,
        alternate: oldFiber,
        efffectTag: EFFECT_TYPE.update,
      };
    } else {
      //  edgeCase:  false && <div></div>
      //  此时解析出来的child是false
      if (child) {
        //  新建fiber
        nextFiber = {
          type: child.type,
          props: child.props,
          child: null,
          parent: fiber,
          sibling: null,
          dom: null,
          alternate: null,
          efffectTag: EFFECT_TYPE.new,
        };
      }

      //  移除老节点
      if (oldFiber) {
        deletions.push(oldFiber);
      }
    }

    if (index === 0) {
      fiber.child = nextFiber;
    } else {
      prevFiber.sibling = nextFiber;
    }

    //  edgeCase: {false && <div></div>} => nextFiber = undefined;
    if (nextFiber) {
      prevFiber = nextFiber;
    }

    //  移动老的fiber
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }
  });

  //  说明旧节点比新节点多，需要移除
  while (oldFiber) {
    deletions.push(oldFiber);
    oldFiber = oldFiber.sibling;
  }
}

/**
 * 更新函数
 */
function update() {
  let currentFiber = wipFiber;

  return () => {
    wipRoot = currentFiber;
    wipRoot.alternate = currentFiber;
    nextUnitOfWork = wipRoot;
  };
}

//* ==========  任务调度 ==========

//* ==========  hook ==========

//  记录hook的顺序
let stateHooks = [];
//  记录当前执行到的hook
let stateHookIndex = 0;

function useState(initialValue) {
  let currentFiber = wipFiber;

  //  老的hook
  const oldHook = currentFiber.alternate?.stateHooks[stateHookIndex];

  let stateHook = {
    value: oldHook ? oldHook.value : initialValue,
    //  同一时间多次调用setState就保存起来
    queue: oldHook ? oldHook.queue : [],
  };

  stateHook.queue.forEach((action) => {
    stateHook.value = action(stateHook.value);
  });
  stateHook.queue = [];

  //  把hook存到fiber上
  stateHooks[stateHookIndex] = stateHook;
  currentFiber.stateHooks = stateHooks;
  stateHookIndex++;

  //  action可以传入function或者值
  const setState = (action) => {
    //  优化点：如果action每次传入的值都与当前值一样，就不需要更新
    const eagerValue = typeof action === "function" ? action() : action;
    if (eagerValue === stateHook.value) {
      return;
    }

    // stateHook.value = action(stateHook.value);
    stateHook.queue.push(typeof action === "function" ? action : () => action);

    wipRoot = {
      ...currentFiber,
      alternate: currentFiber,
    };

    nextUnitOfWork = wipRoot;
  };

  return [stateHook.value, setState];
}

//  记录effectHooks
let effectHooks = [];
function useEffect(callback, deps) {
  let currentFiber = wipFiber;

  let effectHook = {
    callback,
    deps,
    cleanup: null,
  };

  effectHooks.push(effectHook);

  currentFiber.effectHooks = effectHooks;
}

//* ==========  hook ==========

export default {
  render,
  createElement,
  update,
  useState,
  useEffect,
};
