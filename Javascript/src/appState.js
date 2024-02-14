// all state that is required throughout the application is stored here

import {fenTo2dArray} from "../textToSpeech/notationTranslator.js";
import {Chess} from "../chess/chess.js";
import {correctCastling} from "../chess/moveAnalysis.js";

let chessObject = null;

/**
 * getter function of chessObject of game
 * @returns {null}
 */
export function getChessObject() {
    return chessObject;
}

/**
 * creates new instance of the chessObject
 * @param fen
 */
function createChessObject(fen) {
    chessObject = new Chess(fen);
}

/**
 * chessObject is deleted after resignation
 */
export function deleteChessObject() {
    chessObject = null;
}

/**
 * updates the chessObject every time we submit or receive a new move
 * @param lastMove
 * @param fen
 */
export function updateChessContext(lastMove, fen) {

    if (!chessObject) {
        createChessObject(fen);
    } else {
        lastMove = correctCastling(lastMove);
        chessObject.move(lastMove);
    }

    // updates FEN
    setFEN(chessObject.fen());
}


let boardFEN = '';
let boardFen2dArray = '';

/**
 * getter function of FEN notation of current board position
 * @returns {string}
 */
export function getFEN() {
    return boardFEN;
}

/**
 * getter function of FEN notation in 2d array format
 * @returns {string}
 */
export function getBoardArray() {
    return boardFen2dArray;
}

/**
 * sets new FEN, IS ONLY CALLED INTERNALLY
 * @param newFEN
 */
function setFEN(newFEN) {
    boardFEN = newFEN;
    boardFen2dArray = fenTo2dArray(newFEN);
}


let playingObject = null;

/**
 * getter function for our playing object
 * @returns {null}
 */
export function getPlayingObject() {
    return playingObject;
}

/**
 * setter function for playing object
 * @param currentPlayingObject
 */
export function setPlayingObject(currentPlayingObject) {
    playingObject = currentPlayingObject;
}

let voiceAccent = null;

/**
 * getter function for accent
 * @returns {null}
 */
export function getAccent() {
    return voiceAccent;
}

/**
 * setter function for accent
 * @param accent
 */
export function setAccent(accent) {
    voiceAccent = accent;
}

let timeManager = null;

export function getTimeManager() {
    return timeManager;
}

export function setTimeManager(timeObject) {
    timeManager = timeObject;
}


// variable to differentiate a loss from a resignation
let resigned = false;

export function getResignState() {
    return resigned;
}

export function setResignState(state) {
    resigned = state;
}