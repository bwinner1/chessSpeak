import {getPlayingObject, getTimeManager} from "../src/appState.js";
import {speak} from "../textToSpeech/textToSpeech.js";
import {stopPolling} from "../lichess/updatePolling.js";
import {opponentsLastMoveField} from "../src/script.js"
import {stopEndGamePolling} from "../lichess/checkGameEnd.js";
import {resignAllMatches} from "../lichess/apiCalls.js";

export class timeCaller {

    /**
     * sets time stamps when object is created (object is created at game start)
     */
    constructor() {
        this.outputAvailable = true;
        this.moveCounter = 0;
        // timestamps are the points at which the user gets information how much time is left
        // we always have a time call at 30 and 60s
        let gameModeTimes = {
            'blitz': [0, 30, 60, 120, 180, 240],
            'rapid': [0, 30, 60, 120, 240, 360, 480],
            'classical': [0, 30, 60, 300, 600, 900, 1200, 1500]
        }

        let playingObject = getPlayingObject()['nowPlaying'][0];

        this.timeStamps = gameModeTimes[playingObject.perf];
    }

    /**
     * starts timer to call time stamps
     * @returns {Promise<void>}
     */
    async startTimer(secondsLeft = null) {

        let currentPlayingObject = getPlayingObject()['nowPlaying'][0];
        console.log(currentPlayingObject);
        console.log(currentPlayingObject.secondsLeft);

        // if two second counters in a single turn are activated,
        // the secondsLeft attribute of our playingObject isn't accurate anymore
        let currentSecondCounter = secondsLeft ? secondsLeft < currentPlayingObject.secondsLeft ?
            secondsLeft : currentPlayingObject.secondsLeft : currentPlayingObject.secondsLeft;

        console.log(`currentSecondCounter: ${currentSecondCounter}`);

        console.log(this.timeStamps);

        while (currentSecondCounter < this.timeStamps[this.timeStamps.length - 1]) {
            this.timeStamps.pop();
        }
        console.log(this.timeStamps);

        // seconds that are left until next timestamp
        let secondsToNextTimestamp = currentSecondCounter - this.timeStamps[this.timeStamps.length - 1];
        console.log(secondsToNextTimestamp);

        console.log(`--Next timeCall in ${secondsToNextTimestamp}s--`);

        // we signal that timeOutput is available
        this.outputAvailable = true;


        // -5s to account for delay
        let waitTime = (secondsToNextTimestamp * 1000);
        if (this.moveCounter === 0) {
            waitTime -= 5000;
        }

        console.log(waitTime);

        setTimeout(() => {
            // we check if it is appropriate to give out time at this moment
            // in the meantime the user could have already made his move, or the application is currently speaking something itself
            if (this === getTimeManager()) {
                this.waitForValue(this);
            } else {
                delete this;
            }
        }, waitTime);

        console.log('timeStamp called');
    }

    /**
     * Removes the last time stamp in list and speaks it
     */
    async removeTimeStamp() {
        console.log('--timeStamp removed--');
        let secondsLeft = this.timeStamps.pop();

        this.moveCounter += 1;

        if (secondsLeft) {
            let stringPresentation = secondsLeft > 60 ? `${secondsLeft / 60} minutes` : `${secondsLeft} seconds`;
            await speak(`${stringPresentation} left`);
            await this.startTimer(secondsLeft);
        } else {
            if (secondsLeft === 0) {
                let stringPresentation = 'You lost on time!';
                stopEndGamePolling();
                resignAllMatches(false);
                await speak(stringPresentation);
            }
        }
    }

    /**
     * checks if output is allowed to be spoken
     * @param object
     * @returns {Promise<unknown>}
     */
    waitForValue(object) {
        return new Promise(resolve => {
            function checkValue() {
                if (object.outputAvailable === true) {
                    object.removeTimeStamp();
                } else {
                    setTimeout(checkValue, 100); // Check again after 100 milliseconds
                }
            }

            checkValue();
        });
    }
}