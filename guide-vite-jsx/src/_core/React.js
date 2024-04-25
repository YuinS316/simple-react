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

/**
 * 根据fiber
 * @param {*} fiber
 */
function createDom(fiber) {
  //  1、创建dom
  const dom =
    fiber.type === NODE_TYPE.text
      ? document.createTextNode("")
      : document.createElement(fiber.type);

  //  2、处理props
  Object.keys(fiber.props).forEach((key) => {
    if (key !== "children") {
      dom[key] = fiber.props[key];
    }
  });

  return dom;
}

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
  };

  nextUnitOfWork = wipRoot;
}

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

  //  判断fiber是否执行完毕，是的话执行挂载
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
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

  //  为了构建sibling，需要知道记录上一个fiber
  let prevFiber = null;

  children.forEach((node, index) => {
    const newFiber = {
      type: node.type,
      props: node.props,
      parent: fiber,
      dom: null,
    };

    if (index === 0) {
      //  第一个子元素设为child
      fiber.child = newFiber;
    } else {
      //  后续的与前一个构建sibling
      prevFiber.sibling = newFiber;
    }

    prevFiber = newFiber;
  });

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

// ===========  统一提交处理 ===========

/**
 * 统一提交
 */
function commitRoot() {
  if (wipRoot) {
    //  为什么传child，是因为通过parent.dom就能拿到容器
    commitWork(wipRoot.child);
  }
  //  处理完后置空
  wipRoot = null;
}

/**
 * 挂载节点
 * @param {*} fiber
 */
function commitWork(fiber) {
  if (!fiber) {
    return;
  }

  const domParent = fiber.parent.dom;
  domParent.appendChild(fiber.dom);
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

//  =========== 全局变量 ===========

//  下一个工作单元 (fiber结构)
let nextUnitOfWork = null;

//  工作中的根节点wipRoot (work in progress root)
let wipRoot = null;

requestIdleCallback(workLoop);

export default {
  render,
  createElement,
};
