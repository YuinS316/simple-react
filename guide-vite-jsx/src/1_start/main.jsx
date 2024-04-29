import ReactDOM from "@/_core/ReactDom.js";
import App from "./app.jsx";

//  暂时不支持这种方式，因为<App/>返回的是一个函数，暂时没处理
// ReactDOM.createRoot(document.querySelector("#app")).render(<App></App>);
ReactDOM.createRoot(document.querySelector("#app")).render(App());
