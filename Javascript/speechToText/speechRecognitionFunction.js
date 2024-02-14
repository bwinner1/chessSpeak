import {startSpeechRecognition} from "./getPermissionStatus.js";
import {
    allFigures,
    analyseMove,
    correctPieces,
    getPossibleMoves,
    getPossibleMovesOfPieceType,
} from "../chess/moveAnalysis.js";
import {getChessObject, getFEN, getPlayingObject} from "../src/appState.js";
import {
    gameModeDropdown,
    inputButton,
    nextMoveField,
    opponentsLastMoveField,
    playComputerButton, playOnlineButton, resignAllButton
} from "../src/script.js";
import {speak} from "../textToSpeech/textToSpeech.js";

//Don't use the following imports, this somehow breaks the code
// import {translateMove} from "../textToSpeech/notationTranslator";
// import {getLastMove} from "../lichess/apiCalls";
// import {createGameAgainstComputer, createOnlineGame} from "../lichess/createGame";


/**
 * Returns a sentence with all positions of one piece type. Don't forget to add a beginning to
 * the sentence, like "You have ".
 * @param piece
 * @return {string} f.e. "a rook on a1 and h1."
 */
function getPiecePositionsSentence(piece) {
    let i = 0;
    let piecePositions = "a " + piece.figureType +
        " on " + piece.coordinatesOfAllFigures[i];
    //add all squares besides the first and last with commas
    i++;
    for (; i < piece.coordinatesOfAllFigures.length - 1; i++) {
        piecePositions += (", " + piece.coordinatesOfAllFigures[i]);
    }
    if(piece.coordinatesOfAllFigures.length > 1)
        //add the last square with an 'and'
        piecePositions += " and " + piece.coordinatesOfAllFigures[i];

    piecePositions += ".";
    return piecePositions;
}

async function inputMove(move) {

    // get piece, startSquare and endSquare information from raw data
    // let moveInfo = await analyseMove(move);
    let moveInfo;
    try {
        moveInfo = await analyseMove(move);
    }
    catch (e) {
        await new Audio('../sounds/errorSound.mp3').play();
        await speak(e.message);
        console.log(e);
        return;
    }

    // here we check if either a coordinate and a figure type is called (ex: 'rook b6')
    // or the user has only given one coordinate and therefore wants to move a pawn (ex: 'e4')
    if (moveInfo.startCoordinate && moveInfo.endCoordinate) {
        nextMoveField.value = moveInfo.startCoordinate + moveInfo.endCoordinate;
    } else {
        // get all information of wanted piece type
        let piece = allFigures(moveInfo.figure, true);
        console.log(piece);
        // get all possible moves, an array with objects having start and end coordinates
        let allPossibleMoves = getPossibleMovesOfPieceType(piece, getFEN());
        console.log(allPossibleMoves);
        // get all fitting moves in UCI notation, ready for the lichess API
        let fittingMoves = getPossibleMoves(moveInfo.startCoordinate, moveInfo.endCoordinate, allPossibleMoves);

        if (fittingMoves.length === 0) {
            await new Audio('../sounds/errorSound.mp3').play();
            await speak('No fitting move was found. ');
            //throw new Error('No fitting move was found, input must be wrong! ');
        }

        if (fittingMoves.length > 1) {
            console.log("More than one fitting move, first one is chosen.");
            let piecePositions = getPiecePositionsSentence(piece);

            const speakText = "You have more than one possible move. You have " + piecePositions +
                " So, which move should be played?";
            console.log(speakText);
            await speak(speakText);
            return;
        }
        nextMoveField.value = fittingMoves[0];
    }

    //make actual move
    let movesIncreasedByOne = parseInt(localStorage.getItem('speechRecognitionMoves')) + 1;
    localStorage.setItem('speechRecognitionMoves', movesIncreasedByOne.toString());
    // console.log("movesIncreasedByOne:");
    // console.log(movesIncreasedByOne);
    console.log(nextMoveField.value);
    inputButton.click();

}

/**
 * Gets the value of opponentsLastMoveField in the html and speaks it
 * @return {Promise<void>}
 */
async function repeatMove() {
    await speak(opponentsLastMoveField.innerText);
}

/**
 * For now returns a sentence with time information of only the player. Should be refactored to also
 * tell the same information of the opponent
 * @return {string}
 */
function getTheTime(){
    const secondsLeft = getPlayingObject()['nowPlaying'][0]['secondsLeft'];
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    return `Before your last move, you had ${minutes} minutes and ${seconds} seconds left.`;
}
/**
 * For now only speaks out the time of the player
 * @return {Promise<void>}
 */
async function sayTimeSituation() {
    await speak(getTheTime());
}

/**
 * Stats a new game. If the keywords "computer", "engine" or "stockfish" don't occur,
 * this will start a new game against a random opponent from the internet.
 * @param transcript
 * @return {Promise<void>}
 */
async function startNewGame(transcript) {
    // leeches -> lichess
    if(transcript.match(/(computer|engine|stockfish|leeches)/))
        playComputerButton.click();
    else
        playOnlineButton.click();
}

