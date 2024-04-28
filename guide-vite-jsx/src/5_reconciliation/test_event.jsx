function App() {
  function handleClick() {
    console.log("click!");
  }

  return (
    <div className="app">
      <div className="A">test</div>

      <button onClick={handleClick}>点我</button>
    </div>
  );
}

export default App;
