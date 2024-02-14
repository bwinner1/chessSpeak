// analyse recorded text to find which move the user meant
import {getBoardState, generatePlayingObject} from "../lichess/apiCalls.js";
import {Chess} from "./chess.js";
import {getBoardArray, getChessObject, getFEN, getPlayingObject} from "../src/appState.js";

/**
 *
 * @param input
 * @returns {*}
 */
function correctWrongInput(input) {
    //replace left word with right word

    const probableMistakes = {

        //figures
        'sync' : 'king',
        'cream' : 'queen',
        'een ' : 'queen ',
        'book': 'rook',
        'drug': 'rook',
        'luke': 'rook',
        'look': 'rook',
        'tower': 'rook',
        'power': 'rook',
        'shook': 'rook',
        'rick': 'rook',
        'ship ': 'bishop',
        'stop ': 'bishop',
        'night': 'knight',
        'might': 'knight',
        'light': 'knight',
        // 'ight': 'knight',
        'mike': 'knight',
        'nike': 'knight',
        'nine': 'knight',
        '9': 'knight ',
        'phone': 'pawn',
        'palm': 'pawn',
        'p***': 'pawn',
        'pond': 'pawn',
        'cancel': 'castle',
        'route': 'rook',

        //todo: watch out for these two
        'it ': 'knight',
        ' it': 'knight',

        //figures and squares mixed
        'rookie' : 'rook e',
        'roxy' : 'rook c',
        'rugby' : 'rook b',
        'mighty' : 'knight e',
        'shot' : 'short',
        '-': '',

        // alphabet replacement
        'alpha': 'a',
        'bravo': 'b',
        'charlie': 'c',
        'delta': 'd',
        'echo': 'e',
        'foxtrot': 'f',
        'golf': 'g',
        'hotel': 'h',

        //squares
        'before': 'b4',
        'default' : 'd4',
        'asics' : 'a6',
        ':00': '',
        'detect' : 'd takes',
        'edify' : 'ed5',

        //dedicated function for this:
        // //coordinates
        // ' bee': ' b',
        // ' be ': ' b',
        // ' the': ' d',
        // ' see': ' c',
        // ' at' : ' f',
        // ' if' : ' f',
        // ' age': ' h',

        //numbers
        ' one' : ' 1',
        ' two' : ' 2',
        ' tree' : ' 3',
        ' three' : ' 3',
        ' four' : ' 4',
        ' for' : '4',
        ' five' : ' 5',
        ' six' : ' 6',
        ' seven' : ' 7',
        ' eight' : ' 8',


        //misc
        // '93': 'knight 3',
        // '95': 'knight 5',
    };

    // console.log(`ìtems in probableMistakes: ${Object.keys(probableMistakes).length}`);
    for (const [key, value] of Object.entries(probableMistakes))
        if (input.indexOf(key) !== -1){
            input = input.replace(key, value);
            console.log(`replacing ${key} with ${value}`)
        }

    return input;
}

/**
 * Takes a text coordinate (letter/word and a number) as input and returns an actual coordinate.
 * @param input text, f.e. "age 6"
 * @returns {*} coordinate, f.e. "h6"
 */
function correctCoordinate(input){
    const probableMistakes = {
        //coordinates
        'bee': 'b',
        'be': 'b',
        'the': 'd',
        'see': 'c',
        'at': 'f',
        'of': 'f',
        'if': 'f',
        'age': 'h',
        'edge': 'h',

    }
    for (const [key, value] of Object.entries(probableMistakes))
        if (input.indexOf(key) !== -1) {
            input = input.replace(key, value);
            console.log(`replacing ${key} with ${value}`)
        }
    return input;
}

function correctLetter(input) {
    const probableMistakes = {
        //coordinates
        'p': 'b',
        't': 'd',
        's': 'f',
        'v': '',
        '1': '',
        '2': '',
        '3': '',
        '4': '',
        '5': '',
        '6': '',
        '7': '',

        //maybe change 8 to 'a' and 'h', which requires further processing both possibilities
        '8': '',
    }
    for (const [key, value] of Object.entries(probableMistakes))
        if (input.indexOf(key) !== -1){
            input = input.replace(key, value);
            console.log(`replacing ${key} with ${value}`)
        }
    return input;
}

