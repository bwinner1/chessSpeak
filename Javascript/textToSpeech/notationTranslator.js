import {getBoardArray, getChessObject} from "../src/appState.js";



const pieces = {
    'N': 'knight',
    'B': 'bishop',
    'R': 'rook',
    'Q': 'queen',
    'K': 'king',
    'P': 'pawn'
};

const basicMove = /^([NBRQK]?)([a-h])([1-8])$/;
const basicCapture = /^([NBRQK]|[a-h])x([a-h])([1-8])$/;
// move where the initial piece's position needs to be specified
const disambiguateMove = /^([NBRQK])([a-h])?([1-8])?(x)?([a-h])([1-8])$/;
// castle moves
const castleMove = /^(O-)?O-O$/;
// pawn promotion
const pawnPromotion = /^([a-h])([1-8])=([NBRQK])$/;

const lichessMove = /^([a-h])([1-8])([a-h])([1-8])$/;

export function translateMove(move, boardFEN, prevBoardFEN=undefined) {
    let chess = getChessObject();
    let translation = '';
    let board = getBoardArray();
    let prevBoard = undefined;
    let prevPiece = undefined;

    if (prevBoardFEN) {
        prevBoard = fenTo2dArray(prevBoardFEN);
    }

    // For lichess notation
    let match = move.match(lichessMove);
    if (match) {
        let castling = '';
        if (prevBoardFEN) {
            castling = translateCastling(boardFEN, prevBoardFEN);
        }
        // check for castling
        if (castling !== '') {
            console.log(castling);
            translation = castling;
        }
        else {
            let piecePosition = match[3] + match[4];
            let piece = getPiecefrom2dArray(board, piecePosition);
            // check for capture
            if (prevBoard) {
                prevPiece = getPiecefrom2dArray(prevBoard, piecePosition);
            }
            if (prevPiece && prevPiece !== 'empty square') {
                translation = `${piece} captures ${prevPiece} on ${piecePosition} `;
            }
            else {
                translation = `${piece} moves from ${match[1]}${match[2]} to ${piecePosition} `;
            }
            // check for check
            if (chess.isCheck()) {
                translation += 'and check!';
            }

            // check for checkmate
            if (chess.isCheckmate()) {
                translation += 'and checkmate!';
            }

        }
    }

    // // For common algebraic notation
    // // Check for check
    // if (move.includes('+')) {
    //     isCheck = true;
    //     move = move.replace('+', '');
    // }
    // // Check for checkmate
    // if (move.includes('#')) {
    //     isCheckmate = true;
    //     move = move.replace('#', '');
    // }

    // // Basic move
    // match = move.match(basicMove);
    // if (match) {
    //     // if the piece is not a pawn
    //     if (match[1]) {
    //         translation = `${pieces[match[1]]} to ${match[2]}${match[3]}`;
    //     }
    //     // if the piece is a pawn
    //     else {
    //         translation = `pawn to ${match[2]}${match[3]}`;
    //     }
    // }

    // // Basic capture
    // match = move.match(basicCapture);
    // if (match) {
    //     // if the initial piece is not a pawn (is in the pieces object)
    //     if (pieces[match[1]]) {
    //         translation = `${pieces[match[1]]} captures ${match[2]}${match[3]}`;
    //     }
    //     // if the initial piece is a pawn
    //     else {
    //         translation = `${match[1]}-pawn captures ${match[2]}${match[3]}`;
    //     }
        
    // }

    // // Disambiguate move
    // match = move.match(disambiguateMove);
    // if (match) {
    //     // non-capture
    //     if (!match[4]) {
    //         // if file and rank are specified
    //         if (match[2] && match[3]) {
    //             translation = `${pieces[match[1]]} on ${match[2]}${match[3]} to ${match[5]}${match[6]}`;
    //         }
    //         // if only file is specified
    //         else if (match[2]) {
    //             translation = `${pieces[match[1]]} on ${match[2]}-file to ${match[5]}${match[6]}`;
    //         }
    //         // if only rank is specified
    //         else if (match[3]) {
    //             translation = `${pieces[match[1]]} on ${match[3]}-rank to ${match[5]}${match[6]}`;
    //         }
    //     }
    //     // capture
    //     else {
    //         // if file and rank are specified
    //         if (match[2] && match[3]) {
    //             translation = `${pieces[match[1]]} on ${match[2]}${match[3]} captures ${match[5]}${match[6]}`;
    //         }
    //         // if only file is specified
    //         else if (match[2]) {
    //             translation = `${pieces[match[1]]} on ${match[2]}-file captures ${match[5]}${match[6]}`;
    //         }
    //         // if only rank is specified
    //         else if (match[3]) {
    //             translation = `${pieces[match[1]]} on ${match[3]}-rank captures ${match[5]}${match[6]}`;
    //         }
    //     }
    // }

    // // Castle Move
    // match = move.match(castleMove);
    // if (match) {
    //     // queen side
    //     if (match[1]) {
    //         translation = 'queen side castle'
    //     }
    //     else {
    //         translation = 'king side castle'
    //     }
    // }

    // // Pawn Promotion
    // match = move.match(pawnPromotion);
    // if (match) {
    //     translation = `${match[1]}-pawn promotes to a ${pieces[match[3]]}`
    // }

    // if (isCheck && translation !== '') {
    //     translation += ' and check!'
    // }
    // if (isCheckmate && translation !== '') {
    //     translation += ' and checkmate!'
    // }

    return translation;
}

