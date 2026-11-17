/**
 * 조선왕조 왕과 업적 카드 뒤집기 게임 핵심 로직
 */

class JoseonCardGame {
  constructor() {
    this.currentMode = "early"; // 기본 시작 모드: 1단계 조선 전기 연습
    this.cards = [];
    this.flippedCards = [];
    this.matchedPairs = 0;
    this.totalPairs = 0;
    this.moves = 0;
    this.timerSeconds = 0;
    this.timerInterval = null;
    this.isTimerRunning = false;
    this.isBoardLocked = false;
    this.hintsRemaining = 3;

    // DOM 캐싱
    this.gridEl = document.getElementById("card-grid");
    this.timeEl = document.getElementById("stat-time");
    this.movesEl = document.getElementById("stat-moves");
    this.matchedEl = document.getElementById("stat-matched");
    this.learningBannerEl = document.getElementById("learning-banner");
    this.bannerTextEl = document.getElementById("banner-text");
    this.winModalEl = document.getElementById("win-modal");
    this.summaryModalEl = document.getElementById("summary-modal");
    this.soundBtnEl = document.getElementById("sound-toggle-btn");
    this.hintBtnEl = document.getElementById("hint-btn");

    this.initEvents();
    this.initMnemonicSection();
    this.startNewGame(this.currentMode);
  }

  // 모드별 왕 목록 추출 (시대별 연습 or 랜덤 난이도 상/중/하)
  getKingsForMode(mode) {
    switch (mode) {
      // 1. 시대별 학습/연습 모드
      case "early":
        return KINGS_DATA.filter(k => k.era === "early"); // 1~9대 (9명)
      case "middle":
        return KINGS_DATA.filter(k => k.era === "middle"); // 10~18대 (9명)
      case "late":
        return KINGS_DATA.filter(k => k.era === "late"); // 19~27대 (9명)

      // 2. 랜덤 종합 테스트 모드 (난이도 상, 중, 하)
      case "diff-easy": {
        // 난이도 하: 27대 왕 중 무작위 6명 비복원 추출
        const shuffled = [...KINGS_DATA];
        this.shuffle(shuffled);
        return shuffled.slice(0, DIFFICULTY_INFO.easy.pairs);
      }
      case "diff-normal": {
        // 난이도 중: 27대 왕 중 무작위 10명 비복원 추출
        const shuffled = [...KINGS_DATA];
        this.shuffle(shuffled);
        return shuffled.slice(0, DIFFICULTY_INFO.normal.pairs);
      }
      case "diff-hard": {
        // 난이도 상: 27대 왕 중 무작위 15명 비복원 추출
        const shuffled = [...KINGS_DATA];
        this.shuffle(shuffled);
        return shuffled.slice(0, DIFFICULTY_INFO.hard.pairs);
      }

      // 3. 전체 마스터 모드 (27명 전체)
      case "all":
      default:
        return [...KINGS_DATA];
    }
  }

  // 모드 설명 배너 표시
  showModeIntroBanner(mode) {
    let html = "";
    if (ERA_INFO[mode]) {
      const era = ERA_INFO[mode];
      html = `<strong>[${era.title}]</strong> ${era.desc} (${era.pairs}쌍 맞추기)`;
    } else if (mode.startsWith("diff-")) {
      const diffKey = mode.replace("diff-", "");
      const diff = DIFFICULTY_INFO[diffKey];
      html = `<strong>[${diff.title}]</strong> ${diff.desc} (${diff.pairs}쌍 맞추기)`;
    } else if (mode === "all") {
      html = `<strong>[👑 전체 마스터 모드]</strong> 조선 1대 태조부터 27대 순종까지 27쌍 전체에 도전하세요!`;
    }

    if (html) {
      this.bannerTextEl.innerHTML = html;
      this.learningBannerEl.classList.remove("hidden");
    }
  }

  // 게임 시작 및 보드 리셋
  startNewGame(mode = this.currentMode) {
    this.currentMode = mode;
    this.stopTimer();
    this.timerSeconds = 0;
    this.isTimerRunning = false;
    this.moves = 0;
    this.matchedPairs = 0;
    this.flippedCards = [];
    this.isBoardLocked = false;
    this.hintsRemaining = 3;

    this.updateStatsUI();
    this.updateHintBtnUI();
    this.closeWinModal();

    // 모드 소개 배너 표시
    this.showModeIntroBanner(mode);

    // 모드 버튼 활성화 표시
    document.querySelectorAll(".mode-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.mode === mode);
    });

    // 선택된 모드의 왕 데이터 추출
    const targetKings = this.getKingsForMode(mode);
    this.totalPairs = targetKings.length;
    this.matchedEl.textContent = `0 / ${this.totalPairs}`;

