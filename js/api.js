// Plik: js/api.js (NOWA, BEZPIECZNA WERSJA)
// Cel: Wysyła zapytanie do naszego własnego pośrednika, a nie bezpośrednio do Google.

import { showNotification } from './ui.js';

// Klucz API NIE jest już tutaj przechowywany.
// Funkcja wywołuje nasz własny, bezpieczny punkt końcowy na serwerze Netlify.
const PROXY_URL = "/.netlify/functions/gemini-proxy"; 

export async function callGemini(prompt) {
    try {
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt }) // Wysyłamy tylko prompt
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.error || `Błąd serwera pośredniczącego: ${response.status}`);
        }

        const result = await response.json();
        return result.text;

    } catch (error) {
        console.error("Błąd wywołania pośrednika Gemini:", error);
        showNotification(`Błąd komunikacji z AI: ${error.message}`, "error");
        return null;
    }
}
