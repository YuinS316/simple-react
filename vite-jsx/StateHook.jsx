import React from "./core/React";
function StateHook() {
  const [count, setCount] = React.useState(10);
  const [bar, setBar] = React.useState("bar");

  function handleClick() {
    setCount((oldCount) => oldCount + 1);
    setBar((oldBar) => oldBar + "!");
    // setBar("bbar");
  }

  React.useEffect(() => {
    console.log("init");

    return () => {
      console.log("init return");
    };
  }, []);

  React.useEffect(() => {
    console.log("update bar", bar);
    return () => {
      console.log("bar return");
    };
  }, [bar]);

  React.useEffect(() => {
    console.log("update count", count);
    return () => {
      console.log("count return");
    };
  }, [count]);

  return (
    <div>
      <h1>foo</h1>
      <div>{count}</div>
      {/* <div>{bar}</div> */}
      <button onClick={handleClick}>click</button>
    </div>
  );
}

export default StateHook;
