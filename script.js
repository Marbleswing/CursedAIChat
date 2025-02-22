let key = localStorage.getItem("key");
let prompt = localStorage.getItem("prompt");

function save() {
  localStorage.setItem("key", key);
  localStorage.setItem("prompt", prompt);
}

function menu_switch(menu) {
  if ($("#" + menu).length == 0) {
    menu = Constants.menu-main;
  }

  let shown = $(".menu").filter(":visible")

  if (shown.length && shown[0].id == menu) {
    return;
  }
  if (shown.length) {
    shown.hide("slow", function() {
      $("#" + menu).show("slow");
    });
  } else {
    $("#" + menu).show("slow");
  }
}

// Elemente abrufen
const $typingForm = $(".typing-form");
const $chatContainer = $(".chat-list");
const $typingInput = $(".typing-input");
const $deleteChatButton = $("#delete-chat-button");

// Chatverlauf initialisieren (aus localStorage laden)
const chatHistory = localStorage.getItem("saved-chats") || "";
$chatContainer.html(chatHistory);

// Funktion, um Nachrichten-Elemente zu erstellen
const createMessageElement = (html, ...classes) => {
  return $("<div>").addClass("message").addClass(classes.join(" ")).html(html);
};

// Scrollt den Chat nach unten
const scrollToBottom = () => {
  $chatContainer.scrollTop($chatContainer.prop("scrollHeight"));
};

// Zeigt einen Tipp-Effekt beim Schreiben der Antwort
const showTypingEffect = (text, $textElement, $messageElement) => {
  $textElement.text("");
  const words = text.split(" ");
  let index = 0;
  const interval = setInterval(() => {
    if (index < words.length) {
      $textElement.text($textElement.text() + (index === 0 ? "" : " ") + words[index++]);
      scrollToBottom();
    } else {
      clearInterval(interval);
      $messageElement.removeClass("loading");
      localStorage.setItem("saved-chats", $chatContainer.html());
    }
  }, 75);
};

// Ruft die API auf und verarbeitet die Antwort
const generateAPIResponse = ($messageElement) => {
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
  const $textElement = $messageElement.find(".text");

  // System-Einführung als reiner Text, eingefügt in eine "user"-Nachricht
  const systemIntroText = prompt;

  // Sammelt den bisherigen Chatverlauf und konvertiert ihn in ein Array
  const conversationHistory = $chatContainer.children().map(function() {
    const $msg = $(this);
    const role = $msg.hasClass("outgoing") ? "user" : "model";
    const content = $msg.find(".text").text();
    return { role, parts: [{ text: content }] };
  }).get();

  // Fügt die systemseitige Einführung als erste Nachricht mit Rolle "user" ein
  const payload = {
    contents: [
      { role: "user", parts: [{ text: systemIntroText }] },
      ...conversationHistory
    ]
  };

  $.ajax({
    url: API_URL,
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify(payload),
    success: function(data) {
      let apiText = data.candidates[0].content.parts[0].text.replace(/\*\*(.*?)\*\*/g, '$1');
      showTypingEffect(apiText, $textElement, $messageElement);
    },
    error: function(xhr) {
      const errorMsg = xhr.responseJSON && xhr.responseJSON.error
        ? xhr.responseJSON.error.message
        : "Ein Fehler ist aufgetreten.";
      $textElement.text(errorMsg);
      $messageElement.removeClass("loading").addClass("error");
    }
  });
};

// Sendet die Benutzernachricht
const handleOutgoingChat = () => {
  const userMessage = $typingInput.val().trim();
  if (!userMessage) return;

  // Benutzer-Nachricht anzeigen
  const userMsgHTML = `<div class="message-content">
    <p class="text">${userMessage}</p>
  </div>`;
  const $outgoingMsg = createMessageElement(userMsgHTML, "outgoing");
  $chatContainer.append($outgoingMsg);
  scrollToBottom();
  $typingInput.val("");

  // Bot-Nachricht – zunächst "Bitte warten..." und Ladeindikator
  const botMsgHTML = `<div class="message-content">
    <p class="text">Bitte warten...</p>
    <div class="loading-indicator">
      <div class="loading-bar"></div>
      <div class="loading-bar"></div>
      <div class="loading-bar"></div>
    </div>
  </div>`;
  const $incomingMsg = createMessageElement(botMsgHTML, "incoming", "loading");
  $chatContainer.append($incomingMsg);
  scrollToBottom();

  // API-Aufruf starten
  generateAPIResponse($incomingMsg);
};