    // 카드 쌍 개수에 따른 최적 그리드 열(columns) 계산
    this.gridEl.className = "card-grid";
    if (this.totalPairs <= 6) {
      this.gridEl.classList.add("grid-cols-4"); // 12장: 3행 4열
    } else if (this.totalPairs === 9) {
      this.gridEl.classList.add("grid-cols-6"); // 18장: 3행 6열
    } else if (this.totalPairs === 10) {
      this.gridEl.classList.add("grid-cols-5"); // 20장: 4행 5열
    } else if (this.totalPairs === 15) {
      this.gridEl.classList.add("grid-cols-6"); // 30장: 5행 6열
    } else {
      this.gridEl.classList.add("grid-cols-9"); // 54장: 6행 9열
    }

    // 카드 덱 생성: 왕 카드 1장 + 업적 카드 1장
    this.cards = [];
    targetKings.forEach(k => {
      // 1. 왕 카드
      this.cards.push({
        kingId: k.order,
        cardType: "king",
        kingName: k.name,
        orderText: `제${k.order}대`,
        type: k.type,
        icon: k.icon,
        keyword: k.keyword,
        desc: k.desc,
        detail: k.detail
      });

      // 2. 업적 카드
      this.cards.push({
        kingId: k.order,
        cardType: "achievement",
        kingName: k.name,
        orderText: `제${k.order}대`,
        type: k.type,
        icon: k.icon,
        keyword: k.keyword,
        desc: k.desc,
        detail: k.detail
      });
    });

    // Fisher-Yates 셔플
    this.shuffle(this.cards);

