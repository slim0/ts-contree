import './App.css';
import { Card } from 'shared/src/cards';


function App() {
  const test: Card = {
    name: "As",
    color: "clubs"
  }
  return (
    <div className="App">
      <h1>Hello</h1>
      <div>{JSON.stringify(test)}</div>
    </div>
  );
}

export default App;
