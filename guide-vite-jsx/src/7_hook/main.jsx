import ReactDOM from "@/_core/ReactDom.js";
import App, { Counter } from "./app.jsx";

//  暂时不支持这种方式，因为<App/>返回的是一个函数，暂时没处理
ReactDOM.createRoot(document.querySelector("#app")).render(<App></App>);

// setTimeout(() => {
//   ReactDOM.createRoot(document.querySelector("#app")).render(
//     <Counter></Counter>
//   );
// }, 5000);
