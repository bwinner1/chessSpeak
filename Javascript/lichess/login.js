let authenticationURL;

if (localStorage.getItem('accessToken') === null || !checkTokenValidity()) {

    speak('To use the extension, login to lichess in the newly opened window');

    const lichessHost = 'https://lichess.org';
    const scopes = ['board:play'];
    const clientId = 'chessSpeak-plugin';
    const clientUrl = `https://lichess.org/api/token`;

    /**
     * produces secure random string of length 32
     * Used for login authentication token generation (Produces our state variable)
     * @returns {string}
     */

    /*function generateRandomString() {
        let array = new Uint8Array(50);
        array = crypto.getRandomValues(array);
        return String.fromCharCode.apply(null, Array.from(array));
    }*/

    function dec2hex(dec) {
        return dec.toString(16).padStart(2, "0")
    }

// generateId :: Integer -> String
    function generateRandomString(len) {
        var arr = new Uint8Array((len || 40))
        window.crypto.getRandomValues(arr)
        return Array.from(arr, dec2hex).join('')
    }

    localStorage.setItem("state", generateRandomString(50))
    localStorage.setItem("codeVerifier", base64URLEncode(generateRandomString(64)));


// the codeChallenge is the double encoded version of our codeVerifier which we pass on to lichess
    const codeChallenge = await createCodeChallenge(localStorage.getItem('codeVerifier'));
    console.log(codeChallenge);

    /**
     * Produces the URL which leads to the authentication page with the needed parameters
     * @returns {string}
     */
    function authLoginUrl() {
        const params = new URLSearchParams();
        params.append("client_id", clientId);
        params.append("response_type", "code");
        params.append("scope", scopes);
        params.append("redirect_uri", clientUrl);
        params.append("code_challenge", codeChallenge);
        params.append("code_challenge_method", "S256");
        const url = new URL(`${lichessHost}/oauth?${params.toString()}`);
        return url.toString();
    }

    authenticationURL = authLoginUrl();

// opens authentication page in new window
    let loginWindow = window.open(authenticationURL, 'login', "scrollbars=yes,resizable=no,status=yes,location=no,toolbar=yes,menubar=yes,\n" +
        "width=500,height=500,left=-1000,top=500");

// returns tab object of loginWindow
    let loginTab = await getLoginTab();
    let authorisationCode = null;

// executes when tabs are updated -- checks if authorization was successful
    chrome.tabs.onUpdated.addListener(async () => {

        // prevents from firing after we already have the authorisationCode
        if (authorisationCode === null) {
            console.log(authorisationCode);

            // updates loginTab
            loginTab = await getLoginTab(loginTab.windowId);

            setTimeout(async () => {
                let loginTabUrl = loginTab.url || loginTab.pendingUrl;

                if (loginTabUrl) {

                    // check if the url changed -- the new url has the authorization code
                    if (loginTabUrl !== authenticationURL) {

                        const url = new URL(loginTabUrl);

                        authorisationCode = url.searchParams.get('code');
                        console.log("Authorization Code: " + url.searchParams.get('code'));
                        // closing doesn't work sadly :(
                        //loginWindow.close();

                        const accessToken = await obtainAccessToken(
                            authorisationCode, localStorage.getItem('codeVerifier'), clientUrl, clientId);
                        saveToken(accessToken);

                        loginWindow = window.open("../../HTML/successLogin.html", 'login', "scrollbars=yes,resizable=no,status=yes,location=no,toolbar=yes,menubar=yes,\n" +
                            "width=500,height=500,left=0,top=500");

                        // changes page after login
                        window.location.href = "index.html";
                    }
                }
            }, 50);
        }
    });
} else {
    window.location.href = "index.html";
}

/**
 * takes random string and encodes it first to SHA-256 and then to base64URL
 * @param str
 * @returns {Promise<string>}
 */
async function createCodeChallenge(str) {

    console.log(str);
    const hashArray = await crypto.subtle.digest(
        {name: "SHA-256"},
        new TextEncoder().encode(str)
    );
    const uIntArray = new Uint8Array(hashArray);
    const numberArray = Array.from(uIntArray);
    const hashString = String.fromCharCode.apply(null, numberArray);
    console.log(hashString);

    return base64URLEncode(hashString);
}


