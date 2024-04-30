import { useState, useEffect } from "@/_core/React";

export function App() {
  const [isCounter, setIsCounter] = useState(true);

  function handleChange() {
    setIsCounter((i) => !i);
  }

  return (
    <div className="test-cls-app">
      {/* <button onClick={handleChange}>change</button>
      {isCounter ? <Counter></Counter> : <Foo></Foo>} */}
      <Bar></Bar>
    </div>
  );
}

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

export function Foo() {
  const [foo, setFoo] = useState(2);

  function handleFoo() {
    setFoo((f) => f * 2);
  }

  return (
    <div>
      <div>foo: {foo}</div>
      <div>
        <button onClick={handleFoo}>multiple</button>
      </div>
    </div>
  );
}

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
    };
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

export default App;