export function correctPieces(input){
    const probableMistakes = {
        //pieces
        'sync' : 'king',
        'cream' : 'queen',
        'een ' : 'queen ',
        'book': 'rook',
        'drug': 'rook',
        'luke': 'rook',
        'look': 'rook',
        'tower': 'rook',
        'power': 'rook',
        'shook': 'rook',
        'rick': 'rook',
        'ship ': 'bishop',
        'stop ': 'bishop',
        'night': 'knight',
        'might': 'knight',
        'light': 'knight',
        // 'ight': 'knight',
        'mike': 'knight',
        'nike': 'knight',
        'nine': 'knight',
        '9': 'knight ',
        'phone': 'pawn',
        'palm': 'pawn',
        'p***': 'pawn',
        'pond': 'pawn',
        'point': 'pawn',
        'cancel': 'castle',

    }
    for (const [key, value] of Object.entries(probableMistakes))
        if (input.indexOf(key) !== -1){
            input = input.replace(key, value);
            console.log(`replacing ${key} with ${value}`)
        }
    return input;
}



/**
 * Accepts commands like 'castle [short|kingside]' (order not being relevant). If nothing castle related occurs, just
 * returns a result object with all attributes set on null
 * @param speechInput raw string input
 * @returns {*} result, an object with startCoordinate, endCoordinate and figure
 */
function handleCastling(speechInput) {
    let result = {startCoordinate: null, endCoordinate: null, figure: null};

    const hasCastle = /castl/i;
    // console.log("hasCastle and speechInput:");
    // console.log(hasCastle);
    // console.log(speechInput);

    if (speechInput.match(hasCastle)) {
        let playingObject = getPlayingObject()['nowPlaying'][0];

        let row = playingObject.color === 'white' ? '1' : '8';

        // we get dict of boolean that tells us if we are able to castle
        let castlingRights = getChessObject().getCastlingRights(playingObject.color[0]);

        if (speechInput.match(/short/i) || speechInput.match(/king/i)) {
            if (castlingRights.k === true) {
                result.startCoordinate = 'e' + row;
                result.endCoordinate = 'g' + row;
            }
        }

        if (speechInput.match(/long/i) || speechInput.match(/queen/i)) {
            if (castlingRights.q === true) {
                result.startCoordinate = 'e' + row;
                result.endCoordinate = 'c' + row;
            }
        }
    }
    return result;
}

/**
 * Returns the promotion letter for a given piece
 * @param piece string of piece, f.e. "knight"
 * @returns {*|string} beginning letter of
 */
function getPromotionLetter(piece) {
    //for pieces other than knight, just take the first letter of its name
    if (piece !== 'knight')
        return piece[0];
    else
        return 'k';
}

/**
 * Assigns result.figure and promotionPiece a value. If no piece is found,
 * the piece is set to a pawn.
 * @param move rawInput
 * @param promotionPiece
 * @param result result object
 * @returns {(*)[]} an Array of result and promotionPiece
 */
function getPiecesFromSpeech(move, promotionPiece, result){
    // check for matching pieceRegEx
    const pieceRegEx = /(rook|pawn|knight|queen|king|bishop)/ig;
    let pieces = [...move.matchAll(pieceRegEx)];

    //in next if, assign result.figure and promotionPiece a value
    if(pieces.length === 1){
        const moveSplit = move.split(" ");
        const lastElement = moveSplit[moveSplit.length - 1];
        // If piece is at the beginning (not at the end),
        // then it is the piece that should be moved
        if(!lastElement.includes(pieces[0][0]))
            result.figure = pieces[0][0];

        //if piece is at the end, it is the promotion piece
        else{
            result.figure = 'pawn'
            promotionPiece = getPromotionLetter(pieces[0][0]);
        }
    }
    else if(pieces.length === 0)
        result.figure = 'pawn';
    // allows 'pawn a8 queen'
    else if(pieces.length === 2 && pieces[0][0] === 'pawn') {
        result.figure = 'pawn';
        promotionPiece = getPromotionLetter(pieces[1][0]);
    }
    //if you have two pieces, while the first one is not a pawn
    //OR
    //if you have more than two pieces
    //throw an Error
    else {
        throw new Error('The given input is not a valid move. ');
    }
    return [result, promotionPiece];
}


