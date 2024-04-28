const NODE_TYPE = {
  text: "TEXT_ELEMENT",
};

const EFFECT_TAG = {
  update: "UPDATE",
  new: "NEW",
  delete: "DELETE",
};

// =========== dom操作 ===========

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
 * 根据fiber创建dom
 * @param {*} fiber
 */
function createDom(fiber) {
  //  1、创建dom
  const dom =
    fiber.type === NODE_TYPE.text
      ? document.createTextNode("")
      : document.createElement(fiber.type);

  //  2、处理props
  // Object.keys(fiber.props).forEach((key) => {
  //   if (key !== "children") {
  //     dom[key] = fiber.props[key];
  //   }
  // });

  return dom;
}

/**
 * 是否是属性
 * @param {string} key
 * @returns
 */
const isProperty = (key) => key !== "children";

/**
 * 是否为该移除的属性
 * @param {Record<string, any>} nextProps
 * @returns {(key: string) => boolean}
 */
const isRemoveProperty = (nextProps) => (key) => !Object.hasOwn(nextProps, key);

/**
 * 是否是事件属性
 * @param {string} key
 * @returns {boolean}
 */
const isEvent = (key) => key.startsWith("on");

/**
 * 获取事件名
 * @param {string} key
 * @returns
 */
const getEventName = (key) => key.slice(2).toLocaleLowerCase();

/**
 * 更新属性
 * @param {HTMLElement} dom
 * @param {Record<string, any>} nextProps 新的属性
 * @param {Record<string, any>} prevProps 旧的属性
 */
function updateProps(dom, nextProps, prevProps = {}) {
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

// ===========  统一提交处理 ===========

/**
 * 统一提交
 */
function commitRoot() {
  if (wipRoot) {
    //  批量删除节点
    commitDeletion();
    //  为什么传child，是因为通过parent.dom就能拿到容器
    commitWork(wipRoot.child);
  }

  //  保存fiber入口
  currentRoot = wipRoot;

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

  switch (fiber.effectTag) {
    case EFFECT_TAG.new: {
      if (fiber.dom) {
        //  一直向上找到有dom的父节点
        let fiberParent = fiber.parent;
        while (!fiberParent.dom) {
          fiberParent = fiberParent.parent;
        }

        const domParent = fiberParent.dom;
        domParent.appendChild(fiber.dom);
      }
      break;
    }

    case EFFECT_TAG.update: {
      if (fiber.dom) {
        updateProps(fiber.dom, fiber.props, fiber.alternate?.props);
      }
      break;
    }

    case EFFECT_TAG.delete: {
      //  递归向上需要找到有dom节点的fiber，后面实现组件渲染的时候，组件类型的fiber没有dom
      let fiberParent = fiber.parent;
      while (!fiberParent.dom) {
        fiberParent = fiberParent.parent;
      }

      //  同样的，需要向下递归找到有dom的子节点
      let fiberChild = fiber;
      while (!fiberChild.dom) {
        fiberChild = fiberChild.child;
      }

      fiberParent.dom.removeChild(fiberChild.dom);

      //  delete是特殊的，我们只需要把deletions中的移除掉即可，不需要去管child和sibling
      return;
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

/**
 * 删除不需要的节点
 */
function commitDeletion() {
  deletions.forEach((fiber) => {
    commitWork(fiber);
  });
}

//  =========== render ===========

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

  deletions = [];
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

    updateProps(dom, fiber.props);
  }

  //*  按照fiber的遍历规则，将children处理成fiber

  const { children = [] } = fiber.props;

  reconcileChildren(fiber, children);

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
function reconcileChildren(fiber, nodes) {
  //  为了构建sibling，需要知道记录上一个fiber
  let prevFiber = null;

  //  上一次提交后的fiber
  let oldFiber = fiber?.alternate?.child;

  nodes.forEach((node, index) => {
    let newFiber = null;

    //  判断是类型是否相同
    const isSameType = oldFiber && node && oldFiber.type === node.type;

    //  更新节点
    if (isSameType) {
      newFiber = {
        type: node.type,
        props: node.props,
        parent: fiber,
        alternate: oldFiber,
        dom: oldFiber.dom,
        effectTag: EFFECT_TAG.update,
      };
    }

    //  挂载or新增节点
    if (node && !isSameType) {
      newFiber = {
        type: node.type,
        props: node.props,
        parent: fiber,
        alternate: null,
        dom: null,
        effectTag: EFFECT_TAG.new,
      };
    }

    //  移除节点
    if (oldFiber && !isSameType) {
      oldFiber.effectTag = EFFECT_TAG.delete;
      deletions.push(oldFiber);
    }

    if (index === 0) {
      //  第一个子元素设为child
      fiber.child = newFiber;
    } else {
      //  后续的与前一个构建sibling
      prevFiber.sibling = newFiber;
    }

    if (newFiber) {
      prevFiber = newFiber;
    }

    oldFiber = oldFiber?.sibling;
  });
}

//  =========== 全局变量 ===========

//  下一个工作单元 (fiber结构)
let nextUnitOfWork = null;

//  工作中的根节点wipRoot (work in progress root)
let wipRoot = null;

//  完成工作后的根节点
let currentRoot = null;

//  记录需要移除的fiber
let deletions = [];

requestIdleCallback(workLoop);

export default {
  render,
  createElement,
};
