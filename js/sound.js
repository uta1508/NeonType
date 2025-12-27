// Sound Manager (Web Audio API)
class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    this.ctx = new AudioContext();
                } else {
                    console.warn('Web Audio API is not supported');
                }
            } catch (e) {
                console.error('Failed to initialize AudioContext:', e);
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(e => {
                console.warn('Failed to resume AudioContext:', e);
            });
        }
    }

    playType() {
        if (!this.enabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.value = 800 + Math.random() * 200;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.1);
        } catch (e) {
            console.warn('Failed to play type sound:', e);
        }
    }

    playMiss() {
        if (!this.enabled || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.frequency.value = 150;
            osc.type = 'sawtooth';
            gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.3);
        } catch (e) {
            console.warn('Failed to play miss sound:', e);
        }
    }

    playBonus() {
        if (!this.enabled || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            [0, 0.1, 0.2].forEach((delay, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.frequency.value = 1000 + (i * 300);
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.1, now + delay);
                gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.2);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + delay);
                osc.stop(now + delay + 0.2);
            });
        } catch (e) {
            console.warn('Failed to play bonus sound:', e);
        }
    }
}

const soundManager = new SoundManager();
