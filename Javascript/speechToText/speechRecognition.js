if ("webkitSpeechRecognition" in window) {
    console.log("Speech Recognition available");

    var SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    var SpeechRecognitionEvent = window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent;

    const vocabulary = [
        "rook",
        "bishop",
        "pawn",
        "king",
        "queen",
        "knight",
        "castle",
        "short",
        "long",
        "takes",
        "move",
        "kingside",
        "queenside",
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
    ];

    // Speech Recognition Object is implemented
    const recognition = new SpeechRecognition();
    const speechRecognitionList = new SpeechGrammarList();
    const grammar = '#JSGF V1.0; grammar colors public <chessLingo> = ' + vocabulary.join(' | ') + ' ;';
    localStorage.setItem('speechInputSuccess', 'false');
    console.log(grammar);

    // Settings for SpeechRecognition Object
    speechRecognitionList.addFromString(grammar, 1);
    recognition.grammars = speechRecognitionList;
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // Starts voice Recognition
    recognition.start();
    console.log("Ready to receive speech input.");

    // Is executed when a result has been recognised
    recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        console.log("confidence:")
        console.log(event.results[0][0].confidence)

        let moveCounter = localStorage.getItem('moveCounter');

        // increments moveCounter by 1
        localStorage.setItem('moveCounter', '1');

        console.log("moveCounter:");
        console.log(localStorage.getItem('moveCounter'));

        // Sets up a local storage to be able to access variable in index.html
        localStorage.setItem('transcript', transcript);
        localStorage.setItem('speechInputSuccess', 'true');
        window.close()
    }

    recognition.onsoundstart = function () {
        console.log("SOUND DETECTED");
    };

} else {
    console.log("Speech Recognition Not Available");
}
