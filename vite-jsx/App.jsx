import React from "./core/React.js";

let sum = 1;
let props = { id: "count" };
export function Count({ count }) {
  function handleClick() {
    console.log("click");
    sum++;
    props = {};
    React.update();
  }
  return (
    <div {...props} onClick={handleClick}>
      test - Count: {count}; test - Sum: {sum}
    </div>
  );
}

function CountContaner() {
  return <Count count={1}></Count>;
}

function App() {
  return (
    <div id="app">
      app-test
      <Count count={10}></Count>
      {/* <Count count={20}></Count> */}
    </div>
  );
}

export default App;
