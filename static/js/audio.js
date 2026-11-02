/**
 * Haunted Haveli - Web Audio & Sound Engine
 * Handles ambient wind, creaky doors, ghungroo bells, dynamic heartbeats, and TTS playback.
 */

class HaveliAudio {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.ambientGain = null;
        this.windGain = null;
        this.isMuted = false;
        this.initialized = false;
        
        // Sound buffers & audio elements
        this.sounds = {
            creakyDoor: new Audio('/static/sounds/creaky_door.wav'),
            ghungroo: new Audio('/static/sounds/ghungroo.wav'),
            heartbeat: new Audio('/static/sounds/heartbeat.wav'),
            jumpscare: new Audio('/static/sounds/jumpscare.wav')
        };
        
        // Current voice audio element
        this.currentVoice = null;
        this.heartbeatInterval = null;
        this.heartbeatRate = 1200; // ms
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.8;
            this.masterGain.connect(this.ctx.destination);
            
            this.setupAmbientGenerators();
            this.initialized = true;
            console.log("Haveli Audio initialized.");
        } catch (e) {
            console.warn("AudioContext init error:", e);
        }
    }

    setupAmbientGenerators() {
        if (!this.ctx) return;

        // 1. Low Haveli Drone (Deep Sub-bass resonance)
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const droneFilter = this.ctx.createBiquadFilter();
        const droneGain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc1.frequency.value = 55.0; // A1
        osc2.type = 'sine';
        osc2.frequency.value = 55.5; // slight detune for sinister beating

        droneFilter.type = 'lowpass';
        droneFilter.frequency.value = 140;

        droneGain.gain.value = 0.12;

        osc1.connect(droneFilter);
        osc2.connect(droneFilter);
        droneFilter.connect(droneGain);
        droneGain.connect(this.masterGain);

        osc1.start();
        osc2.start();

        // 2. Procedural Wind Howl Generator
        const bufferSize = 2 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const windFilter = this.ctx.createBiquadFilter();
        windFilter.type = 'bandpass';
        windFilter.frequency.value = 350;
        windFilter.Q.value = 4.5;

        this.windGain = this.ctx.createGain();
        this.windGain.gain.value = 0.08;

        whiteNoise.connect(windFilter);
        windFilter.connect(this.windGain);
        this.windGain.connect(this.masterGain);

        whiteNoise.start();

        // Slowly modulate wind frequency with LFO
        const windLFO = this.ctx.createOscillator();
        const windLFOGain = this.ctx.createGain();
        windLFO.frequency.value = 0.15; // slow drift
        windLFOGain.gain.value = 220; // sweep +/- 220Hz
        windLFO.connect(windLFOGain);
        windLFOGain.connect(windFilter.frequency);
        windLFO.start();
    }

    playCreakyDoor() {
        this.ensureContext();
        try {
            this.sounds.creakyDoor.currentTime = 0;
            this.sounds.creakyDoor.volume = 0.75;
            this.sounds.creakyDoor.play().catch(e => console.log('Audio autoplay prevented:', e));
        } catch (e) {
            this.proceduralCreak();
        }
    }

    playGhungroo() {
        this.ensureContext();
        try {
            this.sounds.ghungroo.currentTime = 0;
            this.sounds.ghungroo.volume = 0.8;
            this.sounds.ghungroo.play().catch(e => {});
        } catch (e) {}
    }

    playJumpscare() {
        this.ensureContext();
        try {
            this.sounds.jumpscare.currentTime = 0;
            this.sounds.jumpscare.volume = 1.0;
            this.sounds.jumpscare.play().catch(e => {});
        } catch (e) {}
    }

    proceduralCreak() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(280, now + 1.2);
        osc.frequency.exponentialRampToValueAtTime(140, now + 2.0);

        filter.type = 'bandpass';
        filter.frequency.value = 650;
        filter.Q.value = 6;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 2.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 2.2);
    }

    updateAngerAudio(anger) {
        // Anger 0-100 modulates wind volume and heartbeat
        if (this.windGain && this.ctx) {
            const windVol = 0.06 + (anger / 100) * 0.22;
            this.windGain.gain.setTargetAtTime(windVol, this.ctx.currentTime, 0.5);
        }

        // Manage Heartbeat
        if (anger > 50) {
            // Rate speeds up as anger rises: 50% = 1200ms, 90% = 450ms
            const newRate = Math.max(400, 1400 - (anger - 50) * 20);
            this.heartbeatRate = newRate;
            if (!this.heartbeatInterval) {
                this.startHeartbeat();
            }
        } else {
            this.stopHeartbeat();
        }
    }

    startHeartbeat() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        const beat = () => {
            try {
                this.sounds.heartbeat.currentTime = 0;
                this.sounds.heartbeat.volume = Math.min(1.0, 0.4 + (this.heartbeatRate < 800 ? 0.4 : 0.1));
                this.sounds.heartbeat.play().catch(e => {});
            } catch (e) {}
            this.heartbeatInterval = setTimeout(beat, this.heartbeatRate);
        };
        beat();
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearTimeout(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    playGhostVoice(audioUrl, onStart, onEnded) {
        if (!audioUrl) {
            if (onEnded) onEnded();
            return;
        }
        this.ensureContext();

        if (this.currentVoice) {
            this.currentVoice.pause();
            this.currentVoice = null;
        }

        const audio = new Audio(audioUrl);
        this.currentVoice = audio;
        audio.volume = 1.0;

        audio.onplay = () => {
            if (onStart) onStart();
        };

        audio.onended = () => {
            if (onEnded) onEnded();
        };

        audio.onerror = (e) => {
            console.warn("Ghost audio playback error:", e);
            if (onEnded) onEnded();
        };

        audio.play().catch(e => {
            console.log("Audio play blocked until click:", e);
            if (onEnded) onEnded();
        });
    }

    ensureContext() {
        if (!this.initialized) {
            this.init();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
}

window.haveliAudio = new HaveliAudio();