    // DOM 렌더링
    this.renderBoard();
  }

  // 셔플 알고리즘
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // 카드 DOM 렌더링
  renderBoard() {
    this.gridEl.innerHTML = "";

    this.cards.forEach((cardData, idx) => {
      const cardEl = document.createElement("div");
      cardEl.className = `card ${cardData.cardType === "king" ? "card-king" : "card-achievement"}`;
      cardEl.dataset.index = idx;
      cardEl.dataset.kingId = cardData.kingId;
      cardEl.dataset.cardType = cardData.cardType;

      // 왕 이름 끝 글자("조", "종", "군")를 기준으로 뱃지 텍스트와 스타일 100% 일치 보장
      const nameLastChar = cardData.kingName ? cardData.kingName.slice(-1) : cardData.type;
      const effectiveType = (nameLastChar === "조" || nameLastChar === "종" || nameLastChar === "군") 
        ? nameLastChar 
        : cardData.type;

      // 조/종/군 뱃지 클래스
      let typeClass = "type-jong";
      if (effectiveType === "조") typeClass = "type-jo";
      if (effectiveType === "군") typeClass = "type-gun";

      // 카드 앞면 내용 (왕 카드 vs 업적 카드)
      let frontContent = "";
      if (cardData.cardType === "king") {
        frontContent = `
          <div class="card-header-row">
            <span class="card-order-badge">${cardData.orderText}</span>
            <span class="card-category-badge">왕 (임금)</span>
          </div>
          <div class="card-icon">${cardData.icon}</div>
          <div class="card-main-text">
            ${cardData.kingName}
            <span class="card-type-tag ${typeClass}">${effectiveType}</span>
          </div>
          <div class="card-footer-tip">업적을 찾아보세요!</div>
        `;
      } else {
        frontContent = `
          <div class="card-header-row">
            <span class="card-order-badge">${cardData.orderText}</span>
            <span class="card-category-badge">핵심 업적</span>
          </div>
          <div class="card-icon">${cardData.icon}</div>
          <div class="card-main-text">${cardData.keyword}</div>
          <div class="card-footer-tip">어느 왕의 업적일까요?</div>
        `;
      }

      cardEl.innerHTML = `
        <div class="card-face card-back">
          <svg class="card-back-pattern" viewBox="0 0 100 100" fill="none" stroke="#f59f00" stroke-width="5">
            <polygon points="50,10 90,50 50,90 10,50" />
            <polygon points="50,25 75,50 50,75 25,50" />
            <circle cx="50" cy="50" r="10" fill="#f59f00" />
          </svg>
          <div class="card-back-title">조선왕조</div>
          <div class="card-back-sub">카드 뒤집기</div>
        </div>
        <div class="card-face card-front">
          ${frontContent}
        </div>
      `;

      cardEl.addEventListener("click", () => this.handleCardClick(cardEl, cardData));
      this.gridEl.appendChild(cardEl);
    });
  }

  // 카드 클릭 이벤트 핸들러
  handleCardClick(cardEl, cardData) {
    if (this.isBoardLocked) return;
    if (cardEl.classList.contains("flipped") || cardEl.classList.contains("matched")) return;

    // 첫 클릭 시 타이머 시작
    if (!this.isTimerRunning) {
      this.startTimer();
    }

    soundManager.playFlip();
    cardEl.classList.add("flipped");
    this.flippedCards.push({ element: cardEl, data: cardData });

    if (this.flippedCards.length === 2) {
      this.moves++;
      this.movesEl.textContent = this.moves;
      this.checkMatch();
    }
  }

  // 짝 맞추기 판정
  checkMatch() {
    const [first, second] = this.flippedCards;
    const isSameKing = first.data.kingId === second.data.kingId;
    const isDifferentType = first.data.cardType !== second.data.cardType;

    // 왕 카드와 해당 왕의 업적 카드를 1:1로 뒤집었을 때 OK!
    if (isSameKing && isDifferentType) {
      // 매칭 성공!
      soundManager.playMatch();
      first.element.classList.add("matched");
      second.element.classList.add("matched");
      this.matchedPairs++;
      this.matchedEl.textContent = `${this.matchedPairs} / ${this.totalPairs}`;

      // 실시간 학습 배너 표시
      this.showLearningBanner(first.data);

      this.flippedCards = [];

      // 전체 완료 체크
      if (this.matchedPairs === this.totalPairs) {
        this.handleGameWin();
      }
    } else {
      // 매칭 실패 (불일치)
      this.isBoardLocked = true;
      soundManager.playMismatch();

      first.element.classList.add("shake");
      second.element.classList.add("shake");

      setTimeout(() => {
        first.element.classList.remove("flipped", "shake");
        second.element.classList.remove("flipped", "shake");
        this.flippedCards = [];
        this.isBoardLocked = false;
      }, 1000);
    }
  }

  // 실시간 한 줄 학습 배너 노출
  showLearningBanner(kingData) {
    this.bannerTextEl.innerHTML = `
      <strong>[정답! ${kingData.orderText} ${kingData.kingName}]</strong> - ${kingData.keyword}<br>
      <span style="font-weight: 500; color: #343a40;">💡 ${kingData.desc}</span>
    `;
    this.learningBannerEl.classList.remove("hidden");
  }

  hideLearningBanner() {
    this.learningBannerEl.classList.add("hidden");
  }

  // 힌트 제공 (아직 맞추지 않은 1쌍을 반짝여줌)
  useHint() {
    if (this.hintsRemaining <= 0 || this.isBoardLocked) return;

    soundManager.playClick();

    // 아직 매칭되지 않은 카드들 찾기
    const unmatched = this.cards
      .map((c, idx) => ({ ...c, dom: this.gridEl.children[idx] }))
      .filter(c => !c.dom.classList.contains("matched"));

    if (unmatched.length === 0) return;

    // 무작위로 하나의 kingId 선정
    const targetKingId = unmatched[0].kingId;
    const pair = unmatched.filter(c => c.kingId === targetKingId);

    if (pair.length >= 2) {
      this.hintsRemaining--;
      this.updateHintBtnUI();

      pair.forEach(item => {
        item.dom.classList.add("hint-highlight");
      });

      setTimeout(() => {
        pair.forEach(item => {
          item.dom.classList.remove("hint-highlight");
        });
      }, 1600);
    }
  }

  updateHintBtnUI() {
    this.hintBtnEl.textContent = `💡 힌트 (${this.hintsRemaining})`;
    this.hintBtnEl.disabled = this.hintsRemaining <= 0;
  }

  // 게임 완료 및 승리 처리
  handleGameWin() {
    this.stopTimer();
    soundManager.playWin();
    this.launchConfetti();

    // 결과 모달 세팅
    document.getElementById("win-time").textContent = this.formatTime(this.timerSeconds);
    document.getElementById("win-moves").textContent = `${this.moves}회`;

    // 5학년 칭찬 배지 문구
    let praiseText = "조선시대 역사를 멋지게 익혔어요!";
    if (this.moves <= this.totalPairs + 4) {
      praiseText = "역사 천재! 완벽한 기억력이에요! 🌟";
    } else if (this.moves <= this.totalPairs * 2) {
      praiseText = "참 잘했어요! 조선의 왕들을 척척 맞췄네요! 👏";
    }
    document.getElementById("win-praise").textContent = praiseText;

    setTimeout(() => {
      this.winModalEl.classList.add("active");
    }, 600);
  }

  closeWinModal() {
    this.winModalEl.classList.remove("active");
  }

  // 타이머 관리
  startTimer() {
    this.isTimerRunning = true;
    this.timerInterval = setInterval(() => {
      this.timerSeconds++;
      this.timeEl.textContent = this.formatTime(this.timerSeconds);
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isTimerRunning = false;
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  updateStatsUI() {
    this.timeEl.textContent = "00:00";
    this.movesEl.textContent = "0";
    this.matchedEl.textContent = `0 / ${this.totalPairs}`;
  }

  // 조선 왕조 27대 전체 요약표 모달 렌더링
  openSummaryModal() {
    soundManager.playClick();
    const tbody = document.getElementById("summary-table-body");
    tbody.innerHTML = "";

    KINGS_DATA.forEach(k => {
      const tr = document.createElement("tr");
      const nameLastChar = k.name ? k.name.slice(-1) : k.type;
      const effectiveType = (nameLastChar === "조" || nameLastChar === "종" || nameLastChar === "군") 
        ? nameLastChar 
        : k.type;

      let typeClass = "type-jong";
      if (effectiveType === "조") typeClass = "type-jo";
      if (effectiveType === "군") typeClass = "type-gun";

      let eraLabel = "조선 전기";
      if (k.era === "middle") eraLabel = "조선 중기";
      if (k.era === "late") eraLabel = "조선 후기";

      tr.innerHTML = `
        <td style="text-align:center; font-weight:700;">제${k.order}대</td>
        <td style="text-align:center;">
          <strong>${k.name}</strong>
          <span class="card-type-tag ${typeClass}">${effectiveType}</span>
        </td>
        <td style="text-align:center; color:#555;">${eraLabel}</td>
        <td style="font-weight:700; color:#2b8a3e;">${k.keyword}</td>
        <td style="font-size:0.85rem;">${k.desc}</td>
      `;
      tbody.appendChild(tr);
    });

    this.summaryModalEl.classList.add("active");
  }

  closeSummaryModal() {
    soundManager.playClick();
    this.summaryModalEl.classList.remove("active");
  }

  // 암기송 섹션 데이터 렌더링
  initMnemonicSection() {
    const verseContainer = document.getElementById("mnemonic-verse-container");
    if (verseContainer) {
      verseContainer.innerHTML = "";
      MNEMONIC_VERSE.forEach(line => {
        const item = document.createElement("span");
        item.className = "mnemonic-verse-item";
        item.textContent = line;
        verseContainer.appendChild(item);
      });
    }
  }

  // 컨페티(축하 꽃가루) 파티클 애니메이션
  launchConfetti() {
    const canvas = document.getElementById("confetti-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ["#f03e3e", "#1c7ed6", "#fcc419", "#37b24d", "#f76707", "#ae3ec9"];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 200,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        velX: (Math.random() - 0.5) * 4,
        velY: Math.random() * 4 + 3,
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 8
      });
    }

    let animationId;
    let frames = 0;

    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.velX;
        p.y += p.velY;
        p.rot += p.rotSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      frames++;
      if (frames < 180) {
        animationId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        cancelAnimationFrame(animationId);
      }
    }

    render();
  }

  // 버튼 및 모달 이벤트 바인딩
  initEvents() {
    // 모드 선택 버튼
    document.querySelectorAll(".mode-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        soundManager.playClick();
        this.startNewGame(btn.dataset.mode);
      });
    });

    // 다시 하기 버튼
    document.getElementById("restart-btn").addEventListener("click", () => {
      soundManager.playClick();
      this.startNewGame();
    });

    // 힌트 버튼
    this.hintBtnEl.addEventListener("click", () => this.useHint());

    // 사운드 토글
    this.soundBtnEl.addEventListener("click", () => {
      const muted = soundManager.toggleMute();
      this.soundBtnEl.textContent = muted ? "🔇 소리 끔" : "🔊 소리 켬";
    });

    // 조선왕조 요약 도감 모달 열기/닫기
    document.getElementById("view-summary-btn").addEventListener("click", () => this.openSummaryModal());
    document.getElementById("close-summary-btn").addEventListener("click", () => this.closeSummaryModal());
    document.getElementById("summary-modal").addEventListener("click", e => {
      if (e.target.id === "summary-modal") this.closeSummaryModal();
    });

    // 승리 모달 버튼
    document.getElementById("modal-restart-btn").addEventListener("click", () => {
      soundManager.playClick();
      this.closeWinModal();
      this.startNewGame();
    });
    document.getElementById("modal-summary-btn").addEventListener("click", () => {
      this.closeWinModal();
      this.openSummaryModal();
    });

    // 창 크기 변경 시 컨페티 캔버스 리사이즈
    window.addEventListener("resize", () => {
      const canvas = document.getElementById("confetti-canvas");
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    });
  }
}

// DOM 로드 완료 시 인스턴스 생성
document.addEventListener("DOMContentLoaded", () => {
  window.cardGame = new JoseonCardGame();
});
