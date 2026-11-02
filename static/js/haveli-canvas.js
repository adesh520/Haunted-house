/**
 * Haunted Haveli - 2D/3D Canvas Lighting, Architecture & Ghost Rendering Engine
 * Implements realistic candle flame physics, dynamic raycast lighting, haveli architecture,
 * and the ethereal ghost apparition of Rani Roopmati.
 */

class HaveliCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        // Candle position & physics
        this.candle = {
            x: this.width * 0.5,
            y: this.height * 0.7,
            targetX: this.width * 0.5,
            targetY: this.height * 0.7,
            vx: 0,
            vy: 0,
            radius: 340,
            flameHeight: 38,
            flameWobble: 0,
            flicker: 1.0,
            isExtinguished: false,
            extinguishTimer: 0
        };

        // Ghost State
        this.ghost = {
            x: this.width * 0.5,
            y: this.height * 0.42,
            targetY: this.height * 0.42,
            floatAngle: 0,
            opacity: 0.85,
            anger: 40,
            visualMode: 'shadow_eyes', // 'calm_veil', 'shadow_eyes', 'screaming_apparition', 'ethereal_light'
            isScreaming: false,
            scale: 1.0,
            scaleTarget: 1.0,
            eyesGlow: 0.7,
            bloodAura: 0.0
        };

        // Haveli Environment
        this.lightningTimer = 0;
        this.isLightning = false;
        this.screenShake = 0;

        // Dust and flame particles
        this.particles = [];
        this.emberParticles = [];
        this.initParticles();

        // Mouse tracking
        this.isMouseIn = true;
        this.setupEvents();

        // Animation loop
        this.lastTime = performance.now();
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    setupEvents() {
        window.addEventListener('resize', () => {
            this.resize();
        });
        this.resize();

        window.addEventListener('mousemove', (e) => {
            this.candle.targetX = e.clientX;
            this.candle.targetY = Math.max(100, Math.min(this.height - 50, e.clientY));
            this.isMouseIn = true;
        });

        window.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                this.candle.targetX = e.touches[0].clientX;
                this.candle.targetY = Math.max(100, Math.min(this.height - 50, e.touches[0].clientY));
            }
        }, { passive: true });
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ghost.x = this.width * 0.5;
        this.ghost.y = this.height * 0.42;
    }

    initParticles() {
        // Dust motes in the air
        for (let i = 0; i < 90; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: -Math.random() * 0.5 - 0.1,
                size: Math.random() * 2.2 + 0.6,
                alpha: Math.random() * 0.6 + 0.2
            });
        }
    }

    setAnger(anger, visualMode = null) {
        this.ghost.anger = anger;
        if (visualMode) {
            this.ghost.visualMode = visualMode;
        }

        // Trigger violent effects on high anger
        if (anger >= 95) {
            this.triggerJumpscare();
        } else if (anger > 70) {
            this.screenShake = Math.max(this.screenShake, 8);
        }
    }

    triggerJumpscare() {
        this.ghost.visualMode = 'screaming_apparition';
        this.ghost.scale = 2.6;
        this.screenShake = 22;
        this.candle.isExtinguished = true;
        this.candle.extinguishTimer = 180; // 3 seconds at 60fps
        window.haveliAudio.playJumpscare();
        window.haveliAudio.playGhungroo();
    }

    animate(currentTime) {
        const dt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(dt);
        this.render();

        requestAnimationFrame(this.animate);
    }

    update(dt) {
        // Screen shake decay
        if (this.screenShake > 0) {
            this.screenShake *= 0.92;
            if (this.screenShake < 0.2) this.screenShake = 0;
        }

        // Extinguish logic
        if (this.candle.isExtinguished) {
            this.candle.extinguishTimer--;
            if (this.candle.extinguishTimer <= 0) {
                this.candle.isExtinguished = false;
                this.ghost.scale = 1.0;
                if (this.ghost.visualMode === 'screaming_apparition') {
                    this.ghost.visualMode = 'shadow_eyes';
                }
            }
        }

        // Candle physics (smooth lag behind cursor)
        const dx = this.candle.targetX - this.candle.x;
        const dy = this.candle.targetY - this.candle.y;
        this.candle.vx = this.candle.vx * 0.8 + dx * 0.08;
        this.candle.vy = this.candle.vy * 0.8 + dy * 0.08;
        this.candle.x += this.candle.vx;
        this.candle.y += this.candle.vy;

        // Candle flame tilt responds to velocity
        this.candle.flameWobble = -this.candle.vx * 0.25;

        // Flicker intensity based on anger
        const angerNorm = this.ghost.anger / 100;
        const jitterFreq = 8 + angerNorm * 25;
        const jitterAmp = 0.08 + angerNorm * 0.35;
        this.candle.flicker = 1.0 + Math.sin(performance.now() * 0.015 * jitterFreq) * jitterAmp + (Math.random() - 0.5) * jitterAmp * 0.5;

        // Candle light radius
        const baseRadius = 320 + Math.sin(performance.now() * 0.003) * 15;
        this.candle.radius = this.candle.isExtinguished ? 40 : baseRadius * this.candle.flicker;

        // Ember smoke generation from candle wick
        if (!this.candle.isExtinguished && Math.random() < (0.2 + angerNorm * 0.4)) {
            this.emberParticles.push({
                x: this.candle.x + (Math.random() - 0.5) * 6,
                y: this.candle.y - 45,
                vx: (Math.random() - 0.5) * 0.8 + this.candle.flameWobble * 0.05,
                vy: -Math.random() * 2.2 - 1.0,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.03,
                size: Math.random() * 2.5 + 1.0,
                color: angerNorm > 0.7 ? '#ff3b30' : '#ff9500'
            });
        }

        // Update embers
        for (let i = this.emberParticles.length - 1; i >= 0; i--) {
            const p = this.emberParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0) {
                this.emberParticles.splice(i, 1);
            }
        }

        // Dust motes
        for (let p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.y < 0) p.y = this.height;
            if (p.x < 0) p.x = this.width;
            if (p.x > this.width) p.x = 0;
        }

        // Ghost floating oscillation
        this.ghost.floatAngle += 0.035;
        const floatOffset = Math.sin(this.ghost.floatAngle) * (12 + angerNorm * 10);
        this.ghost.y = this.height * 0.42 + floatOffset;

        // Ghost scaling transition
        this.ghost.scale += (this.ghost.scaleTarget - this.ghost.scale) * 0.1;

        // Random lightning in background jharokha
        if (Math.random() < 0.0015) {
            this.isLightning = true;
            this.lightningTimer = 6;
        }
        if (this.isLightning) {
            this.lightningTimer--;
            if (this.lightningTimer <= 0) this.isLightning = false;
        }
    }

    render() {
        this.ctx.save();

        // Apply screen shake
        if (this.screenShake > 0) {
            const sx = (Math.random() - 0.5) * this.screenShake;
            const sy = (Math.random() - 0.5) * this.screenShake;
            this.ctx.translate(sx, sy);
        }

        // 1. Draw Haveli Interior Architecture (The Dark Manor)
        this.drawHaveliArchitecture();

        // 2. Draw Ghost Apparition (Rani Roopmati)
        this.drawGhost();

        // 3. Draw Lighting & Candle Darkness Mask
        this.drawDynamicLighting();

        // 4. Draw Interactive Candle in foreground
        this.drawCandleStick();

        // 5. Draw Embers & Dust Motes
        this.drawParticles();

        // 6. Draw Blood/Rage Vignette on extreme anger
        this.drawAngerEffects();

        this.ctx.restore();
    }

    drawHaveliArchitecture() {
        const w = this.width;
        const h = this.height;

        // Deep stone background
        const bgGrad = this.ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#0a0706');
        bgGrad.addColorStop(0.6, '#0f0a08');
        bgGrad.addColorStop(1, '#050302');
        this.ctx.fillStyle = bgGrad;
        this.ctx.fillRect(0, 0, w, h);

        // Lightning flash outside Jharokhas
        if (this.isLightning) {
            this.ctx.fillStyle = 'rgba(210, 230, 255, 0.25)';
            this.ctx.fillRect(0, 0, w, h);
        }

        // Central Grand Rajasthani Mehraab (Archway)
        const archCenterX = w * 0.5;
        const archTopY = h * 0.08;
        const archWidth = Math.min(w * 0.65, 750);
        const archLeft = archCenterX - archWidth / 2;
        const archRight = archCenterX + archWidth / 2;
        const archBaseY = h * 0.78;

        this.ctx.save();
        this.ctx.fillStyle = '#060403';
        this.ctx.beginPath();
        this.ctx.moveTo(archLeft, archBaseY);
        this.ctx.lineTo(archLeft, h * 0.38);
        // Scalloped multi-foil arch curve
        this.ctx.bezierCurveTo(archLeft, archTopY, archCenterX - 120, archTopY - 20, archCenterX, archTopY + 30);
        this.ctx.bezierCurveTo(archCenterX + 120, archTopY - 20, archRight, archTopY, archRight, h * 0.38);
        this.ctx.lineTo(archRight, archBaseY);
        this.ctx.closePath();
        this.ctx.fill();

        // Arch carved stone borders
        this.ctx.strokeStyle = '#2d1f18';
        this.ctx.lineWidth = 14;
        this.ctx.stroke();
        this.ctx.strokeStyle = '#4a3427';
        this.ctx.lineWidth = 4;
        this.ctx.stroke();

        // Outer ornate pillars
        this.drawCarvedPillar(archLeft - 40, archBaseY, 70, h * 0.7);
        this.drawCarvedPillar(archRight - 30, archBaseY, 70, h * 0.7);

        // Distant Jharokha window behind central arch
        const jharokhaW = 180;
        const jharokhaH = 260;
        const jharokhaX = archCenterX - jharokhaW / 2;
        const jharokhaY = h * 0.22;

        this.ctx.fillStyle = this.isLightning ? '#1a243b' : '#030508';
        this.ctx.fillRect(jharokhaX, jharokhaY, jharokhaW, jharokhaH);

        // Carved stone lattice (Jaali pattern)
        this.ctx.strokeStyle = '#121920';
        this.ctx.lineWidth = 2;
        for (let lx = jharokhaX; lx <= jharokhaX + jharokhaW; lx += 20) {
            this.ctx.beginPath();
            this.ctx.moveTo(lx, jharokhaY);
            this.ctx.lineTo(lx, jharokhaY + jharokhaH);
            this.ctx.stroke();
        }
        for (let ly = jharokhaY; ly <= jharokhaY + jharokhaH; ly += 20) {
            this.ctx.beginPath();
            this.ctx.moveTo(jharokhaX, ly);
            this.ctx.lineTo(jharokhaX + jharokhaW, ly);
            this.ctx.stroke();
        }

        // Left Wall: Antique Framed Portrait of the Queen
        this.drawAntiquePortrait(w * 0.14, h * 0.35, 120, 160);

        // Right Wall: Antique Cracked Haveli Mirror (The Riddle 1 Object!)
        this.drawAntiqueMirror(w * 0.84, h * 0.35, 130, 190);

        // Marble tiled floor with perspective grid lines
        this.drawHaveliFloor(archBaseY);

        this.ctx.restore();
    }

    drawCarvedPillar(x, baseY, width, height) {
        this.ctx.save();
        const topY = baseY - height;

        // Pillar shaft
        const grad = this.ctx.createLinearGradient(x, 0, x + width, 0);
        grad.addColorStop(0, '#1c130e');
        grad.addColorStop(0.5, '#3d2b20');
        grad.addColorStop(1, '#110b08');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(x, topY, width, height);

        // Base & Capital brackets
        this.ctx.fillStyle = '#4a3427';
        this.ctx.fillRect(x - 12, baseY - 30, width + 24, 30);
        this.ctx.fillRect(x - 16, baseY - 12, width + 32, 12);
        this.ctx.fillRect(x - 14, topY, width + 28, 28);

        // Vertical fluting lines
        this.ctx.strokeStyle = '#110a07';
        this.ctx.lineWidth = 2;
        for (let fx = x + 12; fx < x + width - 10; fx += 14) {
            this.ctx.beginPath();
            this.ctx.moveTo(fx, topY + 28);
            this.ctx.lineTo(fx, baseY - 30);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    drawAntiquePortrait(x, y, w, h) {
        this.ctx.save();
        // Ornate golden-bronze frame
        this.ctx.fillStyle = '#3a2712';
        this.ctx.fillRect(x - 12, y - 12, w + 24, h + 24);
        this.ctx.strokeStyle = '#6e4f29';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(x - 12, y - 12, w + 24, h + 24);

        // Dark canvas inside portrait
        this.ctx.fillStyle = '#0f0b09';
        this.ctx.fillRect(x, y, w, h);

        // Queen's silhouette in portrait
        this.ctx.fillStyle = '#1e1410';
        this.ctx.beginPath();
        this.ctx.arc(x + w * 0.5, y + h * 0.4, 25, 0, Math.PI * 2);
        this.ctx.fill();

        // Eyes tracking candle!
        const eyeOffset = (this.candle.x - (x + w * 0.5)) * 0.006;
        this.ctx.fillStyle = this.ghost.anger > 60 ? '#c92a2a' : '#d4af37';
        this.ctx.beginPath();
        this.ctx.arc(x + w * 0.45 + eyeOffset, y + h * 0.38, 2.2, 0, Math.PI * 2);
        this.ctx.arc(x + w * 0.55 + eyeOffset, y + h * 0.38, 2.2, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    drawAntiqueMirror(x, y, w, h) {
        this.ctx.save();
        // Ornate Rajasthani arched frame
        this.ctx.fillStyle = '#261b14';
        this.ctx.fillRect(x - 10, y - 10, w + 20, h + 20);

        // Antique mercury mirror glass (dark silver-green tint)
        const mirrorGrad = this.ctx.createLinearGradient(x, y, x + w, y + h);
        mirrorGrad.addColorStop(0, '#101718');
        mirrorGrad.addColorStop(0.5, '#1e2b2c');
        mirrorGrad.addColorStop(1, '#0a1011');
        this.ctx.fillStyle = mirrorGrad;
        this.ctx.fillRect(x, y, w, h);

        // Jagged crack in the mirror (Riddle clue!)
        this.ctx.strokeStyle = 'rgba(230, 245, 255, 0.45)';
        this.ctx.lineWidth = 2.0;
        this.ctx.beginPath();
        this.ctx.moveTo(x + w * 0.3, y);
        this.ctx.lineTo(x + w * 0.45, y + h * 0.4);
        this.ctx.lineTo(x + w * 0.38, y + h * 0.65);
        this.ctx.lineTo(x + w * 0.7, y + h);
        this.ctx.moveTo(x + w * 0.45, y + h * 0.4);
        this.ctx.lineTo(x + w * 0.8, y + h * 0.3);
        this.ctx.stroke();

        // Ghost reflection in the mirror when candle is close!
        const distToMirror = Math.hypot(this.candle.x - (x + w * 0.5), this.candle.y - (y + h * 0.5));
        if (distToMirror < 320) {
            const reflectAlpha = (1 - distToMirror / 320) * 0.45;
            this.ctx.fillStyle = `rgba(180, 220, 240, ${reflectAlpha})`;
            this.ctx.beginPath();
            this.ctx.arc(x + w * 0.5, y + h * 0.45, 28, 0, Math.PI * 2);
            this.ctx.fill();
            // Spectral eyes in reflection
            this.ctx.fillStyle = `rgba(255, 70, 70, ${reflectAlpha * 1.5})`;
            this.ctx.fillRect(x + w * 0.42, y + h * 0.43, 4, 4);
            this.ctx.fillRect(x + w * 0.54, y + h * 0.43, 4, 4);
        }

        this.ctx.restore();
    }

    drawHaveliFloor(floorTopY) {
        const w = this.width;
        const h = this.height;

        this.ctx.save();
        const floorGrad = this.ctx.createLinearGradient(0, floorTopY, 0, h);
        floorGrad.addColorStop(0, '#0a0705');
        floorGrad.addColorStop(1, '#020101');
        this.ctx.fillStyle = floorGrad;
        this.ctx.fillRect(0, floorTopY, w, h - floorTopY);

        // Perspective tile lines converging to center arch
        this.ctx.strokeStyle = '#18100b';
        this.ctx.lineWidth = 1.5;
        const vanishX = w * 0.5;
        const vanishY = floorTopY - 80;

        for (let fx = -w * 0.4; fx <= w * 1.4; fx += 110) {
            this.ctx.beginPath();
            this.ctx.moveTo(vanishX, vanishY);
            this.ctx.lineTo(fx, h);
            this.ctx.stroke();
        }

        // Horizontal floor grid lines
        for (let y = floorTopY; y < h; y += (y - floorTopY) * 0.4 + 18) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(w, y);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    drawGhost() {
        const gx = this.ghost.x;
        const gy = this.ghost.y;
        const anger = this.ghost.anger;
        const scale = this.ghost.scale;

        this.ctx.save();
        this.ctx.translate(gx, gy);
        this.ctx.scale(scale, scale);

        // Color palette based on anger
        let auraColor, veilColor, eyeColor;
        if (anger < 30) {
            // Serene / Tragic
            auraColor = 'rgba(120, 200, 240, 0.15)';
            veilColor = 'rgba(180, 220, 245, 0.45)';
            eyeColor = '#90e0ef';
        } else if (anger < 70) {
            // Suspicious / Cryptic
            auraColor = 'rgba(210, 160, 90, 0.18)';
            veilColor = 'rgba(220, 190, 160, 0.4)';
            eyeColor = '#e0a96d';
        } else {
            // Enraged / Demonic
            auraColor = 'rgba(230, 30, 30, 0.35)';
            veilColor = 'rgba(240, 90, 90, 0.5)';
            eyeColor = '#ff1a1a';
        }

        // 1. Spectral Aura Glow
        const auraRadius = 140 * (1 + (anger / 100) * 0.5);
        const auraGrad = this.ctx.createRadialGradient(0, -20, 10, 0, -20, auraRadius);
        auraGrad.addColorStop(0, auraColor);
        auraGrad.addColorStop(0.6, auraColor.replace(/[\d\.]+\)$/, '0.08)'));
        auraGrad.addColorStop(1, 'transparent');
        this.ctx.fillStyle = auraGrad;
        this.ctx.beginPath();
        this.ctx.arc(0, -20, auraRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // 2. Trailing ghostly veil (Ghunghat / Dupatta)
        this.ctx.fillStyle = veilColor;
        this.ctx.beginPath();
        this.ctx.moveTo(-45, -70);
        // Arching over head
        this.ctx.bezierCurveTo(-50, -115, 50, -115, 45, -70);
        // Flowing sides
        this.ctx.bezierCurveTo(70, -20, 85, 40, 60 + Math.sin(this.ghost.floatAngle * 1.5) * 12, 110);
        this.ctx.bezierCurveTo(20, 130, -20, 130, -60 - Math.cos(this.ghost.floatAngle * 1.5) * 12, 110);
        this.ctx.bezierCurveTo(-85, 40, -70, -20, -45, -70);
        this.ctx.closePath();
        this.ctx.fill();

        // 3. Ethereal Face Silhouette
        this.ctx.fillStyle = 'rgba(18, 12, 15, 0.75)';
        this.ctx.beginPath();
        this.ctx.ellipse(0, -55, 24, 32, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Royal Head Ornament (Maang Tikka)
        this.ctx.strokeStyle = '#d4af37';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -85);
        this.ctx.lineTo(0, -65);
        this.ctx.stroke();
        this.ctx.fillStyle = '#ff4d4d';
        this.ctx.beginPath();
        this.ctx.arc(0, -64, 3.5, 0, Math.PI * 2);
        this.ctx.fill();

        // 4. Piercing Spectral Eyes
        this.ctx.shadowColor = eyeColor;
        this.ctx.shadowBlur = 16 + (anger / 100) * 15;
        this.ctx.fillStyle = eyeColor;

        if (this.ghost.visualMode === 'screaming_apparition') {
            // Wide hollow demonic eyes + screaming mouth
            this.ctx.beginPath();
            this.ctx.ellipse(-10, -58, 6, 8, -0.2, 0, Math.PI * 2);
            this.ctx.ellipse(10, -58, 6, 8, 0.2, 0, Math.PI * 2);
            this.ctx.fill();

            // Screaming gaping mouth
            this.ctx.fillStyle = '#0a0002';
            this.ctx.beginPath();
            this.ctx.ellipse(0, -38, 9, 16, 0, 0, Math.PI * 2);
            this.ctx.fill();
        } else {
            // Elegant piercing ghostly slits
            this.ctx.beginPath();
            this.ctx.ellipse(-9, -56, 4.5, 2.5, -0.15, 0, Math.PI * 2);
            this.ctx.ellipse(9, -56, 4.5, 2.5, 0.15, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.shadowBlur = 0;

        // 5. Lost Royal Ghungroo/Jewel glints around feet/wrists
        if (this.ghost.anger < 80) {
            const glintX = Math.sin(this.ghost.floatAngle * 2.2) * 35;
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
            this.ctx.beginPath();
            this.ctx.arc(glintX, 75, 2.5, 0, Math.PI * 2);
            this.ctx.arc(-glintX, 85, 2.0, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    drawDynamicLighting() {
        const w = this.width;
        const h = this.height;
        const cx = this.candle.x;
        const cy = this.candle.y;
        const r = this.candle.radius;

        this.ctx.save();

        // Create dark overlay mask
        // Cut out radial light where candle is
        const lightGrad = this.ctx.createRadialGradient(cx, cy, 15, cx, cy, r);

        if (this.candle.isExtinguished) {
            lightGrad.addColorStop(0, 'rgba(4, 2, 3, 0.94)');
            lightGrad.addColorStop(1, 'rgba(2, 1, 1, 0.99)');
        } else {
            // Warm golden candle illumination
            const angerNorm = this.ghost.anger / 100;
            const coreColor = angerNorm > 0.75 
                ? 'rgba(255, 120, 80, 0.0)' 
                : 'rgba(255, 210, 130, 0.0)';
            const midColor = angerNorm > 0.75 
                ? 'rgba(60, 10, 10, 0.55)' 
                : 'rgba(40, 22, 10, 0.45)';
            const outerColor = 'rgba(3, 2, 2, 0.94)';

            lightGrad.addColorStop(0, coreColor);
            lightGrad.addColorStop(0.35, 'rgba(20, 12, 6, 0.25)');
            lightGrad.addColorStop(0.7, midColor);
            lightGrad.addColorStop(1, outerColor);
        }

        this.ctx.fillStyle = lightGrad;
        this.ctx.fillRect(0, 0, w, h);

        this.ctx.restore();
    }

    drawCandleStick() {
        if (this.candle.isExtinguished) return;

        const cx = this.candle.x;
        const cy = this.candle.y;
        const wobble = this.candle.flameWobble;
        const angerNorm = this.ghost.anger / 100;

        this.ctx.save();
        this.ctx.translate(cx, cy);

        // Antique Brass Diya Holder Base
        const brassGrad = this.ctx.createLinearGradient(-35, 0, 35, 0);
        brassGrad.addColorStop(0, '#4a3311');
        brassGrad.addColorStop(0.5, '#c59b27');
        brassGrad.addColorStop(1, '#38250b');

        this.ctx.fillStyle = brassGrad;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 32, 28, 9, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Wax Candle Pillar
        const waxGrad = this.ctx.createLinearGradient(-10, 0, 10, 0);
        waxGrad.addColorStop(0, '#d1c7a8');
        waxGrad.addColorStop(0.5, '#f5efe1');
        waxGrad.addColorStop(1, '#b0a383');
        this.ctx.fillStyle = waxGrad;
        this.ctx.fillRect(-8, -2, 16, 32);

        // Dripping wax droplets
        this.ctx.fillStyle = '#f5efe1';
        this.ctx.beginPath();
        this.ctx.arc(-8, 12, 3, 0, Math.PI * 2);
        this.ctx.arc(8, 20, 3.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Wick
        this.ctx.strokeStyle = '#221914';
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -2);
        this.ctx.quadraticCurveTo(wobble * 0.2, -8, wobble * 0.4, -14);
        this.ctx.stroke();

        // Realistic Multi-Layer Flame
        const flameTipX = wobble * 0.8;
        const flameHeight = (36 + Math.sin(performance.now() * 0.03) * 6) * this.candle.flicker;
        const flameTipY = -14 - flameHeight;

        // 1. Outer Flame Halo (Warm Amber / Crimson if angry)
        this.ctx.shadowColor = angerNorm > 0.75 ? '#ff3300' : '#ffaa00';
        this.ctx.shadowBlur = 24 * this.candle.flicker;

        this.ctx.fillStyle = angerNorm > 0.75 ? 'rgba(255, 60, 20, 0.85)' : 'rgba(255, 140, 20, 0.85)';
        this.ctx.beginPath();
        this.ctx.moveTo(0, -14);
        this.ctx.bezierCurveTo(-15, -20, -18, -32, flameTipX, flameTipY);
        this.ctx.bezierCurveTo(18, -32, 15, -20, 0, -14);
        this.ctx.fill();

        // 2. Bright Inner Yellow Body
        this.ctx.fillStyle = '#fff4a3';
        this.ctx.beginPath();
        this.ctx.moveTo(0, -14);
        this.ctx.bezierCurveTo(-9, -18, -10, -28, flameTipX * 0.6, flameTipY + 8);
        this.ctx.bezierCurveTo(10, -28, 9, -18, 0, -14);
        this.ctx.fill();

        // 3. Blue Core at the base
        this.ctx.fillStyle = 'rgba(64, 150, 255, 0.75)';
        this.ctx.beginPath();
        this.ctx.ellipse(0, -13, 4.5, 5, 0, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.shadowBlur = 0;
        this.ctx.restore();
    }

    drawParticles() {
        this.ctx.save();
        // Embers rising from wick
        for (let p of this.emberParticles) {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Floating dust motes illuminated near candle
        const cx = this.candle.x;
        const cy = this.candle.y;
        for (let p of this.particles) {
            const dist = Math.hypot(p.x - cx, p.y - cy);
            if (dist < this.candle.radius) {
                const alpha = (1 - dist / this.candle.radius) * p.alpha;
                this.ctx.fillStyle = `rgba(255, 230, 180, ${alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.restore();
    }

    drawAngerEffects() {
        const anger = this.ghost.anger;
        if (anger > 65) {
            const bloodAlpha = ((anger - 65) / 35) * 0.45;
            this.ctx.save();
            const bloodGrad = this.ctx.createRadialGradient(
                this.width * 0.5, this.height * 0.5, this.width * 0.3,
                this.width * 0.5, this.height * 0.5, this.width * 0.75
            );
            bloodGrad.addColorStop(0, 'transparent');
            bloodGrad.addColorStop(1, `rgba(160, 10, 10, ${bloodAlpha})`);
            this.ctx.fillStyle = bloodGrad;
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.restore();
        }
    }
}

window.HaveliCanvas = HaveliCanvas;
