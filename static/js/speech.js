/**
 * Haunted Haveli - Voice & Speech Engine
 * Web Speech Recognition, Microphone Visualizer & Push-to-Talk controls.
 */

class HaveliSpeech {
    constructor(options = {}) {
        this.lang = options.lang || 'hi-IN';
        this.onTranscript = options.onTranscript || (() => {});
        this.onSpeechEnd = options.onSpeechEnd || (() => {});
        this.onError = options.onError || (() => {});
        
        this.recognition = null;
        this.isListening = false;
        this.isSpacePressed = false;
        
        // Mic audio visualizer
        this.audioStream = null;
        this.analyser = null;
        this.dataArray = null;
        this.visualizerCanvas = options.visualizerCanvas || null;
        
        this.initRecognition();
        this.setupKeyboardEvents();
    }

    initRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Web Speech API not supported in this browser.");
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = this.lang;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateUIState(true);
            this.startMicVisualizer();
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            const current = finalTranscript || interimTranscript;
            this.onTranscript(current, Boolean(finalTranscript));

            if (finalTranscript) {
                this.onSpeechEnd(finalTranscript.trim());
            }
        };

        this.recognition.onerror = (event) => {
            console.warn("Speech recognition error:", event.error);
            this.onError(event.error);
            this.stop();
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateUIState(false);
            this.stopMicVisualizer();
        };
    }

    setLanguage(langCode) {
        this.lang = langCode;
        if (this.recognition) {
            this.recognition.lang = langCode;
        }
    }

    start() {
        if (!this.recognition) {
            alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or type your answer.");
            return;
        }
        if (this.isListening) return;

        try {
            window.haveliAudio.ensureContext();
            this.recognition.start();
        } catch (e) {
            console.warn("Failed to start speech recognition:", e);
        }
    }

    stop() {
        if (!this.recognition || !this.isListening) return;
        try {
            this.recognition.stop();
        } catch (e) {}
        this.isListening = false;
        this.updateUIState(false);
        this.stopMicVisualizer();
    }

    toggle() {
        if (this.isListening) {
            this.stop();
        } else {
            this.start();
        }
    }

    setupKeyboardEvents() {
        // Spacebar push-to-talk (when not focused in an input field)
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.isSpacePressed && document.activeElement.tagName !== 'INPUT') {
                e.preventDefault();
                this.isSpacePressed = true;
                this.start();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space' && this.isSpacePressed) {
                e.preventDefault();
                this.isSpacePressed = false;
                this.stop();
            }
        });
    }

    updateUIState(listening) {
        const micBtn = document.getElementById('micBtn');
        const micStatus = document.getElementById('micStatus');
        if (micBtn) {
            if (listening) {
                micBtn.classList.add('listening');
                if (micStatus) micStatus.textContent = "हवेली सुन रही है... (Speak now)";
            } else {
                micBtn.classList.remove('listening');
                if (micStatus) micStatus.textContent = "बोलने के लिए दबाएं (Click or Hold Space)";
            }
        }
    }

    async startMicVisualizer() {
        try {
            if (!this.visualizerCanvas) return;
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

            this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            const ctx = window.haveliAudio.ctx || new (window.AudioContext || window.webkitAudioContext)();
            const source = ctx.createMediaStreamSource(this.audioStream);
            this.analyser = ctx.createAnalyser();
            this.analyser.fftSize = 64;
            source.connect(this.analyser);

            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.renderMicVisualizer();
        } catch (e) {
            console.log("Mic visualizer inactive:", e);
        }
    }

    renderMicVisualizer() {
        if (!this.isListening || !this.analyser || !this.visualizerCanvas) return;

        const canvas = this.visualizerCanvas;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        this.analyser.getByteFrequencyData(this.dataArray);

        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        const avg = sum / this.dataArray.length;
        const norm = Math.min(1.0, avg / 128);

        ctx.clearRect(0, 0, w, h);

        // Pulsing mystic aura ring
        const centerX = w / 2;
        const centerY = h / 2;
        const radius = 28 + norm * 26;

        ctx.save();
        ctx.strokeStyle = `rgba(255, 170, 50, ${0.4 + norm * 0.6})`;
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ff9900';
        ctx.shadowBlur = 15 * norm;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 8 * norm, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 80, 40, ${0.2 + norm * 0.5})`;
        ctx.stroke();
        ctx.restore();

        requestAnimationFrame(() => this.renderMicVisualizer());
    }

    stopMicVisualizer() {
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }
        if (this.visualizerCanvas) {
            const ctx = this.visualizerCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.visualizerCanvas.width, this.visualizerCanvas.height);
        }
    }
}

window.HaveliSpeech = HaveliSpeech;
