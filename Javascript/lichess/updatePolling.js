import {getLastMove, generatePlayingObject} from "./apiCalls.js";

let pollingInterval;
let lastProcessedFen = '';
let prevFen = '';

/**
 * Handles polling for updates in the game
 * @param {*} interval 
 */
export async function startPollingForUpdates(interval) {
    console.log("Starting polling for updates...");
    const currentActiveGames = await generatePlayingObject().then(data => data['nowPlaying']);
    if (currentActiveGames.length === 0) {
        console.log("No game active, so polling won't start.");
        return;
    }

    const currentGame = currentActiveGames[0]; // Using the first active game
    lastProcessedFen = currentGame.fen; // Initialize with the current FEN
    let lastMove = currentGame.lastMove;

    // Start polling if it's the opponent's turn or at the start of the game
    if (currentGame.isMyTurn === false || !lastMove) {
        pollForUpdates(currentGame.gameId, interval);
    }
    else {
        console.log("It's your turn, so polling won't start.");
    }
}
/**
 * Polls for updates in the game every interval seconds
 * @param {*} gameId 
 * @param {*} interval 
 * 
 */
function pollForUpdates(gameId, interval) {
    if (pollingInterval) clearInterval(pollingInterval);

    pollingInterval = setInterval(async () => {
        console.log("Polling for updates...");
        const gameData = await generatePlayingObject().then(data => {
            console.log("Game data: ", data);
            return data['nowPlaying'].find(game => game.gameId === gameId);
        });

        if (gameData && gameData.fen !== lastProcessedFen) {
            console.log("Opponent has made a move!");
            prevFen = lastProcessedFen; // Save previous FEN
            lastProcessedFen = gameData.fen; // Update last processed FEN
            stopPolling(); // Stop polling since the opponent has made a move

            // Process the move
            await getLastMove(gameData, prevFen);
        }
    }, interval);
}

export function stopPolling() {
    console.log("Stopping polling for updates...");
    if (pollingInterval) clearInterval(pollingInterval);
}
