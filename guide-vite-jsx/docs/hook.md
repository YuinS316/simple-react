# Hook

接下来我们来实现两个hook，`useState` 和 `useEffect`

## useState

先来一个经典的例子

```jsx
export function Counter() {
  const [count, setCount] = useState(0);

  const [foo, setFoo] = useState(2);

  function handleAdd() {
    setCount((c) => c + 1);
  }

  function handleFoo() {
    setFoo((f) => f * 2);
  }

  return (
    <div>
      <div>count: {count}</div>
      <div>
        <button onClick={handleAdd}>add</button>
      </div>
      <div>foo: {foo}</div>
      <div>
        <button onClick={handleFoo}>multiple</button>
      </div>
    </div>
  );
}
```

我们需要提供一个 `useState` 函数，然后返回一个数组，第一项是状态，第二项是更新状态的函数。

其中这个更新状态的函数接受的是一个回调函数，里面是我们如何更新的操作。

### 准备工作

首先请先梳理下执行的顺序：

- 1、performUnitOfWork
- 2、updateFunctionComponent
- 3、**执行函数组件获取children**
- 4、reconcileChildren
- 5、commitWork

也就是说 `useState` 在第三步中，函数组件执行后执行，所以我们可以在第二步的时候做些准备工作。

```js
//  =========== render ===========
/**
 * 处理组件类型的fiber
 * @param {*} fiber
 */
function updateFunctionComponent(fiber) {
  //*  初始化hook相关
  wipFiber = fiber; // [!code ++]
  stateHookIndex = 0; // [!code ++]
  wipFiber.stateHooks = []; // [!code ++]

  const children = [fiber.type(fiber.props)];

  reconcileChildren(fiber, children);
}

//  =========== hooks ===========

export function useState(initial) {
  //  ...todo // [!code ++]
  return [];  // [!code ++]
}


//  =========== 全局变量 ===========
//  当前执行中的fiber
let wipFiber = null;  // [!code ++]

//  当前执行中的fiber 对应的useState索引，因为useState可能会声明多个
let stateHookIndex = null;  // [!code ++]
```

### 实现state

hook需要记录的东西两个，一个是当前状态值，另一个是当多次调用setState时，能获取到上一次调用的状态。

当更新的时候，通过 `alternate` 获取上一次的hook就可以记录状态了。

```js
//  =========== hooks ===========

export function useState(initial) {
  //  我们需要拿到上一次渲染的值
  const oldHook = wipFiber.alternate?.stateHooks?.[stateHookIndex]; // [!code ++]
  const hook = {  // [!code ++]
    //  记录状态值  // [!code ++]
    state: oldHook ? oldHook.state : initial, // [!code ++]
    //  把同时调用多次setState的记录下来，然后计算出最后的结果 // [!code ++]
    queue: [],  // [!code ++]
  };  // [!code ++]
  //  stateHooks为什么设计成数组，是因为一个组件中useState会声明多次  // [!code ++]
  wipFiber.stateHooks.push(hook); // [!code ++]
  stateHookIndex++; // [!code ++]
  return [hook.state];  // [!code ++]
}
```

### 实现setState

`setState` 接受一个回调函数，回调函数中能拿到最新的 `state`

另外调用完成后需要重新渲染，此时只需要设置新的 `wipRoot` 和 `nextUnitOfWork` 即可，等待下一次 `workLoop` 执行。

```js
export function useState(initial) {
  const oldHook = wipFiber.alternate?.stateHooks?.[stateHookIndex];

  const hook = {
    //  记录状态值
    state: oldHook ? oldHook.state : initial,
    //  把同时调用多次setState的记录下来，然后计算出最后的结果
    queue: [],
  };

  //  将上一次hook中的queue取出来执行
  const actions = oldHook?.queue || []; // [!code ++]
  actions.forEach((action) => { // [!code ++]
    hook.state = action(hook.state);  // [!code ++]
  }); // [!code ++]

  const setState = (action) => {  // [!code ++]
    hook.queue.push(action);  // [!code ++]
    //  设置一下wipRoot和nextUnitOfWork即可等待他更新了 // [!code ++]
    wipRoot = { // [!code ++]
      dom: currentRoot.dom, // [!code ++]
      props: currentRoot.props, // [!code ++]
      alternate: currentRoot, // [!code ++]
    };  // [!code ++]
    nextUnitOfWork = wipRoot; // [!code ++]
    deletions = []; // [!code ++]
  };  // [!code ++]

  wipFiber.stateHooks.push(hook);
  stateHookIndex++;

  return [hook.state, setState];  // [!code ++]
}
```

