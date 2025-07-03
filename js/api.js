// Plik: js/api.js
// Cel: Moduł do komunikacji z API Gemini.

import { showNotification } from './ui.js';

const API_KEY = ""; // Klucz powinien być zarządzany bezpiecznie, np. przez zmienne środowiskowe

export async function callGemini(prompt) {
    // W Canvas, klucz API jest dostarczany automatycznie.
    // Poniższy kod jest przygotowany na to środowisko.
    if (['file:', 'content:'].includes(window.location.protocol) && !API_KEY) {
        showNotification("Funkcje AI nie działają na plikach lokalnych bez klucza API.", "error"); 
        return null;
    }
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(errorBody.error?.message || response.statusText);
        }
        const result = await response.json();
        if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
            return result.candidates[0].content.parts[0].text;
        } else {
            console.warn("Otrzymano nieoczekiwaną odpowiedź z API:", result);
            throw new Error("Otrzymano pustą lub nieprawidłową odpowiedź z API.");
        }
    } catch (error) {
        console.error("Błąd API Gemini:", error);
        showNotification(`Błąd komunikacji z AI: ${error.message}`, "error");
        return null;
    }
}
