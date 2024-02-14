import * as api from "../lichess/apiCalls.js"
import {stopPolling} from "../lichess/updatePolling.js";
import {pollForGameEnd} from "../lichess/checkGameEnd.js";
import {createGameAgainstComputer, createOnlineGame} from "../lichess/createGame.js";
import {speechRecognition} from "../speechToText/speechRecognitionFunction.js";


export let nextMoveField = document.getElementById('yourNextMove');
export let opponentsLastMoveField = document.getElementById("opponentsLastMove");
export let inputButton = document.getElementById('submitButton');
let speechRecognitionResult = document.getElementById("speechRecognitionResult");
export let gameModeDropdown = document.getElementById('gameModeDropdown');
export let errorMessage = document.getElementById('error-message');
export let playComputerButton = document.getElementById('playComputerButton');
export let resignAllButton = document.getElementById('resignAllButton')
export let playOnlineButton = document.getElementById('playOnlineButton');

//muting the audio, so that it runs in the background
const audio = document.getElementById("silent-background");
audio.volume = 0.0;
/*
var popupWindow = window.open(
    chrome.extension.getURL("index.html"),
    "exampleName",
    "width=400,height=400"
);
window.close();*/

function initialize() {
    api.authentication()
        .then(username => {
            if (username) {
                api.fetchInitialStats(username);
                pollForGameEnd(username, 10000);
            } else {
                console.error("Username not retrieved.");
            }
        })
        .catch(error => {
            console.error("Error during initialization:", error);
        });
}

// Call the initialize function to fetch the username and initial stats to check for how the game ends
initialize();

// Gets last move opponent made
await api.getLastMove();

//Stop polling if the player navigates away or the game ends
window.addEventListener('beforeunload', stopPolling);

// Submit requested move
inputButton
    .addEventListener('click', api.handleButtonClick);

// Resign all current matches
document.getElementById('resignAllButton')
    .addEventListener('click', api.resignAllMatches);

// Start Speech Recognition
document.getElementById('speechRecognitionButton')
    .addEventListener('click', speechRecognition);

document.getElementById('playComputerButton')
    .addEventListener('click', () => createGameAgainstComputer(gameModeDropdown.value));

document.getElementById('playOnlineButton')
    .addEventListener('click', () => createOnlineGame(gameModeDropdown.value))

document.getElementById('fontEnlargeButton')
    .addEventListener('click', enlargeFont);

document.getElementById('fontShrinkButton')
    .addEventListener('click', shrinkFont);


function enlargeFont() {
    let body = document.querySelector('body');

    // enlarges fontSize of body text
    body.style.fontSize = (parseInt(window.getComputedStyle(body).fontSize) + 5) + 'px';

    // some elements cant be adjusted through body, so we change them separately
    let allOtherElements = document.querySelectorAll('.fontAdjustment');

    for (const el of allOtherElements) {
        el.style.fontSize = (parseInt(window.getComputedStyle(el).fontSize) + 5) + 'px';
    }

    // increases width and height of extension
    body.style.width = (Math.floor(parseInt(window.getComputedStyle(body).width) * 1.1)) + 'px';
    body.style.height = (Math.floor(parseInt(window.getComputedStyle(body).height) * 1.1)) + 'px';
}

function shrinkFont() {
    let body = document.querySelector('body');

    // shrinks fontSize of body text
    body.style.fontSize = (parseInt(window.getComputedStyle(body).fontSize) - 5) + 'px';

    // some elements cant be adjusted through body, so we change them separately
    let allOtherElements = document.querySelectorAll('.fontAdjustment');

    for (const el of allOtherElements) {
        el.style.fontSize = (parseInt(window.getComputedStyle(el).fontSize) - 5) + 'px';
    }


    // decreases width and height of extension
    body.style.width = (Math.floor(parseInt(window.getComputedStyle(body).width) * 0.9)) + 'px';
    body.style.height = (Math.floor(parseInt(window.getComputedStyle(body).height) * 0.9)) + 'px';
}



// Enables keypress 'Enter' to execute move (for submit button)
nextMoveField.addEventListener('keypress', function (event) {

    // If the user presses the "Enter" key on the keyboard
    if (event.key === "Enter") {

        // Trigger the button element with a click
        inputButton.click();
    }
});


// Hotkey for making a move through speechInput on 'A+Shift'
document.addEventListener('keydown', async (e) => {
    if (e.key.toLowerCase() === 'a' && e.shiftKey) {
        await speechRecognition();

    }
});

// Adding the functionality that you can use play/pause media button of keyboard
// or a bluetooth device
navigator.mediaSession.metadata = new MediaMetadata();
navigator.mediaSession.setActionHandler('play', speechRecognition);
navigator.mediaSession.setActionHandler('pause', speechRecognition);


