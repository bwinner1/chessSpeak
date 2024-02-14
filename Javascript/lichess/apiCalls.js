// All API calls

import * as popupScript from "../src/script.js"
import {translateMove} from "../textToSpeech/notationTranslator.js";
import {
    deleteChessObject,
    getChessObject,
    getFEN,
    getPlayingObject,
    getTimeManager,
    setPlayingObject,
    setTimeManager,
    updateChessContext,
    getResignState,
    setResignState
} from "../src/appState.js";
import {speak} from "../textToSpeech/textToSpeech.js";
import {startPollingForUpdates} from "./updatePolling.js";
import {correctCastling} from "../chess/moveAnalysis.js";
import {checkGameEnd, stopEndGamePolling} from "./checkGameEnd.js";
import {timeCaller} from "../chess/timeManager.js";

const lichessToken = localStorage.getItem('accessToken');

const authOptions = {
    headers: {
        'Authorization': 'Bearer ' + lichessToken,
    }
};

const moveOptions = {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer ' + lichessToken,
        'Content-Type': 'application/json'
    },
    //body: JSON.stringify(postData),
};

const resignOptions = {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer ' + lichessToken,
    }
};


// Authentication
export function authentication() {
    return fetch('https://lichess.org/api/account', authOptions)
        .then(res => res.json())
        .then(data => {
            localStorage.setItem('username', data['username']); // save username in local storage
            return data['username'];
        });
}

export let initialStats = {};

// Gets initial stats of user (to check for how the game ends)
export async function fetchInitialStats(username) {
    const response = await fetch(`https://lichess.org/api/user/${username}`, authOptions);
    const data = await response.json();
    initialStats = {
        wins: data.count.win,
        losses: data.count.loss,
        draws: data.count.draw
    };
}

// Generates object with all information regarding game activity
export async function generatePlayingObject() {
    let playingObject = await fetch('https://lichess.org/api/account/playing', authOptions)
        .then(response => {
            return response.json();
        });

    // save playingObject in appState
    setPlayingObject(playingObject);

    return playingObject;
}

// Gets last move, translates it and speaks it
export async function getLastMove(currentPlayingObject = undefined, prevFEN = undefined) {
    try {
        let playingObject = currentPlayingObject;

        if (!playingObject) {
            let temp = await generatePlayingObject();
            playingObject = temp['nowPlaying'][0];
        }

        console.log(playingObject);

        let lastMove = playingObject['lastMove'];
        let board = playingObject['fen'];

        // updates chess context in appState
        updateChessContext(lastMove, board);
        console.log(getChessObject().ascii());

        let translatedMove = translateMove(lastMove, board, prevFEN);

        correctCastling(lastMove);
        popupScript.opponentsLastMoveField.textContent =
            lastMove ? translatedMove + " | " + lastMove : "Match has just started!";

    } catch (e) {
        if (e instanceof TypeError) {
            popupScript.opponentsLastMoveField.textContent = "No match currently active";
            console.log('No match currently active. ')
        } else {
            throw new Error(e);
        }

    } finally {
        await speak(popupScript.opponentsLastMoveField.textContent, async () => {
            let chessObject = getChessObject();
            try {
                // checks if the timeManager is empty or not
                // empty if extension has been closed during game

                if (chessObject.moveNumber() > 1) {
                    let timeManager = getTimeManager();
                    timeManager = new timeCaller();
                    setTimeManager(timeManager);
                    await timeManager.startTimer();
                }

            } catch (e) {
                if (e instanceof TypeError) {
                } else console.log(e);
            }

        })
    }
}


// Gets and saves board state in FEN notation
export function getBoardState() {
    let data = getChessObject();

    try {
        console.log(data.ascii());
    } catch (e) {
        if (e instanceof TypeError) {
            console.log('-- No match active, no logs to display --');
        } else {
            throw new Error(e);
        }
    }
}

// executes move given through input field
export async function handleButtonClick() {

    // Get the value from the input field
    let move = popupScript.nextMoveField.value.toLowerCase();
    // delete old value from input field
    popupScript.nextMoveField.value = '';

    // check if value of input field isn't empty
    if (!move) {
        return;
    }

    let currentActiveGames = getPlayingObject()['nowPlaying'];

    // handles error when no game is currently active, should implement error appearance in index.html for the future
    if (currentActiveGames.length === 0) {
        popupScript.nextMoveField.value = '';
        console.log("No game active, so no move can be made. ")
        return;
    }

    // Do something with the value (for example, log it to the console)
    console.log('Button clicked with input value:', move);

    const moveAPI = 'https://lichess.org/api/board/game';
    let url = `${moveAPI}/${currentActiveGames[0]['gameId']}/move/${move}`;

    fetch(url, moveOptions)
        .then(async response => {
            if (!response.ok) {
                console.log(response);
                return response.text().then(text => {
                    throw new Error(text)
                });
            }
            await new Audio('../sounds/successSound.mp3').play();
            return response.json();
        })
        .then(async data => {
            // Process the API response
            console.log('Response:', data);

            // end time calls during opponent move
            let timeManager = getTimeManager();
            timeManager = false

            try {
                // updates context of our chess object in appState
                await updateChessContext(move, getFEN());
            } catch (e) {
                await speak('Move is invalid. ');
                console.log(e);
                return;
            } finally {
                getChessObject().ascii();
            }


            // Start polling for updates after the player has made a move and there's no error
            startPollingForUpdates(1000); // Poll every 1 second
        })
        .catch(async error => {
            // Handle fetch errors
            await new Audio('../sounds/errorSound.mp3').play();
            await speak('Move is invalid. ')
            console.log(error);
        });
}


// Resign all matches to be able to test and debug the application in a new match
export async function resignAllMatches(voiceOutput = true) {

    const data = getPlayingObject();

    let currentMatches = data['nowPlaying'];

    if (currentMatches.length === 0) {
        await speak('No match currently active. ');
        return;
    }

    setResignState(true);


    let url = 'https://lichess.org/api/board/game';

    for (let i = 0; i < currentMatches.length; i++) {

        await fetch(`${url}/${currentMatches[i]['gameId']}/resign`, resignOptions)
            .then(response => {
                if (!response.ok) {
                    // Bot games cannot be resigned, so we try to abort the game after a resignation error

                    fetch(`${url}/${currentMatches[i]['gameId']}/abort`, moveOptions)
                        .then(response => {
                            if (response.ok) {
                                speak('Game aborted. ');
                            }
                        })
                        .catch(error => {
                            console.error('Fetch error:', error);
                        });
                }
            })
            .catch(error => {
                //Handle fetch errors
                console.error('Fetch error:', error);
            });
    }
    if (voiceOutput) {
        await checkGameEnd(localStorage.getItem('username'));
    }

    let timeManager = getTimeManager();
    timeManager.outputAvailable = false;
    timeManager = null;

    deleteChessObject();
    updateChessContext();

    await generatePlayingObject();
}
