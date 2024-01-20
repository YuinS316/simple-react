import React from "./core/React";

let isShowBar = false;
function EdgeCase() {
  const foo = (
    <div>
      foo
      <div>child1</div>
      <div>child2</div>
    </div>
  );

  // const bar = <div>bar</div>;

  function showBar() {
    isShowBar = !isShowBar;
    React.update();
  }

  return (
    <div>
      EdgeCase Example
      {isShowBar && foo}
      <button onClick={showBar}>toggle</button>
    </div>
  );
}

export default EdgeCase;
