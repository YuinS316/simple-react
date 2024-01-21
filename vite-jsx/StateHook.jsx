import React from "./core/React";
function StateHook() {
  const [count, setCount] = React.useState(10);

  const [bar, setBar] = React.useState("bar");

  console.log("trigger");
  function handleClick() {
    // setCount((oldCount) => oldCount + 1);
    // setBar((oldBar) => oldBar + "!");
    setBar("bbar");
  }

  return (
    <div>
      <h1>foo</h1>
      <div>{count}</div>
      <div>{bar}</div>
      <button onClick={handleClick}>click</button>
    </div>
  );
}

export default StateHook;
