import React from "./core/React";
let isShowBar = false;

// function DeleteExample() {
//   const foo = <div>foo</div>;

//   const bar = <p>bar</p>;

//   function showBar() {
//     isShowBar = !isShowBar;
//     React.update();
//   }

//   return (
//     <div>
//       Delete Example
//       <div>{isShowBar ? bar : foo}</div>
//       <button onClick={showBar}>toggle</button>
//     </div>
//   );
// }

// function DeleteExample() {
//   function Foo() {
//     return <div>foo</div>;
//   }

//   const bar = <p>bar</p>;

//   function showBar() {
//     isShowBar = !isShowBar;
//     React.update();
//   }

//   return (
//     <div>
//       Delete Example
//       <div>{isShowBar ? bar : <Foo></Foo>}</div>
//       <button onClick={showBar}>toggle</button>
//     </div>
//   );
// }

function DeleteExample() {
  const foo = (
    <div>
      foo
      <div>child1</div>
      <div>child2</div>
    </div>
  );

  const bar = <div>bar</div>;

  function showBar() {
    isShowBar = !isShowBar;
    React.update();
  }

  return (
    <div>
      Delete Example
      <div>{isShowBar ? bar : foo}</div>
      <button onClick={showBar}>toggle</button>
    </div>
  );
}

export default DeleteExample;
