/**
 * Web Audio API 기반 무저작권 사운드 매니저
 * 외부 파일 로드 없이 순수 코드로 브라우저에서 직접 음향 합성
 */

class SoundManager {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;
  }

  // 브라우저 정책 대응: 사용자 상호작용 시 AudioContext 초기화
  initContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  // 1. 카드 뒤집기 소리 (부드러운 종이 넘김 틱 사운드)
  playFlip() {
    if (this.isMuted) return;
    try {
      this.initContext();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      const now = this.audioCtx.currentTime;

      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {
      console.warn("Sound error:", e);
    }
  }

  // 2. 카드 매칭 성공 (밝고 경쾌한 3화음 차임: C5 - E5 - G5)
  playMatch() {
    if (this.isMuted) return;
    try {
      this.initContext();
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      const now = this.audioCtx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        const startTime = now + idx * 0.07;
        const endTime = startTime + 0.28;

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.25, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, endTime);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(startTime);
        osc.stop(endTime);
      });
    } catch (e) {
      console.warn("Sound error:", e);
    }
  }

  // 3. 카드 불일치 (부드러운 오답 하강음)
  playMismatch() {
    if (this.isMuted) return;
    try {
      this.initContext();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sawtooth";
      const now = this.audioCtx.currentTime;

      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {
      console.warn("Sound error:", e);
    }
  }

  // 4. 게임 승리/완료 팡파르
  playWin() {
    if (this.isMuted) return;
    try {
      this.initContext();
      const melody = [
        { f: 523.25, d: 0.12 }, // 도
        { f: 659.25, d: 0.12 }, // 미
        { f: 783.99, d: 0.12 }, // 솔
        { f: 1046.50, d: 0.45 } // 높은 도
      ];

      let start = this.audioCtx.currentTime;
      melody.forEach(item => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(item.f, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.3, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, start + item.d);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(start);
        osc.stop(start + item.d);

        start += item.d + 0.03;
      });
    } catch (e) {
      console.warn("Sound error:", e);
    }
  }

  // 5. 버튼 클릭 소리
  playClick() {
    if (this.isMuted) return;
    try {
      this.initContext();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      const now = this.audioCtx.currentTime;

      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {
      console.warn("Sound error:", e);
    }
  }
}

// 전역 싱글톤 인스턴스
const soundManager = new SoundManager();
