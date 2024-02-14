import {getAccent, getTimeManager, setAccent} from "../src/appState.js";

export async function speak(text, onEndCode = () => {console.log("No onEndCode")}) {

    // handle random double voiceOutput
    if (sessionStorage.getItem('lastVoiceOutput') === text) {
        return;
    }
    sessionStorage.setItem('lastVoiceOutput', text);


    let timeManager = getTimeManager();

    if (timeManager) {
        // disable time calls during textToSpeech
        timeManager.outputAvailable = false;
    }

    let test = text.split(' ');

    // we don't want to save a time call as lastVoiceOutput - so we check if 'left' is at the end of the sentence
    // ex: 'You have 5 minutes left'
    if (text[test.length - 1] !== 'left') {
        sessionStorage.setItem('lastVoiceOutput', text);
    }

    // Check if the Web Speech API is supported by the browser
    if ('speechSynthesis' in window) {

        let synth = window.speechSynthesis;
        let current_accent = getAccent();

        if (current_accent === null) {
            console.log('getting accent...')
            current_accent = await handleVoices(synth);
            console.log(current_accent);
        }

        // Create a new SpeechSynthesisUtterance object
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = current_accent[0];

        // Speak the text
        synth.speak(utterance);

        utterance.onend = () => {
            try {
                onEndCode();
            } catch (e) {
            }
            finally {
                // allow timeCalls being made
                 if (timeManager) timeManager.outputAvailable = true;
            }
        }

    } else {
        console.log('Web Speech API is not supported in this browser.');
    }
}

function getVoices(synth) {
    return new Promise((resolve, reject) => {
        // window.speechSynthesis takes a short time to fill .getVoices() -- need to wait 50 ms
        setTimeout(() => {
            resolve(synth.getVoices());
        }, 50);
    });
}

function handleVoices(synth) {
    // .getVoices() takes a short time to get populated
    let allAccents = getVoices(synth);
    allAccents = allAccents.then((voices) => {
        let current_accent = voices.filter(voice => voice.lang === 'en-US');
        setAccent(current_accent);
        return current_accent;
    });
    return allAccents;
}