function translateCastling(currentFEN, prevFEN) {
    let translation = '';
    let currentBoard = getBoardArray();
    let prevBoard = fenTo2dArray(prevFEN);

    // Check for white's kingside castling (king moves from e1 to g1)
    if (prevBoard[0][4] === 'white king' && currentBoard[0][6] === 'white king') {
        translation = 'white castled kingside';
    }
    // Check for white's queenside castling (king moves from e1 to c1)
    else if (prevBoard[0][4] === 'white king' && currentBoard[0][2] === 'white king') {
        translation = 'white castled queenside';
    }
    // Check for black's kingside castling (king moves from e8 to g8)
    else if (prevBoard[7][4] === 'black king' && currentBoard[7][6] === 'black king') {
        translation = 'black castled kingside';
    }
    // Check for black's queenside castling (king moves from e8 to c8)
    else if (prevBoard[7][4] === 'black king' && currentBoard[7][2] === 'black king') {
        translation = 'black castled queenside';
    }

    return translation;
}

export function translateFEN(fen) {
    let translation = '';
    let fenArray = fen.split(' ');
    let board = fenArray[0];
    let boardArray = board.split('/');
    let boardArrayReverse = boardArray.reverse();

    for (let i = 0; i < boardArrayReverse.length; i++) {
        let row = boardArrayReverse[i];
        let rowArray = row.split('');
        let rowTranslation = `Row ${i + 1} has: `;
        for (let j = 0; j < rowArray.length; j++) {
            let piece = rowArray[j];
            if (isNaN(piece)) {
                if (piece === piece.toUpperCase()) {
                    rowTranslation += `white ${pieces[piece]}, `;
                }
                else {
                    rowTranslation += `black ${pieces[piece.toUpperCase()]}, `;
                }
            }
            else {
                if (piece === '1') {
                    rowTranslation += `${piece} empty square, `;
                }
                else {
                    rowTranslation += `${piece} empty squares, `;
                }
            }
        }
        translation += rowTranslation;
    }
    return translation;
}

export function fenTo2dArray(fen) {
    let fenArray = fen.split(' ');
    let board = fenArray[0];
    let boardArray = board.split('/');
    let boardArrayReverse = boardArray.reverse();
    let board2dArray = [];

    for (let i = 0; i < boardArrayReverse.length; i++) {
        let row = boardArrayReverse[i];
        let rowArray = row.split('');
        let row2dArray = [];
        for (let j = 0; j < rowArray.length; j++) {
            let piece = rowArray[j];
            if (isNaN(piece)) {
                if (piece === piece.toUpperCase()) {
                    row2dArray.push(`white ${pieces[piece]}`);
                }
                else {
                    row2dArray.push(`black ${pieces[piece.toUpperCase()]}`);
                }
            }
            else {
                for (let k = 0; k < parseInt(piece); k++) {
                    row2dArray.push('empty square');
                }
            }
        }
        board2dArray.push(row2dArray);
    }
    return board2dArray;
}

function getPiecefrom2dArray(board2dArray, startSquare) {
    let startSquareArray = startSquare.split('');
    let row = parseInt(startSquareArray[1]) - 1;
    let column = startSquareArray[0].charCodeAt(0) - 97;
    return board2dArray[row][column];
}




