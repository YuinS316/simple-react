const NODE_TYPE = {
  text: "TEXT_ELEMENT",
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
        return typeof child === "string" ? createTextNode(child) : child;
      }),
    },
  };
}

//* ==========  任务调度 ==========

//  下一个工作单元 (fiber结构)
let nextUnitOfWork = null;

//  记录根fiber，此时的fiber与初始的nextUnitOfWork相同
let root = null;

//  开启任务调度
requestIdleCallback(workLoop);

/**
 * 渲染函数
 * @param {any} node 虚拟节点
 * @param {*} container  真实节点
 */
function render(node, container) {
  nextUnitOfWork = {
    dom: container,
    props: {
      children: [node],
    },
    child: null,
    sibling: null,
  };

  root = nextUnitOfWork;
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
  if (!nextUnitOfWork && root) {
    commitRoot();
  }

  //  任务放到下次执行
  requestIdleCallback(workLoop);
}

//* ========== 统一提交 ==========
function commitRoot() {
  commitWork(root.child);
  root = null;
}

function commitWork(fiber) {
  if (!fiber) {
    return;
  }
  fiber.parent.dom.append(fiber.dom);
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

//* ========== 统一提交 ==========

/**
 * 执行当前工作单元的工作 (就是一个个的任务)
 * @param {*} fiber
 * @returns
 */
function performUnitOfWork(fiber) {
  //  没有dom的时候再创建，避免处理根节点
  if (!fiber.dom) {
    const dom = createDom(fiber.type);

    fiber.dom = dom;
    //  后置挂载dom
    // fiber.parent.dom.append(dom);

    updateProps(dom, fiber.props);
  }

  //  转换指针
  initChildren(fiber);

  //  返回下一个要处理的指针
  if (fiber.child) {
    return fiber.child;
  }

  if (fiber.sibling) {
    return fiber.sibling;
  }

  return fiber.parent?.sibling;
}

function createDom(type) {
  return type === NODE_TYPE.text
    ? document.createTextNode("")
    : document.createElement(type);
}

function updateProps(dom, props) {
  Object.keys(props).forEach((key) => {
    if (key !== "children") {
      dom[key] = props[key];
    }
  });
}

function initChildren(fiber) {
  let prevFiber = null;
  fiber.props.children.forEach((child, index) => {
    const nextFiber = {
      type: child.type,
      props: child.props,
      child: null,
      parent: fiber,
      sibling: null,
      dom: null,
    };

    if (index === 0) {
      fiber.child = nextFiber;
    } else {
      prevFiber.sibling = nextFiber;
    }

    prevFiber = child;
  });
}

//* ==========  任务调度 ==========

export default {
  render,
  createElement,
};