/**
 * Takes a part of a coordinate and makes a possible suggestion according to the current
 * chess position. If the return array has more than one value, null is returned
 * @param input f.e. '7'
 * @param piece f.e. 'knight'
 * @param isDestination a boolean value <br>
 * If true given input has a part of a destination square, <br>
 * else input has a part of a start square
 * @returns {string|null} a fitting coordinate
 */
function fillInCoordinates(input, piece, isDestination){
    let possibleCoordinates = [];
    const pieceObject = allFigures(piece, true);

    //if given input is part of a destination square
    if (isDestination){
        // console.log(`input: ${input}`);
        // console.log("pieceObject");
        // console.log(pieceObject);
        const allPossibleMoves = getPossibleMovesOfPieceType(pieceObject, getFEN());
        // console.log("allPossibleMoves");
        // console.log(allPossibleMoves);
        allPossibleMoves.forEach(move => {
            // console.log("move");
            // console.log(move);
            move.endCoordinates.forEach(coordinate => {
                // console.log("coordinate");
                // console.log(coordinate);
                if(coordinate.includes((input)))
                    possibleCoordinates.push(coordinate);
            })
            // if(move.endCoordinates.includes(input))
            //     possibleCoordinates.push(move.endCoordinate)
        })
    }
    //if given input is part of a start square
    else{
        pieceObject.coordinatesOfAllFigures.forEach(coordinate => {
            if(coordinate.includes(input))
                possibleCoordinates.push(coordinate);
        });
    }

    console.log("possibleCoordinates");
    console.log(possibleCoordinates);
    if(possibleCoordinates.length === 1)
        return possibleCoordinates[0];
    else
        return null;

}

/**
 * Remove the last occurring element from a string
 * @param str string
 * @param subStr character
 * @return {*} str with subStr removed
 */
function removeLastOccurrence(str, subStr){
    const lastIndex = str.lastIndexOf(subStr);
    if(lastIndex !== -1){
        const prefix = str.substring(0, lastIndex);
        const suffix = str.substring(lastIndex + subStr.length);
        return prefix + suffix;
    }
    return str;
}

/**
 * Gets coordinates of given input.
 * If they are incorrect or incomplete,
 * fill in the spaces as much as possible.
 *
 */
function getCoordinatesFromSpeechOld(move, result){
    const coordinatesRegEx = /([a-h]\s*[1-8])/;
    const numbersRegEx = /[1-8]/g;

    // check for a matching coordinate
    let foundCoordinates = move.match(coordinatesRegEx);

    // matchAll returns an iterator, [... ] converts the iterator into an array
    const foundNumbers = [...move.matchAll(numbersRegEx)];

    //'N5' should also be accepted, f.e. for 'Nb5'
    //TODO: put this error in caller function
    if(foundCoordinates === null)
        // executed when no 2 arguments are given
        throw new Error('The given input is not a valid move. ');


    // deletes first found coordinate from string
    move = move.replace(coordinatesRegEx, ' ');
    let second_coordinate = move.match(coordinatesRegEx);

    // check for a second coordinate (allowing UCI notation as an alternative)
    // if this is the case, just return move, f.e. 'e2e4'
    // in both
    if (second_coordinate !== null) {
        result.startCoordinate = foundCoordinates[0].replace(/ /g, '');
        result.endCoordinate = second_coordinate[0];
        return result;
    }
    // If we have only one coordinate, the coordinate is meant
    // to be the destination coordinate
    else {
        // result.figure = 'pawn';
        result.endCoordinate = foundCoordinates[0].replace(/ /g, '');
    }


    console.log(`move before splitting: ${move}`);
    let partStartCoordinate = move.split(" ")[1];
    console.log(`partStartCoordinate: ${partStartCoordinate}`);

    if(partStartCoordinate.length === 1)
        result.startCoordinate = partStartCoordinate;

    return result;
}


/**
 * Gets coordinates of given input. Assuming the piece and numbers are correctly recognized,
 * get the remaining letter. If the letter is incorrect or incomplete,
 * fill in a possible letter, if there is only one possibility in the current position.
 * @param move string
 * @param result current result object
 * @param searchForDestination if the coordinate is a destination square
 * @return {(string|*)[]|*[]} an array of coordinate and move
 */
