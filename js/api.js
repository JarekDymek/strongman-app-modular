// Plik: js/api.js
// Cel: Moduł do komunikacji z API Gemini.

import { showNotification } from './ui.js';

// --- POPRAWKA: Wklej tutaj swój klucz API od Google ---
const API_KEY = AIzaSyDiMY2H3YrsGggCfsA_ZUnhVU2gCCkds2k; 
// ----------------------------------------------------

export async function callGemini(prompt) {
    if (!API_KEY || API_KEY === AIzaSyDiMY2H3YrsGggCfsA_ZUnhVU2gCCkds2k) {
        showNotification("Klucz API Gemini nie został skonfigurowany.", "error"); 
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
            throw new Error(errorBody.error?.message || `Błąd HTTP: ${response.status}`);
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
