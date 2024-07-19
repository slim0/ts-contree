import './App.css';
import { deckOf32Cards } from 'shared/src/cards';


function App() {
  return (
    <div className="App">
      <h1>Hello</h1>
      <div>{JSON.stringify(deckOf32Cards)}</div>
    </div>
  );
}

export default App;
