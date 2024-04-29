export function App() {
  function handleClick() {
    console.log("click App");
  }

  return (
    <div className="test-cls-app">
      <p onClick={handleClick}>123</p>
      <div>child</div>
    </div>
  );
}

export function Foo() {
  return <div>foo</div>;
}

export default App;