/**
 * Takes string and encodes it to base64URL
 * Produces our codeVerifier variable
 * @param str
 * @returns {string}
 */
function base64URLEncode(str) {
    const b64 = btoa(str);
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function getLoginTab(windowId = null) {
    const currentTabs = () => {
        return new Promise((resolve) => {
            chrome.tabs.query({active: true}, (tabs) => {
                resolve(tabs);
            });
        });
    }

    const tabs = await currentTabs();

    let loginTab;

    if (windowId) {
        loginTab = tabs.find((tab) => tab.windowId === windowId);
    } else {
        loginTab = tabs.find(
            (tab) => tab.status === 'complete' ?
                tab.url.indexOf('lichess.org/oauth') !== -1 : tab.pendingUrl.indexOf('lichess.org/oauth') !== -1);
    }
    return loginTab ? loginTab : false;
}

async function obtainAccessToken(authorisationCode, codeVerifier, redirectUri, clientId) {
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: null
    }

    let requestedInfo = {
        'grant_type': 'authorization_code',
        'code': authorisationCode,
        'code_verifier': codeVerifier,
        'redirect_uri': redirectUri,
        'client_id': clientId
    }

    console.log(requestedInfo);
    requestOptions.body = new URLSearchParams(requestedInfo);
    const apiUrl = 'https://lichess.org/api/token';

    return await fetch(apiUrl, requestOptions)
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(text)
                });
            }
            return response.json();
        })
        .then(result => {
            console.log('Access Token received: ', result);
            return result;
        })
        .catch(error => {
            console.error(error);
        });
}

function saveToken(token) {
    // saves accessToken
    localStorage.setItem('accessToken', token.access_token);

    // saves date where token was generated
    localStorage.setItem('accesTokenGeneration', new Date().toString());
}

/**
 * checks if the token is still valid
 * @returns {boolean}
 */
function checkTokenValidity() {
    let currentDate = new Date();
    let dateTokenGeneration = new Date(localStorage.getItem('accessTokenGeneration'));

    // check if 11 months have passed since last token generation (token is valid for 12 months but to be sure)
    if (currentDate.getFullYear() > dateTokenGeneration.getFullYear) {
        if ((currentDate.getMonth() + (11 - dateTokenGeneration.getMonth())) > 11) {
            return false;
        }
    } else {
        if (currentDate.getMonth() - dateTokenGeneration.getMonth() > 11) {
            return false;
        }
    }

    return true;
}

// THIS IS FUNCTIONALITY THAT IS EXACTLY COPIED FROM TEXT-TO-SPEECH BUT CANT BE IMPORTED AS THIS RESULTS
// IN PREMATURELY LOADING OTHER THINGS --> ERROR

async function speak(text, onEndCode = () => {
    console.log("No onEndCode")
}) {


    let test = text.split(' ');

    // we don't want to save a time call as lastVoiceOutput - so we check if 'left' is at the end of the sentence
    // ex: 'You have 5 minutes left'
    if (text[test.length - 1] !== 'left') {
        sessionStorage.setItem('lastVoiceOutput', text);
    }

    // Check if the Web Speech API is supported by the browser
    if ('speechSynthesis' in window) {

        let synth = window.speechSynthesis;

        console.log('getting accent...')
        let current_accent = await handleVoices(synth);
        console.log(current_accent);


        // Create a new SpeechSynthesisUtterance object
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = current_accent[0];

        // Speak the text
        synth.speak(utterance);

        utterance.onend = () => {
            try {
                onEndCode();
            } catch (e) {
            }
        }

    } else {
        console.log('Web Speech API is not supported in this browser.');
    }
}

function getVoices(synth) {
    return new Promise((resolve, reject) => {
        // window.speechSynthesis takes a short time to fill .getVoices() -- need to wait 50 ms
        setTimeout(() => {
            resolve(synth.getVoices());
        }, 50);
    });
}

function handleVoices(synth) {
    // .getVoices() takes a short time to get populated
    let allAccents = getVoices(synth);
    allAccents = allAccents.then((voices) => {
        return voices.filter(voice => voice.lang === 'en-US');
    });
    return allAccents;
}