function App() {
  function handleClick() {
    console.log("app");
  }
  return (
    <div className="app" onClick={handleClick}>
      <div className="A">test_A</div>

      <div className="D">test_D</div>
    </div>
  );
}

export default App;
