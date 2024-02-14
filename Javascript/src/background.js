// Background file that doesn't interact with Page content
// Handles Chrome API


chrome.action.onClicked.addListener(() => {
    chrome.windows.create({url: '../../HTML/loginPage.html', type: "popup", height: 625, width: 400, top: 0, left: 0});
});