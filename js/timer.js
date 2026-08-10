/* ============================================
   TIMER – Rest timer between sets
   ============================================ */

const Timer = (() => {
    let timerInterval = null;
    let remainingSeconds = 0;
    let selectedDuration = 90;
    let isRunning = false;

    // ---------- Open Timer Modal ----------
    function openTimerModal() {
        document.getElementById('modal-timer').classList.add('active');
        if (!isRunning) {
            remainingSeconds = selectedDuration;
            updateDisplay();
            // Auto-start
            startTimer();
        }
    }

    function closeTimerModal() {
        document.getElementById('modal-timer').classList.remove('active');
    }

    // ---------- Start Timer ----------
    function startTimer() {
        if (isRunning) return;
        isRunning = true;

        document.getElementById('btn-timer-start').style.display = 'none';
        document.getElementById('btn-timer-stop').style.display = 'inline-flex';
        document.getElementById('timer-display').classList.add('running');
        document.getElementById('timer-display').classList.remove('done');

        timerInterval = setInterval(() => {
            remainingSeconds--;
            updateDisplay();

            if (remainingSeconds <= 0) {
                timerFinished();
            }
        }, 1000);
    }

    // ---------- Stop Timer ----------
    function stopTimer() {
        isRunning = false;
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        document.getElementById('btn-timer-start').style.display = 'inline-flex';
        document.getElementById('btn-timer-stop').style.display = 'none';
        document.getElementById('timer-display').classList.remove('running');

        remainingSeconds = selectedDuration;
        updateDisplay();
    }

    // ---------- Timer Finished ----------
    function timerFinished() {
        isRunning = false;
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        document.getElementById('btn-timer-start').style.display = 'inline-flex';
        document.getElementById('btn-timer-start').textContent = 'Restart';
        document.getElementById('btn-timer-stop').style.display = 'none';
        document.getElementById('timer-display').classList.remove('running');
        document.getElementById('timer-display').classList.add('done');
        document.getElementById('timer-display').textContent = "Time's up!";

        // Vibrate if available
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }

        // Reset for next use after a moment
        setTimeout(() => {
            remainingSeconds = selectedDuration;
            document.getElementById('btn-timer-start').textContent = 'Start';
            document.getElementById('timer-display').classList.remove('done');
            updateDisplay();
        }, 3000);
    }

    // ---------- Select Duration ----------
    function selectDuration(seconds) {
        selectedDuration = seconds;
        if (!isRunning) {
            remainingSeconds = seconds;
            updateDisplay();
        }

        // Update active state
        document.querySelectorAll('.timer-preset').forEach(btn => {
            btn.classList.toggle('active', Number(btn.dataset.seconds) === seconds);
        });
    }

    // ---------- Update Display ----------
    function updateDisplay() {
        const minutes = Math.floor(remainingSeconds / 60);
        const secs = remainingSeconds % 60;
        document.getElementById('timer-display').textContent =
            `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    return {
        openTimerModal,
        closeTimerModal,
        startTimer,
        stopTimer,
        selectDuration,
    };
})();
