// Plik: netlify/functions/gemini-proxy.js (NOWY PLIK)
// Cel: Ta funkcja działa na serwerze Netlify. Jest naszym bezpiecznym pośrednikiem.

exports.handler = async function(event) {
    // 1. Pobierz klucz API z bezpiecznych zmiennych środowiskowych Netlify
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Klucz API nie został skonfigurowany na serwerze." })
        };
    }

    // 2. Pobierz prompt wysłany z Twojej aplikacji
    const { prompt } = JSON.parse(event.body);

    if (!prompt) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Brak promptu w zapytaniu." })
        };
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

    // 3. Wyślij zapytanie do Google z serwera (klucz API jest tutaj bezpieczny)
    try {
        const googleResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await googleResponse.json();

        if (!googleResponse.ok) {
            throw new Error(data.error?.message || 'Błąd API Google');
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // 4. Zwróć odpowiedź z powrotem do Twojej aplikacji
        return {
            statusCode: 200,
            body: JSON.stringify({ text: text })
        };

    } catch (error) {
        console.error("Błąd serwera pośredniczącego:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