## useEffect

继续看个经典例子

```jsx
export function Bar() {
  const [foo, setFoo] = useState(2);

  function handleFoo() {
    setFoo((f) => f * 2);
  }

  useEffect(() => {
    console.log("bar trigger");

    return () => {
      console.log("bar quit");
    };
  }, []);

  useEffect(() => {
    console.log("foo changed --> ", foo);

    return () => {
      console.log("foo quit -->", foo);
    }
  }, [foo]);

  return (
    <div>
      <div>foo: {foo}</div>
      <div>
        <button onClick={handleFoo}>multiple</button>
      </div>
    </div>
  );
}
```

`useEffect` 有三个特征需要注意：

- 1、第一参数是它接受一个 `callback` 回调函数，而且这个函数可以返回一个 `cleanup` 函数，用于在下一次被触发前执行。
- 2、另外它还可以接受一个 `deps` 依赖数组，用于依赖被修改时触发。
- 3、思考一下他要在哪里触发？首先我们经常用到他去处理dom，那么他的位置一定是在 `commitWork` 之后执行。

### 准备工作

```js
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
    //  处理hooks
    commitHooks();  // [!code ++]
  }

  //  保存fiber入口
  currentRoot = wipRoot;

  //  处理完后置空
  wipRoot = null;
}

function commitHooks() {
  //  todo... // [!code ++]
}

//  =========== render ===========

/**
 * 处理组件类型的fiber
 * @param {*} fiber
 */
function updateFunctionComponent(fiber) {
  //*  初始化hook相关
  wipFiber = fiber;
  stateHookIndex = 0;
  wipFiber.stateHooks = [];
  wipFiber.effectHooks = [];  // [!code ++]

  const children = [fiber.type(fiber.props)];

  reconcileChildren(fiber, children);
}

//  =========== hooks ===========

export function useEffect(callback, deps) { // [!code ++]
  const hook = {  // [!code ++]
    callback, // [!code ++]
    deps, // [!code ++]
    cleanup: null,  // [!code ++]
  };  // [!code ++]
  wipFiber.effectHooks.push(hook);  // [!code ++]
}
```

### 完善commitHooks

```js

function commitHooks() {
  //  执行callback
  const runCallback = (fiber) => {
    if (!fiber) {
      return;
    }

    const oldFiber = fiber?.alternate;

    //  说明是首次渲染
    if (!oldFiber) {
      //  可能是非函数组件，先判断下
      fiber.effectHooks?.forEach((hook) => {
        hook.cleanup = hook.callback();
      });
    } else {
      //  后续渲染
      fiber.effectHooks?.forEach((hook, hookIndex) => {
        //  先判断deps的长度，传入空数组则不需要执行
        if (hook.deps?.length > 0) {
          //  判断一下deps是否有变化
          const shouldUpdate = hook.deps.some((newDep, depIndex) => {
            return oldFiber.effectHooks[hookIndex].deps[depIndex] !== newDep;
          });

          if (shouldUpdate) {
            hook.cleanup = hook.callback();
          }
        }
      });
    }

    runCallback(fiber.child);
    runCallback(fiber.sibling);
  };

  //  执行cleanup
  const runCleanup = (fiber) => {
    if (!fiber) {
      return;
    }

    //  从旧的fiber提取出上次的cleanup执行

    fiber?.alternate?.effectHooks?.forEach((hook) => {
      if (hook.deps?.length > 0) {
        hook.cleanup?.();
      }
    });

    runCleanup(fiber.child);
    runCleanup(fiber.sibling);
  };

  runCleanup(wipRoot);
  runCallback(wipRoot);
}
```
