async function isMicPermitted() {
    return await navigator.permissions.query(
        {name: 'microphone'}
    )
        .then(function (permissionStatus) {

            console.log(permissionStatus.state); // granted, denied, prompt

            return permissionStatus.state === "granted";
        });
}

let MicPermissionStatus = await isMicPermitted();


/* Enables SpeechRecognitionButton, MicPermissionStatus describes if Mic has permission to be used in our Extension,
   if permission hasn't been granted, A tab will be opened with request for permission */

export async function startSpeechRecognition() {
    let newWindow;

    if (MicPermissionStatus === false) {
        newWindow = await window.open("../HTML/permissionPage.html", "test",
            "scrollbars=yes,resizable=no,status=yes,location=no,toolbar=yes,menubar=yes,\n" +
            "width=500,height=500,left=-1000,top=500");
        MicPermissionStatus = true;

    } else {
        newWindow = await window.open("../HTML/voiceRecording.html", "test",
            "scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no,\n" +
            "width=200,height=200,left=-1000,top=-1000");
    }

    let startSound = new Audio('../sounds/startSound.mp3');
    startSound.play();

    // closes window after 10 seconds
    for (let i = 0; i<7; i++) {

        await new Promise(resolve => setTimeout(resolve, 1000));

        // check if window was closed by user
        if (newWindow.closed && localStorage.getItem('speechInputSuccess') === 'false') {
            localStorage.setItem('moveCounter', '-2');
            break;
        }

        if (localStorage.getItem('moveCounter') !== '0') break;
    }

    // close window if it isn't closed after i seconds
    if (!newWindow.closed) {
        newWindow.close();
        localStorage.setItem('moveCounter', '-1');
    }
}