function validateAPIKey(apiKey) {
  const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  // Sende eine minimale Testanfrage an die API
  return fetch(testUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // Eine einfache Testnachricht, die minimalen Input benötigt
      contents: [
        {
          role: "user",
          parts: [{ text: "Test" }]
        }
      ]
    })
  })
  .then(response => {
    if (response.ok) {
      // Der API-Key ist gültig, da die Anfrage erfolgreich war
      return true;
    } else {
      // Der API-Key könnte ungültig sein oder ein anderer Fehler ist aufgetreten
      return response.json().then(data => {
        console.error("Fehler:", data.error ? data.error.message : "Unbekannter Fehler");
        return false;
      });
    }
  })
  .catch(error => {
    console.error("Netzwerkfehler:", error);
    return false;
  });
}

// Löscht den gesamten Chatverlauf
$deleteChatButton.on("click", function() {
  if (confirm("Möchtest du wirklich den gesamten Chatverlauf löschen?")) {
    localStorage.removeItem("saved-chats");
    $chatContainer.html("");
  }
});

// Event Listener für Formularabsendung
$typingForm.on("submit", function(e) {
  e.preventDefault();
  handleOutgoingChat();
});

$(".next").on("click", async function() {
  if ($(".input_key").val()) {
    validateAPIKey($(".input_key").val()).then(valid => {
      if(!valid){
        alert("Falsches Passwort");
        return;
      } else{
        key = $(".input_key").val();
        save();
        menu_switch("menu_main");
      }
    });
  } else {
    alert("Passwort eingeben");
    return;
  }
});

if(!key){
  alert('Die Datei "eko_V12-4.js" wurde heruntergeladen.')
  menu_switch("menu_key");
  setTimeout(() => {
    alert('Warnung: Die runtergeladene Datei könnte schädlich sein.')
    setTimeout(() => {
      alert('Die Datei "eko_V12-4.js" wurde erfolgreich ausgeführt')
    }, 10000);
  }, 2000);
} else if(chatHistory){
  menu_switch("menu_chat");
} else{
  menu_switch("menu_main");
}

$(".option").on("click", async function() {
  menu_switch("menu_chat");
});

$("#back").on("click", async function() {
  menu_switch("menu_main");
  localStorage.removeItem("saved-chats");
  localStorage.removeItem("prompt");
  $chatContainer.html("");
});

$("#katze").on("click", async function() {
  prompt = "Du Bist eine nette Katze die auf deutsch mit einem menschen schreibt."
  save();
});
$("#zwilling").on("click", async function() {
  prompt = "Du bist der geheime Zwillingsbruder von Leonard sigma. Du bist 13 Jahre alt wie dein Bruder. Du schreibst mit einer unbekannten Person aber wenn du erfährst das es dein Bruder ist wünsche ihm alles gute nachträglich."
  save();
});
$("#baum").on("click", async function() {
  prompt = 'Du bist ein alter weiser Baum. Du antwortest rätselhaft und wenn jemand fragt wieso du das machst antwortest du mit: "weil Baum"'
  save();
});
$("#piet").on("click", async function() {
  prompt = "Du bist ein 13 jähriger Junge namens Piet. Du benutzt die Jugendsprache und bezeichnest dich selbst als Sigma oder rizzler mit Unendlich Aura"
  save();
});
$("#streber").on("click", async function() {
  prompt = "Du bist ein 13 jähriger Junge namens Merten. Du bist ein richtiger Streber und liebst die Schule vor allem Mathe. Deine Hobbies sind javascript oder phyton programmiern, über Mathe nachdenken oder für die Schule lernen."
  save();
});