/**
 * If a sentence starts with "set" or "change", set the game mode of the next game to start.
 * @param transcript
 * @return {Promise<void>}
 */
async function setGameType(transcript) {
    if(transcript.match(/blitz/))
        gameModeDropdown.value = "blitz";
    else if(transcript.match(/rapid/))
        gameModeDropdown.value = "rapid";
    else if(transcript.match(/classical/))
        gameModeDropdown.value = "classical";
    else
        await speak("Invalid game type");

}

/**
 * Returns f.e. "You have a pawn on a2, b3 and h3."
 * @param belongsPieceToPlayer
 * @param pieceType actual string of a pieceType, f.e. "rook". If left empty, all pieces will be said
 * @return {*[]} One or more sentences with all the positions of the given pieceType
 */
function getPiecePositions(belongsPieceToPlayer, pieceType = null){

    let result = [];
    const pieces = pieceType !== null ? [pieceType] : ["king", "queen", "rook", "bishop", "knight", "pawn"];
    let pieceObject, beginning;
    for (const piece of pieces){
        pieceObject = allFigures(piece, belongsPieceToPlayer);
        beginning = belongsPieceToPlayer ? "You have " : "Your opponent has ";
        result.push(beginning + getPiecePositionsSentence(pieceObject));
    }
    return result;
}

/**
 * Says information about the current board situation
 * @param transcript
 * @return {Promise<void>}
 */
async function sayBoardInformation(transcript) {
    // const playerColor = getPlayingObject()['nowPlaying'][0]['color']
    let speech = [];
    const pieceRegEx = /(rook|pawn|knight|queen|king|bishop)/i;

    transcript = await correctPieces(transcript);
    const pieceMatch = transcript.match(pieceRegEx);
    const piece = pieceMatch ? pieceMatch[0] : null;

    if(transcript.match(/where/)){
        if(!transcript.match(/my/) && !transcript.match(/opponent/)){
            speech.push(getPiecePositions(true, piece));
            speech.push(getPiecePositions(false, piece));
        }
        else if(transcript.match(/opponent/))
            speech.push(getPiecePositions(false, piece));
        else //show only my piece
            speech.push(getPiecePositions(true, piece));
    }

    for (const group of speech)
        for (const sentence of group)
            await speak(sentence);
    // await speak(speech);
}

async function resignMatch(){
    resignAllButton.click();
}

export async function speechRecognition() {

    localStorage.setItem('moveCounter', '0');
    localStorage.setItem('speechInputSuccess', '')

    startSpeechRecognition();
    let attemptsIncreasedByOne = parseInt(localStorage.getItem('speechRecognitionAttempts')) + 1;
    localStorage.setItem('speechRecognitionAttempts', attemptsIncreasedByOne.toString());
    // console.log("attemptsIncreasedByOne: ");
    // console.log(attemptsIncreasedByOne);


    // Checks every second if moveCounter has changed, move counter increments when move is made in SpeechRecognition
    while (localStorage.getItem('moveCounter') === '0') {

        // checks if window was closed manually
        if (localStorage.getItem('moveCounter') === '-2') break;

        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("*");
    }

    // checks if speechInput was successful
    if (parseInt(localStorage.getItem('moveCounter ')) < 0) {
        await new Audio('../sounds/errorSound.mp3').play();

        switch (localStorage.getItem('moveCounter')) {
            case '-1':
                await speak('No valid input was received. ');
                throw new Error('no valid input was received.');
            case '-2':
                // when the window was manually closed we don't need to speak what went wrong
                throw new Error('window was closed manually. ');
        }
        localStorage.setItem('moveCounter', '0');
    }

    // get raw speech input of move
    const transcript = localStorage.getItem('transcript').toLowerCase();
    console.log(`transcript: ${transcript}`);
    const transcriptSplit = transcript.split(" ");

    // time measurement
    const startTime = performance.now();

    //categorize, which type of command it is
    if(transcriptSplit[0] === 'repeat' ||
        (transcriptSplit[0] === 'can' &&
            (transcriptSplit.includes('repeat') || transcriptSplit.includes('again'))))
        await repeatMove();

    else if(transcriptSplit[0] === 'how' &&
        (transcriptSplit.includes("time") || transcriptSplit.includes("minutes") ||
            transcript.match(/clock/)))
        await sayTimeSituation();

    else if(transcriptSplit[0] === 'start' || transcriptSplit[0] === 'create' ||
    transcriptSplit[0] === 'play')
        await startNewGame(transcript);

    else if(transcriptSplit[0] === 'set' || transcriptSplit[0] === 'change')
        await setGameType(transcript);

    else if(transcriptSplit[0] === 'where')
        await sayBoardInformation(transcript);

    else if(transcriptSplit[0] === 'resign' || transcriptSplit[0] === 'resume' || transcriptSplit[0] === 'design')
        await resignMatch();
    else{
        await inputMove(transcript);
    }

    const endTime = performance.now()
    console.log(`processing the transcript took ${endTime - startTime} milliseconds`)

}