function getCoordinateFromSpeech(move, result, searchForDestination) {
    // const coordinatesRegEx = /([a-h]\s*[1-8])/;
    // check for a matching coordinate
    // let foundCoordinates = move.match(coordinatesRegEx);

    const numberRegEx = /[1-8]/g;
    const letterRegEx = /[a-h]/g;

    // matchAll returns an iterator, [... ] converts the iterator into an array
    const foundNumbers = [...move.matchAll(numberRegEx)];

    //'N5' should also be accepted, f.e. for 'Nb5'
    if (foundNumbers.length === 0)
        return [null, move];

    // the last number of the input is part of the searched coordinate
    const number = foundNumbers[foundNumbers.length - 1][0];
    // console.log("number:");
    // console.log(number);

    // 'knight ef4'
    // 'knight at4' -> 'knight f4'
    const movesSplit = move.split(" ");

    let i, j, coordinate, letter, potentialLetter, hasNumber;

    //find the last element, which has the number
    for (i = movesSplit.length - 1; i >= 0; i--)
        if (movesSplit[i].includes(number))
            break;

    //find the last index, where the number occurs
    //then split the string, including the last index in the result string
    for (j = movesSplit[i].length - 1; j >= 0; j--) {
        // console.log("movesSplit[i][j]:");
        // console.log(movesSplit[i][j]);
        if (movesSplit[i][j] === number) {
            // console.log("Entered slicing if")
            hasNumber = movesSplit[i].slice(0, j + 1);
            break;
        }
    }

    // console.log("hasNumber")
    // console.log(hasNumber)
    if(hasNumber.length === 1){ //f.e. 'N 5' -> '5'
        potentialLetter = movesSplit[i-1];
    }
    else if(hasNumber.length === 2){ //f.e. 'Ne5' -> 'e5', also '85' possible
        potentialLetter = hasNumber[0];
    }
    //if hasNumber.length >= 3)
    else { // f.e. 'h 786' or 'R be3', 'R7e3'
        //if two numbers come after each other ('h 786' for 'h7h6'),
        //remove element at last index (number of coordinate) of string
        // '78', 'be'

        const remaining = hasNumber.slice(0, -1);
        // const lastChar = remaining.slice(-1);

        //todo: make sure that this works as intended with longer words
        potentialLetter = remaining.slice(-1);
        // potentialLetter = lastChar;

        /*
        //check if element at last index is a number
        //if yes, add it to coordinate
        if(lastChar.match(numberRegEx))
            potentialLetter = lastChar;
        //else add whole word
        else
            potentialLetter = remaining;
        */
    }

    // Do some preprocessing to check if previous element could be a coordinate letter
    if (potentialLetter.length > 1)
        letter = correctCoordinate(potentialLetter);
    else
        letter = correctLetter(potentialLetter)

    //check if processed element is a letter
    if (
        letter.length === 0  //potentialLetter got removed in correctLetter
        || (letter.length === 1 && letter.match(letterRegEx)) //correctCoordinate assigned a letter
    ) {
        coordinate = letter + number;

        //remove the letter (what it was before) from move
        //'h7 h6' -> 'h7'
        move = removeLastOccurrence(move, potentialLetter);
    }
    //else look for a matching letter dependent on the piece and number
    else
        coordinate = fillInCoordinates(number, result.figure, searchForDestination);

    //remove the number from move
    move = removeLastOccurrence(move, number);

    return [coordinate, move];
}

/**
 * First word should be the name of a piece OR "castle" OR "promote".
 * @param move raw string input
 * @returns {Promise<{figure: null, startCoordinate: null, endCoordinate: null}>}
 * startCoordinate can also be just a letter or number for moves like 'Rad1'
 */
