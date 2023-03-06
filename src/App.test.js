import React from 'react';
// import ReactDOM from 'react-dom';
import App from './App';
import {createRoot} from "react-dom/client";

// it('renders without crashing', () => {
//   const div = document.createElement('div');
//   ReactDOM.render(<App />, div);
//   ReactDOM.unmountComponentAtNode(div);
// });
 
const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
root.unmount();