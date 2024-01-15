import React from "./core/React.js";

function Count({ count }) {
  return <div>test - Count: {count}</div>;
}

function CountContaner() {
  return <Count count={1}></Count>;
}

function App() {
  return (
    <div id="app">
      app-test
      <Count count={10}></Count>
      <Count count={20}></Count>
    </div>
  );
}

export default App;