export async function analyseMove(move) {
    console.log("raw input:")
    console.log(move);


    // time measurement
    // var startTime = performance.now()
    //todo: check if you can delete await
    move = await correctWrongInput(move.toLowerCase());
    // var endTime = performance.now()
    // console.log(`correctWrongInput took ${endTime - startTime} milliseconds`)

    console.log("corrected move:")
    console.log(move);

    let result = handleCastling(move);

    //if it was a castling move, the result is already set,
    // end the function here!
    if (result.endCoordinate !== null) {
        return result;
    }

    let promotionPiece = "";
    [result, promotionPiece] = getPiecesFromSpeech(move, promotionPiece, result);

    // result = getCoordinatesFromSpeechOld(move, result)
    let destinationCoordinate, startCoordinate;
    [destinationCoordinate, move] = getCoordinateFromSpeech(move, result, true);
    // console.log("[destinationCoordinate, move]");
    // console.log(destinationCoordinate);
    // console.log(move);

    //if no coordinate is found, no move can be made
    if(destinationCoordinate === null)
        throw new Error('The given input is not a valid move. ');

    [startCoordinate, move] = getCoordinateFromSpeech(move, result, false);
    // console.log("[startCoordinate, move]");
    // console.log(startCoordinate);
    // console.log(move);


    result.endCoordinate = destinationCoordinate;
    result.startCoordinate = startCoordinate;

    /*
    //old version:

    //process the starting coordinate, if one exists
    // check for a second coordinate (allowing UCI notation as an alternative)
    // if this is the case, just return move, f.e. 'e2e4'
    // in both
    if (second_coordinate !== null) {
        result.startCoordinate = foundCoordinates[0].replace(/ /g, '');
        result.endCoordinate = second_coordinate[0];
        return result;
    }
    // If we have only one coordinate, the coordinate is meant
    // to be the destination coordinate
    else {
        // result.figure = 'pawn';
        result.endCoordinate = foundCoordinates[0].replace(/ /g, '');
    }

     */

    // console.log(`move before splitting: ${move}`);
    // let partStartCoordinate = move.split(" ")[1];
    const partStartCoordinate = move.split(" ")[1];
    console.log(`partStartCoordinate: ${partStartCoordinate}`);

    if (partStartCoordinate && partStartCoordinate.length === 1)
        result.startCoordinate = partStartCoordinate;

    //In case of a promotion, promotionPiece will be overwritten,
    //so that it can be added to the end of the endCoordinate
    result.endCoordinate += promotionPiece;

    console.log("Move analysis result:");
    console.log(result);
    return result;
}

/**
 * Returns the coordinates of the specified piece, packed in a piece object.
 * F.e.: 'rook' --> returns coordinates of all the users rooks
 * @param figure piece of which all coordinates should be returned
 * @param belongsPieceToPlayer if the piece belongs to the player or the opponent
 * @returns {{color: *, coordinatesOfAllFigures: *[], figureType}} f.e.: <br>
 * piece.color = 'black' <br>
 * piece.figureType = 'rook' <br>
 * piece.coordinatesOfAllFigures = ['a8', 'h8']
 */
export function allFigures(figure, belongsPieceToPlayer) {

    //DONE: If a parameter for color is added, put next code snippet into caller of this function
    //pieces are saved as 'black/white {name_of_piece}' so we need to get player color as well
    let playingObject = getPlayingObject();
    const color = playingObject['nowPlaying'][0]['color'];
    const opponentColor = color === "white" ? "black" : "white";
    const playerColor = belongsPieceToPlayer ? color : opponentColor;

    const completeFigureNotation = playerColor + ' ' + figure.toLowerCase();

    // console.log(completeFigureNotation);

    let boardArray = getBoardArray();
    // array of the coordinates of all chess pieces requested by figures
    let allFigures = [];

    for (let i = 0; i < 8; i++) {
        if (boardArray[i].includes(completeFigureNotation)) {
            for (let y = 0; y < 8; y++) {
                if (boardArray[i][y] === completeFigureNotation) {
                    allFigures.push(String.fromCharCode(y + 97) + (i + 1).toString());
                }
            }
        }
    }
    // console.log(allFigures);
    return {color: playerColor, figureType: figure, coordinatesOfAllFigures: allFigures};
}

/**
 * Returns all possible moves to a given destination square, in UCI notation
 * @param start Desired starting square from voice input ex.: 'b1' or 'b' in 'Nbd2'. Can also be null
 * @param destination Desired destination square from voice input ex.: 'd2'
 * @param possibleMoves Actual legal moves from the current position ex.: [ {startCoordinate: e3, endCoordinates: [d3, c5]}, {...}]
 * @returns {*[]} a String array of possible Moves, f.e.: ['e3d3', 'd1d3']
 */
