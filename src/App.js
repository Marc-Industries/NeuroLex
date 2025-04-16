import { useState, useEffect } from 'react';
import axios from 'axios';
import './styles.css';

// Componente principale dell'app NeuroLex
function App() {
  // Stati per gestire input, risultati e UI
  const [word, setWord] = useState('');
  const [definition, setDefinition] = useState('');
  const [image, setImage] = useState('');
  const [history, setHistory] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // URL del backend su Render
  const BACKEND_URL = 'https://neurolex-backend.onrender.com'; // Sostituisci con il tuo URL

  // Carica la cronologia dal localStorage all'avvio
  useEffect(() => {
    console.log('Caricamento cronologia da localStorage');
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
        console.log('Cronologia caricata:', savedHistory);
      } catch (err) {
        console.error('Errore parsing cronologia:', err);
      }
    }
  }, []);

  // Salva la cronologia nel localStorage quando cambia
  useEffect(() => {
    console.log('Salvataggio cronologia:', history);
    try {
      localStorage.setItem('searchHistory', JSON.stringify(history));
    } catch (err) {
      console.error('Errore salvataggio cronologia:', err);
    }
  }, [history]);

  // Funzione per validare l'input
  const validateInput = (input) => {
    if (!input.trim()) {
      setError('Inserisci una parola valida');
      console.log('Input vuoto o non valido');
      return false;
    }
    if (input.length > 50) {
      setError('Parola troppo lunga (max 50 caratteri)');
      console.log('Input troppo lungo:', input.length);
      return false;
    }
    return true;
  };

  // Funzione di ricerca
  const handleSearch = async () => {
    console.log('Inizio ricerca per:', word);
    if (!validateInput(word)) {
      return;
    }

    setError('');
    setDefinition('');
    setImage('');
    setIsLoading(true);

    try {
      console.log('Invio richiesta al backend:', BACKEND_URL);

      // Chiamata al backend per la definizione
      console.log('Richiesta POST /api/define');
      const defResponse = await axios.post(`${BACKEND_URL}/api/define`, { word }, {
        timeout: 10000 // Timeout di 10 secondi
      });
      console.log('Risposta definizione:', defResponse.data);

      let defText = defResponse.data[0]?.generated_text?.trim() || '';
      if (!defText) {
        defText = 'Nessuna definizione trovata.';
        console.log('Nessun testo generato dal backend');
      } else {
        // Pulizia della risposta
        console.log('Pulizia risposta:', defText);
        defText = defText.replace(/Definisci in solo 5 parole, super sintetico, la parola: "[^"]+" \./i, '').trim();
        const sentences = defText.split(/[.!?]/).filter(s => s.trim());
        defText = sentences[0]?.trim() || defText;

        const words = defText.split(/\s+/).filter(w => w.length > 0);
        console.log('Parole estratte:', words);
        //if (words.length > 8) {
          //defText = words.slice(0, 8).join(' ');
          //console.log('Troncato a 8 parole:', defText);
        //} else if (words.length < 5 && words.length > 0) {
          //defText = 'Definizione troppo breve.';
          //console.log('Definizione troppo breve');
        //}
        if (defText.length === 0) {
          defText = 'Nessuna definizione valida.';
          console.log('Nessuna definizione valida dopo pulizia');
        }
      }

      setDefinition(defText);
      console.log('Definizione impostata:', defText);

      // Chiamata al backend per l'immagine
      console.log('Richiesta GET /api/image');
      const imgResponse = await axios.get(`${BACKEND_URL}/api/image?word=${encodeURIComponent(word)}`, {
        timeout: 10000
      });
      console.log('Risposta immagine:', imgResponse.data);

      const imgUrl = imgResponse.data.photos[0]?.src.medium || '';
      setImage(imgUrl);
      console.log('Immagine impostata:', imgUrl);

      // Aggiorna cronologia
      setHistory((prev) => {
        const newHistory = [word, ...prev.filter((item) => item !== word)].slice(0, 5);
        console.log('Cronologia aggiornata:', newHistory);
        return newHistory;
      });
    } catch (error) {
      console.error('Errore durante la ricerca:', error);
      if (error.response) {
        // Errore dal server (es. 400, 500)
        console.log('Errore server:', error.response.status, error.response.data);
        if (error.response.status === 429) {
          setError('Limite API superato. Riprova più tardi.');
        } else if (error.response.status === 401) {
          setError('Errore di autenticazione nel backend.');
        } else {
          setError(`Errore server: ${error.response.data?.error || error.response.status}`);
        }
      } else if (error.request) {
        // Nessuna risposta dal server
        console.log('Nessuna risposta dal backend');
        setError('Errore di rete: il server non risponde');
      } else {
        // Altro errore
        console.log('Errore generico:', error.message);
        setError(`Errore: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
      console.log('Ricerca completata');
    }
  };

  // Gestione tasto Enter
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      console.log('Tasto Enter premuto');
      handleSearch();
    }
  };

  // Cancella cronologia
  const clearHistory = () => {
    console.log('Cancellazione cronologia');
    setHistory([]);
    localStorage.removeItem('searchHistory');
  };

  // Cambia tema chiaro/scuro
  const toggleTheme = () => {
    console.log('Cambio tema:', isDarkMode ? 'chiaro' : 'scuro');
    setIsDarkMode(!isDarkMode);
    document.body.classList.toggle('light-mode', !isDarkMode);
  };

  // Rendering dell'interfaccia
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
          onChange={(e) => {
            setWord(e.target.value);
            console.log('Input aggiornato:', e.target.value);
          }}
          onKeyPress={handleKeyPress}
          placeholder="Inserisci una parola"
          disabled={isLoading}
        />
        <button type="button" onClick={handleSearch} disabled={isLoading}>
          {isLoading ? 'Caricamento...' : 'Cerca'}
        </button>
      </form>
      {error && (
        <p className="error">
          {error}
          <br />
          <small>Controlla la connessione o riprova.</small>
        </p>
      )}
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
              <li key={index} onClick={() => {
                setWord(item);
                console.log('Parola selezionata da cronologia:', item);
              }}>
                {item}
              </li>
            ))}
          </ul>
          <button onClick={clearHistory}>Cancella Cronologia</button>
        </div>
      )}
      <footer>
        <p>Powered by Deepinfra & Pexels</p>
      </footer>
    </div>
  );
}

export default App;
