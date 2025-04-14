import { useState, useEffect } from 'react';
import axios from 'axios';
import { huggingFaceApiKey, pexelsApiKey } from './config.js';
import './styles.css';

function App() {
  const [word, setWord] = useState('');
  const [definition, setDefinition] = useState('');
  const [image, setImage] = useState('');
  const [history, setHistory] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [error, setError] = useState('');

  // Carica la cronologia da localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Salva la cronologia su localStorage
  useEffect(() => {
    localStorage.setItem('searchHistory', JSON.stringify(history));
  }, [history]);

  // Gestisce la ricerca
  const handleSearch = async () => {
    if (!word.trim()) {
      setError('Inserisci una parola valida');
      return;
    }

    setError('');
    setDefinition('');
    setImage('');

    try {
      // Log per debug
      console.log('Parola inviata:', word);

      // Chiama Hugging Face per la definizione
      const defResponse = await axios.post(
        'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
        {
          inputs: `Spiega in solo 8 parole quindi in modo super sintetico (italiano) la parola "${word}"`,
          parameters: {
            max_new_tokens: 100,
            temperature: 0.2,
            top_p: 0.9,
            return_full_text: false,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${huggingFaceApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Estrai e pulisci la risposta
      let defText = defResponse.data[0]?.generated_text?.trim();
      console.log('Risposta grezza:', defText); // Debug

      if (!defText) {
        console.log('Nessun testo generato dall\'API.');
        //defText = 'Nessuna definizione trovata.';
      } else {
        // Rimuovi solo il prompt esatto
        //
        defText = defText.replace(/Definisci "[^"]+" in italiano con 5-8 parole\./i, '').trim();

        // Estrai la prima frase utile
        //const sentences = defText.split(/[.!?]/).filter(s => s.trim());
        //defText = sentences[0]?.trim() || defText;
        //console.log('Dopo estrazione frase:', defText); // Debug

        // Verifica lunghezza (5-8 parole)
        //const words = defText.split(/\s+/).filter(w => w.length > 0);
        //console.log('Parole estratte:', words); // Debug
        //if (words.length > 8) {
        //  defText = words.slice(0, 8).join(' ');
        //} else if (words.length < 5 && words.length > 0) {
        //  defText = 'Definizione troppo breve.';
        //}
        //if (defText.length === 0) {
        //  defText = 'Nessuna definizione valida.';
        //}
      }

      console.log('Definizione pulita:', defText); // Debug
      setDefinition(defText);

      // Chiama Pexels per l'immagine
      const imgResponse = await axios.get(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(word)}&per_page=1`,
        {
          headers: {
            Authorization: pexelsApiKey,
          },
        }
      );

      const imgUrl = imgResponse.data.photos[0]?.src.medium || '';
      setImage(imgUrl);

      // Aggiorna la cronologia
      setHistory((prev) => {
        const newHistory = [word, ...prev.filter((item) => item !== word)].slice(0, 5);
        return newHistory;
      });
    } catch (error) {
      console.error('Errore API:', error.response?.data || error.message);
      if (error.response?.status === 429) {
        setError('Limite API superato. Riprova più tardi.');
      } else if (error.response?.status === 401) {
        setError('Chiave API non valida. Controlla config.js.');
      } else if (error.response?.status === 503) {
        setError('Modello non disponibile. Riprova più tardi.');
      } else {
        setError('Errore durante la ricerca: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  // Gestisce il tasto Invio
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Cancella la cronologia
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('searchHistory');
  };

  // Toggle tema chiaro/scuro
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