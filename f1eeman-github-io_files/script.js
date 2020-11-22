var link = document.querySelector(".login-link");
var popup = document.querySelector(".modal-login");
var overlay = document.querySelector(".modal-overlay")
var close = document.querySelector(".modal-close");
var form = popup.querySelector(".login-form");
var login = popup.querySelector(".login-user");
var password = popup.querySelector(".login-password");
var mapLink = document.querySelector(".index-column__image-box");
var mapPopup = document.querySelector(".modal-map");
var mapOverlay = document.querySelector(".modal-overlay")
var mapClose = document.querySelector(".modal-map-close");
var writeToUsLink = document.querySelector(".write-us");
var writeToUsPopup = document.querySelector(".modal-write-us");
var writeToUsOverlay = document.querySelector(".modal-overlay")
var writeToUsClose = document.querySelector(".modal-write-us-close");
var writeToUsForm = writeToUsPopup.querySelector(".write-us-form");
var writeToUsName = writeToUsPopup.querySelector(".name");
var writeToUsEmail = writeToUsPopup.querySelector(".email");
var writeToUsText = writeToUsPopup.querySelector(".text");

var isStorageSupport = true;
var storage = "";
var storageName = "";
var storageEmail = "";

try {
    storage = localStorage.getItem("login")
    storageName = localStorage.getItem("name");
    storageEmail = localStorage.getItem("email");
} catch (err) {
    isStorageSupport = false;
}

link.addEventListener("click", function (evt) {
    evt.preventDefault();
    popup.classList.add("modal-show");
    overlay.classList.add("overlay-show");

    if (storage) {
        login.value = storage;
        password.focus();
    } else {
        login.focus();
    }
});

close.addEventListener("click", function(evt) {
    evt.preventDefault();
    popup.classList.remove("modal-show");
    popup.classList.remove("modal-error");
    overlay.classList.remove("overlay-show");
});

form.addEventListener("submit", function(evt) {
    if (!login.value || !password.value) {
        evt.preventDefault();
        popup.classList.remove("modal-error");
        popup.offsetWidth = popup.offsetWidth;
        popup.classList.add("modal-error");
    } else {
        if (isStorageSupport) {
            localStorage.setItem("login", login.value);
        }
    }
});

window.addEventListener("keydown", function(evt) {
    if (evt.keyCode === 27 && popup.classList.contains("modal-show")) {
        evt.preventDefault();
        popup.classList.remove("modal-show");
        popup.classList.remove("modal-error");
        overlay.classList.remove("overlay-show");
    }
});

mapLink.addEventListener("click", function (evt) {
    evt.preventDefault();
    mapPopup.classList.add("modal-show-map");
    mapOverlay.classList.add("overlay-show");
});

mapClose.addEventListener("click", function(evt) {
    evt.preventDefault();
    mapPopup.classList.remove("modal-show-map");
    mapOverlay.classList.remove("overlay-show");
});

window.addEventListener("keydown", function(evt) {
    if (evt.keyCode === 27 && mapPopup.classList.contains("modal-show-map")) {
        evt.preventDefault();
        mapPopup.classList.remove("modal-show-map");
        mapPopup.classList.remove("modal-error");
        mapOverlay.classList.remove("overlay-show");
    }
});

writeToUsLink.addEventListener("click", function (evt) {
    evt.preventDefault();
    writeToUsPopup.classList.add("modal-show");
    writeToUsOverlay.classList.add("overlay-show");

    if (storageName && storageEmail) {
        writeToUsName.value = storageName;
        writeToUsEmail.value = storageEmail;
        writeToUsText.focus();
    } else {
        writeToUsName.focus();
    }
});

writeToUsClose.addEventListener("click", function(evt) {
    evt.preventDefault();
    writeToUsPopup.classList.remove("modal-show");
    writeToUsPopup.classList.remove("modal-error");
    writeToUsOverlay.classList.remove("overlay-show");
});

writeToUsForm.addEventListener("submit", function(evt) {
    if (!writeToUsName.value || !writeToUsEmail.value || !writeToUsText.value) {
        evt.preventDefault();
        writeToUsPopup.classList.remove("modal-error");
        writeToUsPopup.offsetWidth = writeToUsPopup.offsetWidth;
        writeToUsPopup.classList.add("modal-error");
    } else {
        if (isStorageSupport) {
            localStorage.setItem("name", writeToUsName.value);
            localStorage.setItem("email", writeToUsEmail.value);
        }
    }
});

window.addEventListener("keydown", function(evt) {
    if (evt.keyCode === 27 && writeToUsPopup.classList.contains("modal-show")) {
        evt.preventDefault();
        writeToUsPopup.classList.remove("modal-show");
        writeToUsPopup.classList.remove("modal-error");
        writeToUsOverlay.classList.remove("overlay-show");
    }
});