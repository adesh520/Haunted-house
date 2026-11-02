/**
 * Haunted Haveli - Main Game Orchestration & UI Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    // Game State
    const state = {
        lang: 'hi-IN',
        anger: 40,
        solvedRiddles: [],
        currentRiddleIndex: 0,
        currentAudioUrl: null,
        isInteracting: false,
        gameStarted: false,
        showTranslation: true,
        dialogueHistory: []
    };

    // DOM Elements
    const canvasEl = document.getElementById('haveliCanvas');
    const micVisualizer = document.getElementById('micVisualizer');
    const micBtn = document.getElementById('micBtn');
    const micStatus = document.getElementById('micStatus');
    const userTranscriptEl = document.getElementById('userTranscript');
    const ghostDialogueEl = document.getElementById('ghostDialogue');
    const ghostTranslationEl = document.getElementById('ghostTranslation');
    const replayAudioBtn = document.getElementById('replayAudioBtn');
    const translateToggleBtn = document.getElementById('translateToggleBtn');
    
    // Talisman / Anger Elements
    const angerFillEl = document.getElementById('angerFill');
    const angerValEl = document.getElementById('angerVal');
    const moodTitleEl = document.getElementById('moodTitle');
    const talismanGemEl = document.getElementById('talismanGem');
    
    // Journal Elements
    const journalBtn = document.getElementById('journalBtn');
    const journalModal = document.getElementById('journalModal');
    const closeJournalBtn = document.getElementById('closeJournalBtn');
    const clueCountEl = document.getElementById('clueCount');
    
    // Intro Door Modal
    const enterDoorModal = document.getElementById('enterDoorModal');
    const enterDoorBtn = document.getElementById('enterDoorBtn');
    
    // Fallback Text Input
    const textInputDrawer = document.getElementById('textInputDrawer');
    const textToggleBtn = document.getElementById('textToggleBtn');
    const textSubmitBtn = document.getElementById('textSubmitBtn');
    const textInputEl = document.getElementById('textInput');
    
    // Language Select
    const langSelect = document.getElementById('langSelect');

    // Initialize Canvas Renderer
    const haveliCanvas = new window.HaveliCanvas('haveliCanvas');
    window.canvasInstance = haveliCanvas;

    // Initialize Voice Recognition
    const haveliSpeech = new window.HaveliSpeech({
        lang: state.lang,
        visualizerCanvas: micVisualizer,
        onTranscript: (text, isFinal) => {
            userTranscriptEl.textContent = text ? `"${text}"` : '';
            userTranscriptEl.classList.add('visible');
        },
        onSpeechEnd: (finalText) => {
            if (finalText && !state.isInteracting) {
                handleUserSpeech(finalText);
            }
        },
        onError: (err) => {
            console.warn("Speech error:", err);
            micStatus.textContent = "बोलने में समस्या हुई। कृपया दोबारा प्रयास करें या टाइप करें।";
        }
    });

    // Enter Haveli (User interaction required to unlock Web Audio & play creaky door)
    enterDoorBtn.addEventListener('click', async () => {
        enterDoorModal.classList.add('fade-out');
        setTimeout(() => enterDoorModal.style.display = 'none', 800);

        // Unlock audio context & play creaky door
        window.haveliAudio.init();
        window.haveliAudio.playCreakyDoor();

        state.gameStarted = true;

        // Fetch initial haveli state & voice
        await loadInitialState();
    });

    async function loadInitialState() {
        try {
            const resp = await fetch(`/api/initial-state?lang=${state.lang}`);
            const data = await resp.json();
            
            updateAngerUI(data.anger);
            haveliCanvas.setAnger(data.anger, 'shadow_eyes');
            
            renderGhostDialogue(data.dialogue, data.translation);
            state.currentAudioUrl = data.audio_url;

            // Play opening ghost greeting audio
            if (data.audio_url) {
                setTimeout(() => {
                    window.haveliAudio.playGhostVoice(data.audio_url);
                }, 1200);
            }
        } catch (e) {
            console.error("Failed to load initial state:", e);
        }
    }

    // Process User Speech
    async function handleUserSpeech(userText) {
        if (!userText || state.isInteracting) return;
        state.isInteracting = true;

        micStatus.textContent = "हवेली की आत्मा विचार कर रही है... (The Ghost listens...)";
        ghostDialogueEl.classList.add('whispering');

        try {
            const resp = await fetch('/api/interact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: userText,
                    lang: state.lang,
                    anger: state.anger,
                    solved_riddles: state.solvedRiddles,
                    current_riddle_index: state.currentRiddleIndex
                })
            });

            const data = await resp.json();
            if (data.status === 'success') {
                state.anger = data.anger;
                state.solvedRiddles = data.solved_riddles || state.solvedRiddles;
                state.currentRiddleIndex = data.current_riddle_index;
                state.currentAudioUrl = data.audio_url;

                // Update Visuals & Lighting
                haveliCanvas.setAnger(data.anger, data.ghost_visual);
                window.haveliAudio.updateAngerAudio(data.anger);

                // If riddle was solved, chime royal ghungroos!
                if (data.is_riddle_solved) {
                    window.haveliAudio.playGhungroo();
                    showNotification("रहस्य सुलझ गया! (A secret has been revealed!)");
                }

                // If anger increased heavily, screen shakes and wind howls
                if (data.anger_delta > 15) {
                    window.haveliAudio.playGhungroo();
                }

                // Update Talisman Anger & Journal
                updateAngerUI(data.anger, data.anger_delta);
                updateJournalUI();

                // Display spoken dialogue
                renderGhostDialogue(data.dialogue, data.translation);

                // Play ghost voice
                if (data.audio_url) {
                    window.haveliAudio.playGhostVoice(
                        data.audio_url,
                        () => {
                            micStatus.textContent = "आत्मा बोल रही है... (Ghost speaking)";
                        },
                        () => {
                            micStatus.textContent = "बोलने के लिए दबाएं (Click or Hold Space)";
                        }
                    );
                } else {
                    micStatus.textContent = "बोलने के लिए दबाएं (Click or Hold Space)";
                }

                // Check Game Over / Victory
                if (data.is_game_over) {
                    setTimeout(() => showEndScreen(false), 2500);
                } else if (data.is_victory) {
                    setTimeout(() => showEndScreen(true), 2500);
                }
            }
        } catch (e) {
            console.error("Interaction failed:", e);
            micStatus.textContent = "आत्मा की आवाज़ धुंधली हो गई... कृपया पुनः प्रयास करें।";
        } finally {
            state.isInteracting = false;
            ghostDialogueEl.classList.remove('whispering');
        }
    }

    function renderGhostDialogue(dialogue, translation) {
        ghostDialogueEl.textContent = dialogue;
        ghostTranslationEl.textContent = translation;
        ghostTranslationEl.style.display = state.showTranslation ? 'block' : 'none';

        // Flash subtitle glow
        ghostDialogueEl.classList.remove('glow-pulse');
        void ghostDialogueEl.offsetWidth; // trigger reflow
        ghostDialogueEl.classList.add('glow-pulse');
    }

    function updateAngerUI(anger, delta = 0) {
        angerValEl.textContent = `${anger}%`;
        angerFillEl.style.width = `${anger}%`;

        // Update Mood Sanskrit/Hindi Titles
        let title = "शांत (Peaceful)";
        let gemColor = "#2ec4b6";
        let barColor = "#2ec4b6";

        if (anger <= 25) {
            title = "शांत आत्मा (Calm Spirit)";
            gemColor = "#2ec4b6";
            barColor = "#2ec4b6";
        } else if (anger <= 50) {
            title = "संदेही (Suspicious)";
            gemColor = "#f4a261";
            barColor = "#f4a261";
        } else if (anger <= 75) {
            title = "क्रोधित (Enraged)";
            gemColor = "#e76f51";
            barColor = "#e76f51";
        } else {
            title = "रौद्र रूप (Vengeful Demon)";
            gemColor = "#e63946";
            barColor = "#e63946";
        }

        moodTitleEl.textContent = title;
        talismanGemEl.style.backgroundColor = gemColor;
        talismanGemEl.style.boxShadow = `0 0 18px ${gemColor}`;
        angerFillEl.style.backgroundColor = barColor;

        // If delta is notable, animate talisman
        if (Math.abs(delta) > 10) {
            talismanGemEl.classList.add('pulse-violent');
            setTimeout(() => talismanGemEl.classList.remove('pulse-violent'), 1200);
        }
    }

    function updateJournalUI() {
        clueCountEl.textContent = `${state.solvedRiddles.length}/3`;

        for (let i = 1; i <= 3; i++) {
            const itemEl = document.getElementById(`clueItem${i}`);
            if (itemEl) {
                if (state.solvedRiddles.includes(i)) {
                    itemEl.classList.add('solved');
                    itemEl.querySelector('.status-tag').textContent = "✓ सुलझा हुआ (Revealed)";
                }
            }
        }
    }

    function showNotification(msg) {
        const notif = document.getElementById('haveliNotif');
        if (notif) {
            notif.textContent = msg;
            notif.classList.add('show');
            setTimeout(() => notif.classList.remove('show'), 3500);
        }
    }

    function showEndScreen(isVictory) {
        const modal = document.getElementById('gameOverModal');
        const title = document.getElementById('endTitle');
        const desc = document.getElementById('endDesc');

        if (isVictory) {
            title.textContent = "मुक्ति प्राप्त हुई (Liberated)";
            title.style.color = "#d4af37";
            desc.textContent = "आपने हवेली के तीनों रहस्यों को आदर और सूझबूझ से सुलझा लिया। रानी रूपमती की आत्मा को सदियों बाद शांति मिली, और हवेली के भारी लोहे के कपाट आपके लिए खुल गए।";
        } else {
            title.textContent = "आपकी आत्मा बंदी बन गई (Trapped Forever)";
            title.style.color = "#e63946";
            desc.textContent = "क्रोध की सीमा पार हो गई! हवेली की दीवारों ने आपकी चीखों को निगल लिया। अब आप भी इस अंधेरे में सदा के लिए भटकेंगे...";
        }
        modal.style.display = 'flex';
    }

    // Button Events
    micBtn.addEventListener('click', () => {
        haveliSpeech.toggle();
    });

    replayAudioBtn.addEventListener('click', () => {
        if (state.currentAudioUrl) {
            window.haveliAudio.playGhostVoice(state.currentAudioUrl);
        }
    });

    translateToggleBtn.addEventListener('click', () => {
        state.showTranslation = !state.showTranslation;
        ghostTranslationEl.style.display = state.showTranslation ? 'block' : 'none';
        translateToggleBtn.textContent = state.showTranslation ? "अनुवाद छिपाएं (Hide)" : "अनुवाद देखें (Translate)";
    });

    journalBtn.addEventListener('click', () => {
        journalModal.style.display = 'flex';
    });

    closeJournalBtn.addEventListener('click', () => {
        journalModal.style.display = 'none';
    });

    textToggleBtn.addEventListener('click', () => {
        const isHidden = textInputDrawer.style.display === 'none' || !textInputDrawer.style.display;
        textInputDrawer.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) textInputEl.focus();
    });

    textSubmitBtn.addEventListener('click', () => {
        const val = textInputEl.value.trim();
        if (val) {
            userTranscriptEl.textContent = `"${val}"`;
            userTranscriptEl.classList.add('visible');
            textInputEl.value = '';
            handleUserSpeech(val);
        }
    });

    textInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            textSubmitBtn.click();
        }
    });

    langSelect.addEventListener('change', (e) => {
        state.lang = e.target.value;
        haveliSpeech.setLanguage(state.lang);
        state.solvedRiddles = [];
        state.currentRiddleIndex = 0;
        updateJournalUI();
        loadInitialState();
    });

    document.getElementById('restartBtn').addEventListener('click', () => {
        document.getElementById('gameOverModal').style.display = 'none';
        state.anger = 40;
        state.solvedRiddles = [];
        state.currentRiddleIndex = 0;
        updateJournalUI();
        loadInitialState();
    });
});
