import {generatePlayingObject, getLastMove, resignAllMatches} from "./apiCalls.js";
import {
    deleteChessObject,
    getPlayingObject,
    setResignState,
    setTimeManager,
    updateChessContext
} from "../src/appState.js";
import {errorMessage, opponentsLastMoveField} from '../src/script.js'
import {speak} from "../textToSpeech/textToSpeech.js";
import {startPollingForUpdates} from "./updatePolling.js";
import {timeCaller} from "../chess/timeManager.js"

class gameModeParameters {

    gameModeTimes = {
        'blitz': [300, 3],
        'rapid': [600, 5],
        'classical': [1800, 20]
    }

    aiGameData = {
        'rated': true,           // Whether the game is rated or not
        'clock.limit': 0,    // Time limit for each player in seconds
        'clock.increment': 0,  // Time increment in seconds
        'color': 'random',       // Color for the player ('white', 'black', or 'random')
        'variant': 'standard',   // Chess variant ('standard', 'chess960', etc.)
        'level': 5,              // Computer level (1-8, with 8 being the strongest)
    }

    onlineGameData = {
        'rated': true,           // Whether the game is rated or not
        'time': 0,    // Time limit for each player in seconds
        'increment': 0,  // Time increment in seconds
        'variant': 'standard',   // Chess variant ('standard', 'chess960', etc.)
        'color': 'random',       // Color for the player ('white', 'black', or 'random')
        'ratingRange': '',              // Computer level (1-8, with 8 being the strongest)
    }

    constructor(gameModeName, onlineOrNot) {
        this.gameMode = gameModeName;
        this.onlineOrNot = onlineOrNot;
    }

    createParameters() {
        let gameParameters = null;

        switch (this.onlineOrNot) {

            case true:
                gameParameters = this.onlineGameData;
                gameParameters['time'] = this.gameModeTimes[this.gameMode][0] / 60;
                gameParameters['increment'] = this.gameModeTimes[this.gameMode][1];
                return new URLSearchParams(gameParameters);

            case false:
                gameParameters = this.aiGameData;
                gameParameters['clock.limit'] = this.gameModeTimes[this.gameMode][0];
                gameParameters['clock.increment'] = this.gameModeTimes[this.gameMode][1];
                return new URLSearchParams(gameParameters);
        }
    }
}


// Set the parameters for the challenge
const gameOptions = {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('accessToken'),
    },
    body: null,
}

export async function createGameAgainstComputer(gameMode) {

    if (!(await checkNoOtherGame())) {
        await new Audio('../sounds/errorSound.mp3').play();
        await speak("You're already playing a game, resign it first. ");
        return;
    }

    const apiURL = 'https://lichess.org/api/challenge/ai';

    // give the user a signal that game is being created
    await new Audio('../sounds/gameStartSound.mp3').play();

    let parameters = new gameModeParameters(gameMode, false);
    gameOptions.body = parameters.createParameters();

    let startOfGameObject = await fetchGame(apiURL, gameOptions);
    console.log(startOfGameObject);

    await startGame();
}

export async function createOnlineGame(gameMode) {

    if (!(await checkNoOtherGame())) {
        await new Audio('../sounds/errorSound.mp3').play();
        await speak("You're already playing a game, resign it first. ");
        return;
    }

    const onlineURL = 'https://lichess.org/api/board/seek';

    let parameters = new gameModeParameters(gameMode, true);
    gameOptions.body = parameters.createParameters();

    // error handling when online game is executed with blitz play (not possible)
    if (parameters.gameMode === 'blitz') {
        await new Audio('../sounds/errorSound.mp3').play();
        await speak('Only Rapid and Classical are available for online play. ');
        return;
    }

    // give the user a signal that game is being created
    await new Audio('../sounds/gameStartSound.mp3').play();

    let startOfGameObject = await fetchGame(onlineURL, gameOptions);
    console.log(startOfGameObject);

    await startGame();
}


async function fetchGame(url, options) {
    try {
        return await fetch(url, options)
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(text)
                    });
                }
                return response.json();
            })
            .then(result => {
                console.log('Challenge successful! Game ID:', result.id);
                return result;
            })
            .catch(error => {
                console.error(error);
            });
    } catch (e) {
        if (e instanceof SyntaxError) {
        }
    }
}

async function startGame() {
    await generatePlayingObject();
    let playingObject = getPlayingObject()['nowPlaying'][0];
    localStorage.setItem("speechRecognitionAttempts", 0);
    localStorage.setItem("speechRecognitionMoves", 0);
    setResignState(false);

    let timeManager = new timeCaller();
    setTimeManager(timeManager);

    switch (playingObject.color === "white") {

        case true:
            opponentsLastMoveField.textContent = 'Match has started! You play as white, play your first move! ';
            await speak(opponentsLastMoveField.textContent);


            // updates the chess context we need to analyse moves
            deleteChessObject();
            updateChessContext('', playingObject['fen']);

            break;

        case false:
            await speak('Match has started! You play as black.', async () => {
                if (playingObject.lastMove) {
                    await getLastMove(playingObject);
                } else {
                    startPollingForUpdates(2000);
                }
            });
            break;
    }
}

async function checkNoOtherGame() {
    await generatePlayingObject();
    let playingObject = getPlayingObject();

    // replaces old chess object and creates new context
    deleteChessObject();
    updateChessContext();

    if (playingObject['nowPlaying'].length === 0) {
        return true;
    }
    else if (playingObject['nowPlaying'].length === 1 &&
        playingObject['nowPlaying'][0].secondsLeft === 0) {
        resignAllMatches(false);
        return true;
    }

    return false;
}