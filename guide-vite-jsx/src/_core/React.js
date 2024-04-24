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

export default {
  render,
  createElement,
};
