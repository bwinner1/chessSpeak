import {initialStats} from "./apiCalls.js";
import * as popupScript from "../src/script.js";
import {speak} from "../textToSpeech/textToSpeech.js";
import {getChessObject, getPlayingObject, getResignState, getTimeManager, setTimeManager} from "../src/appState.js";
import {stopPolling} from "./updatePolling.js";


let gameEndCheckInterval;

export async function checkGameEnd(username) {
    const response = await fetch(`https://lichess.org/api/user/${username}`);
    const currentData = await response.json();
    const currentStats = {
        wins: currentData.count.win,
        losses: currentData.count.loss,
        draws: currentData.count.draw
    };
    let chess = getChessObject();

    if (currentStats.wins > initialStats.wins) {
        if (chess.isCheckmate()) {
            await handleOutput("Checkmate! You have won!");
        } else {
            await handleOutput("Opponent has resigned. You have won.");
        }
        return true;
    } else if (currentStats.losses > initialStats.losses) {
        let resigned = getResignState();
        if (resigned) {
            await handleOutput('You have resigned. ');
        } else {
            let timeManager = getTimeManager();

            if (timeManager.timeStamps.length === 0) {
                await handleOutput("You lost on time!")
            } else {
                await handleOutput("Checkmate! You have lost.")
            }
        }
        return true;
    } else if (currentStats.draws > initialStats.draws) {
        await handleOutput('The game ended in a draw. ')
        return true;
    } else if (getResignState()) {
        // if game is aborted no stat is increased
        await handleOutput('Game was aborted. ');
    }

    return false;
}


export function pollForGameEnd(username, interval) {
    //given anonymous function will be called every interval milliseconds
    gameEndCheckInterval = setInterval(async () => {
        const hasGameEnded = await checkGameEnd(username);

        // Stop polling if the game has ended
        if (hasGameEnded) {
            stopPolling();
            console.log("The game has ended."); // Or any other action you want to perform
            console.log(getPrecision());
            clearInterval(gameEndCheckInterval);
        } else {
            console.log("The game has not ended yet.");
        }
    }, interval);
}

export function stopEndGamePolling() {
    if (gameEndCheckInterval) {
        clearInterval(gameEndCheckInterval);
    }
}

function getPrecision() {
    const moves = parseInt(localStorage.getItem('speechRecognitionMoves'));
    const attempts = parseInt(localStorage.getItem("speechRecognitionAttempts"));
    const precision = (moves / attempts * 100).toString().substring(0, 5);
    return `The precision of voice recognition for this game: ${precision}%`;
}

async function handleOutput(output) {
    stopEndGamePolling();
    console.log(output);
    if (!(popupScript.opponentsLastMoveField.textContent === output)) {
        await speak(output);
    }
    popupScript.opponentsLastMoveField.textContent = output;

    // deactivate time calls
    let timeManager = getTimeManager()
    timeManager.outputAvailable = false;
    timeManager = null;
    setTimeManager(timeManager);
}
