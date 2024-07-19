import './App.css';
import { User } from 'shared/src/types';


function App() {
  const user: User = { id: 1, name: 'John Doe' };
  return (
    <div className="App">
      <h1>Hello, {user.name}!</h1>
    </div>
  );
}

export default App;