export function getPossibleMoves(start, destination, possibleMoves) {
    // let moves = {};
    let moves = [];

    // console.log("possibleMoves:");
    // console.log(possibleMoves);
    possibleMoves.forEach(piece => {
        // if start is given, only show moves of possible pieces
        // f.e. for 'Nbd2' only show possible moves to d2 from the b file
        let startCoordinateIsRight = start === null ? true :
            start.length === 2 ? piece.startCoordinate === start :
                piece.startCoordinate.includes(start);
        let destinationCoordinateIsRight = destination === null ? true :
            destination.length === 2 ? piece.endCoordinates.includes(destination) :
                piece.endCoordinates.join("").includes(destination);

        if (startCoordinateIsRight && destinationCoordinateIsRight)
            moves.push(piece.startCoordinate + destination);
    });
    return moves;
}

/**
 * Returns an array of possible moves for a given piece.
 * @param piece a piece object
 * @param fen current position
 * @returns {*[]} array of possible moves, <br>
 * f.e. [{startCoordinate: 'b1', <endCoordinates: ['a3', 'c3']}, {...}, ... ]
 */
export function getPossibleMovesOfPieceType(piece, fen) {
    const possibleMoves = [];

    for (let i = 0; i < piece.coordinatesOfAllFigures.length; i++)
        possibleMoves.push(getPossibleMovesOfPiece(piece.color, piece.figureType, piece.coordinatesOfAllFigures[i], fen));
    return possibleMoves;
}

/**
 * A function that returns all possible moves where a given piece can move to. Returns an object, the first
 * element being the starting square and the second element being
 * an array of all possible destination squares. The chess.js library is used here
 * @param colorOfPiece ex.: 'black'
 * @param pieceToMove a piece, of which the available squares should be considered ex.: 'rook'
 * @param startSquare ex.: 'a8'
 * @param fen
 * @returns {*[]} object like {startCoordinate: 'b1', endCoordinates: ['a3', 'c3']}
 */
export function getPossibleMovesOfPiece(colorOfPiece, pieceToMove, startSquare, fen) {
    const chess = new Chess(fen);

    // get all possible moves of chess.js
    const moves = chess.moves({square: startSquare})

    // console.log("moves:");
    // console.log(moves);

    // convert the possible moves into possible end squares
    const possibleSquares = moves.map(function (move) {
        const coordinatesRegEx = /([a-h][1-8])/i;
        let endSquare;
        const match = move.match(coordinatesRegEx);

        //match is only null, if there isn't a destination in the move notation
        //this should only be the case if one side castles
        if (match !== null) {
            endSquare = match[0];

            //converting a promotion move from chess.js, f.e. something like 'a8=Q' or 'a8=Q+'
            //if it is a promotion, add promotion piece to the end square, f.e. 'a8q'
            const promotion = '=';
            const promotionPieceRegEx = /[qrbn]/;
            if (move.indexOf(promotion) !== -1)
                endSquare += move.toLowerCase().match(promotionPieceRegEx)[0];
        }

        //convert O-O and O-O-O (castle short or long) into a possible end square for the king
        else if (colorOfPiece === 'black')
            endSquare = move === 'O-O' ? 'g8' : 'c8';
        else
            endSquare = move === 'O-O' ? 'g1' : 'c1';

        return endSquare;
    });

    // console.log(`possibleSquares: ${possibleSquares}`);

    return {
        startCoordinate: startSquare,
        endCoordinates: possibleSquares
    };
}

export function correctCastling(lastMove) {

    // castling results in illegal lastMove values from lichess - short castle becomes 'e1a1' long castle 'e1h1'
    // our chess object doesn't understand these moves so we need to adjust them for context

    for (const i of [1, 8]) {
        if (lastMove === `e${i}h${i}`) {
            lastMove = `e${i}g${i}`;
        }
        if (lastMove === `e${i}a${i}`) {
            lastMove = `e${i}c${i}`;
        }
    }
    return lastMove
}

