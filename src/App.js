import { useState, useEffect } from 'react';
import axios from 'axios';
import './styles.css';

function App() {
  const [word, setWord] = useState('');
  const [definition, setDefinition] = useState('');
  const [image, setImage] = useState('');
  const [history, setHistory] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [error, setError] = useState('');

  const BACKEND_URL = 'https://neurolex-backend.onrender.com';

  useEffect(() => {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('searchHistory', JSON.stringify(history));
  }, [history]);

  const handleSearch = async () => {
    if (!word.trim()) {
      setError('Inserisci una parola valida');
      return;
    }

    setError('');
    setDefinition('');
    setImage('');

    try {
      console.log('Parola inviata:', word);

      const defResponse = await axios.post(`${BACKEND_URL}/api/define`, { word });

      let defText = defResponse.data[0]?.generated_text?.trim();
      console.log('Risposta grezza:', defText);

      if (!defText) {
        console.log('Nessun testo generato.');
        defText = 'Nessuna definizione trovata.';
      } else {
        defText = defText.replace(/Definisci "[^"]+" in italiano con 5-8 parole\./i, '').trim();
        const sentences = defText.split(/[.!?]/).filter(s => s.trim());
        defText = sentences[0]?.trim() || defText;
        console.log('Dopo estrazione frase:', defText);

        const words = defText.split(/\s+/).filter(w => w.length > 0);
        console.log('Parole estratte:', words);
        if (words.length > 8) {
          defText = words.slice(0, 8).join(' ');
        } else if (words.length < 5 && words.length > 0) {
          defText = 'Definizione troppo breve.';
        }
        if (defText.length === 0) {
          defText = 'Nessuna definizione valida.';
        }
      }

      console.log('Definizione pulita:', defText);
      setDefinition(defText);

      const imgResponse = await axios.get(`${BACKEND_URL}/api/image?word=${encodeURIComponent(word)}`);

      const imgUrl = imgResponse.data.photos[0]?.src.medium || '';
      setImage(imgUrl);

      setHistory((prev) => {
        const newHistory = [word, ...prev.filter((item) => item !== word)].slice(0, 5);
        return newHistory;
      });
    } catch (error) {
      console.error('Errore:', error.response?.data || error.message);
      setError('Errore durante la ricerca: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('searchHistory');
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('light-mode', !isDarkMode);
  };

  return (
    <div className="container">
      <button id="theme-toggle" onClick={toggleTheme}>
        {isDarkMode ? 'Tema Chiaro' : 'Tema Scuro'}
      </button>
      <h1>Ricerca di Parole</h1>
      <form onSubmit={(e) => e.preventDefault()}>
        <input
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Inserisci una parola"
        />
        <button type="button" onClick={handleSearch}>
          Cerca
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {definition && (
        <div className="result">
          <h3>Definizione:</h3>
          <p>{definition}</p>
        </div>
      )}
      {image && (
        <div className="result">
          <h3>Immagine:</h3>
          <img src={image} alt={word} className="result-image" />
        </div>
      )}
      {history.length > 0 && (
        <div className="history">
          <h3>Cronologia Ricerche</h3>
          <ul>
            {history.map((item, index) => (
              <li key={index} onClick={() => setWord(item)}>
                {item}
              </li>
            ))}
          </ul>
          <button onClick={clearHistory}>Cancella Cronologia</button>
        </div>
      )}
      <footer>
        <p>Powered by Hugging Face & Pexels</p>
      </footer>
    </div>
  );
}

export default App;
