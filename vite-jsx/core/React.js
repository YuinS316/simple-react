const NODE_TYPE = {
  text: "TEXT_ELEMENT",
};

const EFFECT_TYPE = {
  new: "PLACEMENT",
  update: "UPDATE"
}

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

//  记录初始化后的root（commitRoot是赋值）
let currentRoot = null;

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
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
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
      updateProps(fiber.dom, fiber.props, fiber?.alternate?.props)
    }
  } else if (fiber.efffectTag === EFFECT_TYPE.new) {
    if (fiber.dom) {
      fiberParent.dom.append(fiber.dom);
    }
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

//* ========== 统一提交 ==========

function updateFunctionComponent(fiber) {
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

  const isFunctionComponent = typeof fiber.type === 'function';

  if (isFunctionComponent) {
    updateFunctionComponent(fiber)
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

  //  旧的有，新的也有，覆盖
  Object.keys(nextProps).forEach((key) => {

    if (prevProps[key]) {
      if (key !== "children") {
        if (key.startsWith('on')) {
          const event = key.slice(2).toLocaleLowerCase();
          dom.removeEventListener(event, prevProps[key]);
          dom.addEventListener(event, nextProps[key])
        } else {
          dom[key] = nextProps[key];
        }
      }
    }
  });

  //  新的有，旧的没有，挂载
  Object.keys(nextProps).forEach((key) => {
    if (!prevProps[key]) {
      if (key !== "children") {
        if (key.startsWith('on')) {
          const event = key.slice(2).toLocaleLowerCase();
          dom.addEventListener(event, nextProps[key])
        } else {
          dom[key] = nextProps[key];
        }
      }
    }
  });

  //  旧的有，新的没有，移除
  Object.keys(prevProps).forEach(key => {
    if (!nextProps[key]) {
      if (key !== "children") {
        if (key.startsWith('on')) {
          const event = key.slice(2).toLocaleLowerCase();
          dom.removeEventListener(event, prevProps[key])
        } else {
          // dom[key] = nextProps[key];
          dom.removeAttribute(key);
        }
      }
    }
  })
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
        efffectTag: EFFECT_TYPE.update
      };
    } else {
      //  新建fiber
      nextFiber = {
        type: child.type,
        props: child.props,
        child: null,
        parent: fiber,
        sibling: null,
        dom: null,
        alternate: null,
        efffectTag: EFFECT_TYPE.new
      };
    }

    if (index === 0) {
      fiber.child = nextFiber;
    } else {
      prevFiber.sibling = nextFiber;
    }

    prevFiber = nextFiber;

    //  移动老的fiber
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }
  });
}

/**
 * 更新函数
 */
function update() {
  wipRoot = {
    dom: currentRoot.dom,
    props: currentRoot.props,
    alternate: currentRoot
  };

  nextUnitOfWork = wipRoot;
}

//* ==========  任务调度 ==========

export default {
  render,
  createElement,
  update,
};
