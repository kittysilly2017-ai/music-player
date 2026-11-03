// ELEMENTS

const folders = document.getElementById("folders");
const playlist = document.getElementById("playlist");
const songs = document.getElementById("songs");
const heading = document.getElementById("heading");
const back = document.getElementById("back");

const folderInput = document.getElementById("folderInput");
const songInput = document.getElementById("songInput");

let currentFolder = null;
let currentAudio = null;
let currentAudioURL = null;


// DATABASE

const dbPromise = new Promise((resolve, reject) => {

    const request = indexedDB.open("MusicPlayerDB", 3);

    request.onupgradeneeded = function(event) {

        const db = event.target.result;

        if (!db.objectStoreNames.contains("music")) {
            db.createObjectStore("music", {
                keyPath: "id"
            });
        }

        if (!db.objectStoreNames.contains("playlists")) {
            db.createObjectStore("playlists", {
                keyPath: "name"
            });
        }

    };

    request.onsuccess = () => resolve(request.result);

    request.onerror = () => reject(request.error);

});


// SAVE FOLDER

async function saveFolder(name) {

    const db = await dbPromise;

    return new Promise((resolve, reject) => {

        const tx = db.transaction("playlists", "readwrite");

        tx.objectStore("playlists").put({
            name: name
        });

        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);

    });

}


// GET FOLDERS

async function getFolders() {

    const db = await dbPromise;

    return new Promise((resolve, reject) => {

        const request = db
            .transaction("playlists", "readonly")
            .objectStore("playlists")
            .getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);

    });

}


// SAVE SONG

async function saveSong(song) {

    const db = await dbPromise;

    return new Promise((resolve, reject) => {

        const tx = db.transaction("music", "readwrite");

        tx.objectStore("music").put(song);

        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);

    });

}


// GET ALL SONGS

async function getAllSongs() {

    const db = await dbPromise;

    return new Promise((resolve, reject) => {

        const request = db
            .transaction("music", "readonly")
            .objectStore("music")
            .getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);

    });

}


// IMPORT WHOLE FOLDER

document.getElementById("importFolder").onclick = () => {

    folderInput.click();

};


folderInput.onchange = async () => {

    const files = [...folderInput.files];

    if (files.length === 0) {

        alert("No folder contents were received. Your browser may not support folder importing.");

        return;

    }

    try {

        // Find the selected folder name

        const firstPath = files[0].webkitRelativePath;

        if (!firstPath || !firstPath.includes("/")) {

            alert("Your browser did not provide the folder name. Folder importing may not be supported in this preview.");

            return;

        }

        const folderName = firstPath.split("/")[0];

        // Create the playlist

        await saveFolder(folderName);

        let imported = 0;

        // Import all MP3 files inside the folder

        for (const file of files) {

            if (!file.name.toLowerCase().endsWith(".mp3")) {
                continue;
            }

            await saveSong({

                id: folderName + "/" + crypto.randomUUID(),

                folder: folderName,

                name: file.name.replace(/\.[^/.]+$/, ""),

                blob: file

            });

            imported++;

        }

        await renderFolders();

        alert(
            "Folder imported: " + folderName +
            "\nMP3 songs found: " + imported
        );

    } catch (error) {

        console.error(error);

        alert("Could not import folder. Please try again.");

    }

    folderInput.value = "";

};


// DISPLAY FOLDERS

async function renderFolders() {

    const savedFolders = await getFolders();

    folders.innerHTML = "";

    savedFolders.forEach(item => {

        const button = document.createElement("button");

        button.className = "folder";

        const icon = document.createElement("span");

        icon.className = "folder-icon";
        icon.textContent = "📁";

        const label = document.createElement("span");

        label.className = "folder-name";
        label.textContent = item.name;

        button.append(icon, label);

        button.onclick = () => openFolder(item.name);

        folders.appendChild(button);

    });

}


// OPEN FOLDER

async function openFolder(name) {

    currentFolder = name;

    folders.hidden = true;
    playlist.hidden = false;
    back.hidden = false;

    heading.textContent = "PLAYLISTS";

    document.getElementById("playlistTitle").textContent =
        "📁 " + name;

    await renderSongs();

}


// DISPLAY SONGS

async function renderSongs() {

    const allSongs = await getAllSongs();

    songs.innerHTML = "";

    const playlistSongs = allSongs.filter(song =>
        song.folder === currentFolder
    );

    if (playlistSongs.length === 0) {

        songs.textContent = "This folder is empty.";

        return;

    }

    playlistSongs.forEach(song => {

        const row = document.createElement("div");
        row.className = "song";

        const title = document.createElement("span");
        title.textContent = song.name;

        const play = document.createElement("button");
        play.className = "play";
        play.textContent = "▶";

        const pause = document.createElement("button");
        pause.className = "pause";
        pause.textContent = "Ⅱ";

        play.onclick = () => playSong(song);

        pause.onclick = () => {

            if (currentAudio) {
                currentAudio.pause();
            }

        };

        row.append(title, play, pause);

        songs.appendChild(row);

    });

}


// ADD SONGS TO OPEN FOLDER

document.getElementById("addSongs").onclick = () => {

    if (currentFolder) {
        songInput.click();
    }

};


songInput.onchange = async () => {

    const files = [...songInput.files];

    let imported = 0;

    try {

        for (const file of files) {

            if (!file.name.toLowerCase().endsWith(".mp3")) {
                continue;
            }

            await saveSong({

                id: currentFolder + "/" + crypto.randomUUID(),

                folder: currentFolder,

                name: file.name.replace(/\.[^/.]+$/, ""),

                blob: file

            });

            imported++;

        }

        await renderSongs();

        alert(imported + " songs added!");

    } catch (error) {

        console.error(error);

        alert("Could not add songs.");

    }

    songInput.value = "";

};


// PLAY SONG

function playSong(song) {

    if (currentAudio) {
        currentAudio.pause();
    }

    if (currentAudioURL) {
        URL.revokeObjectURL(currentAudioURL);
    }

    currentAudioURL = URL.createObjectURL(song.blob);

    currentAudio = new Audio(currentAudioURL);

    currentAudio.play().catch(error => {

        console.error(error);

        alert("Unable to play this song.");

    });

}


// BACK BUTTON

back.onclick = () => {

    if (currentAudio) {

        currentAudio.pause();
        currentAudio = null;

    }

    if (currentAudioURL) {

        URL.revokeObjectURL(currentAudioURL);
        currentAudioURL = null;

    }

    currentFolder = null;

    playlist.hidden = true;
    folders.hidden = false;
    back.hidden = true;

    heading.textContent = "FOLDERS";

};


// START

async function start() {

    try {

        await dbPromise;

        await renderFolders();

    } catch (error) {

        console.error(error);

        alert("Could not open music storage.");

    }

}

start();